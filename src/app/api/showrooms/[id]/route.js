import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessShowroom, getShowroomScope, hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

async function findShowroom(user, id) {
  const showroom = await prisma.showroom.findFirst({
    where: { id, organizationId: user.organizationId, ...getShowroomScope(user) },
    include: {
      dealer: { select: { id: true, name: true, registrationNumber: true } },
      warehouse: { include: { inventories: { include: { product: true }, orderBy: { updatedAt: 'desc' } } } },
    },
  });
  return canAccessShowroom(user, showroom) ? showroom : null;
}

export async function GET(_request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(user.permissions, 'showrooms.read') && !hasPermission(user.permissions, 'dealers.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const showroom = await findShowroom(user, id);
  if (!showroom) return NextResponse.json({ error: 'Showroom not found.' }, { status: 404 });

  const [orders, retailSales, retailPayments, payments, returns, employees, expenses, users] = await Promise.all([
    prisma.order.findMany({
      where: { organizationId: user.organizationId, dealerId: showroom.dealerId, showroomId: id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.showroomSale.findMany({
      where: { organizationId: user.organizationId, dealerId: showroom.dealerId, showroomId: id },
      include: { items: { include: { product: true } }, payments: true },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.showroomPayment.findMany({
      where: { organizationId: user.organizationId, dealerId: showroom.dealerId, showroomId: id },
      include: { sale: { select: { invoiceNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.payment.findMany({
      where: { dealerId: showroom.dealerId, showroomId: id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.returnRequest.findMany({
      where: { dealerId: showroom.dealerId, showroomId: id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.employee.findMany({
      where: { organizationId: user.organizationId, showroomId: id },
      include: { department: true },
      orderBy: { firstName: 'asc' },
      take: 100,
    }),
    prisma.expense.findMany({
      where: { organizationId: user.organizationId, showroomId: id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.user.findMany({
      where: { organizationId: user.organizationId, dealerId: showroom.dealerId, showroomId: id },
      include: { userRoles: { include: { role: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  const retailRevenue = retailSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const retailCollected = retailSales.reduce((sum, sale) => sum + sale.payments.reduce((total, payment) => total + Number(payment.amount), 0), 0);
  const stockUnits = showroom.warehouse?.inventories.reduce((sum, row) => sum + row.quantity, 0) || 0;

  return NextResponse.json({
    success: true,
    data: {
      id: showroom.id,
      dealer: showroom.dealer,
      name: showroom.name,
      code: showroom.code,
      address: showroom.address,
      phone: showroom.phone,
      email: showroom.email,
      status: showroom.status,
      warehouse: showroom.warehouse ? {
        id: showroom.warehouse.id,
        name: showroom.warehouse.name,
        code: showroom.warehouse.code,
        inventory: showroom.warehouse.inventories.map((row) => ({
          productId: row.productId,
          name: row.product.name,
          sku: row.product.sku,
          retailPrice: Number(row.product.retailPrice),
          quantity: row.quantity,
          reservedStock: row.reservedStock,
          reorderLevel: row.reorderLevel,
        })),
      } : null,
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt.toISOString(),
        itemCount: order.items.length,
      })),
      retailSales: retailSales.map((sale) => ({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customerName || 'Walk-in customer',
        customerPhone: sale.customerPhone || '',
        totalAmount: Number(sale.totalAmount),
        paidAmount: sale.payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
        createdAt: sale.createdAt.toISOString(),
        items: sale.items.map((item) => ({
          product: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalAmount: Number(item.totalAmount),
        })),
        retailPayments: retailPayments.map((payment) => ({
          id: payment.id,
          invoiceNumber: payment.sale.invoiceNumber,
          amount: Number(payment.amount),
          paymentMethod: payment.paymentMethod,
          referenceNo: payment.referenceNo || '',
          createdAt: payment.createdAt.toISOString(),
        })),
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        amount: Number(payment.amount),
        status: payment.status,
        paymentMethod: payment.paymentMethod || 'Not provided',
        createdAt: payment.createdAt.toISOString(),
      })),
      returns: returns.map((row) => ({
        id: row.id,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        items: row.items.map((item) => ({
          product: item.product.name,
          quantity: item.quantity,
          defectReason: item.defectReason || '',
        })),
      })),
      employees: employees.map((employee) => ({
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        designation: employee.designation || employee.department?.name || 'Staff',
        status: employee.status,
      })),
      staffUsers: users.map((account) => ({
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.userRoles[0]?.role?.name || 'Showroom Staff',
        isActive: account.isActive,
      })),
      expenses: expenses.map((expense) => ({
        id: expense.id,
        title: expense.title,
        category: expense.category,
        amount: Number(expense.amount),
        status: expense.status,
        createdAt: expense.createdAt.toISOString(),
      })),
      summary: {
        orderCount: orders.length,
        retailSalesCount: retailSales.length,
        retailRevenue,
        retailCollected,
        stockUnits,
        returnCount: returns.length,
        employeeCount: employees.length + users.length,
        expenseTotal: expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
      },
    },
    capabilities: {
      canManage: hasPermission(user.permissions, 'showrooms.manage'),
      canCreateSales: hasPermission(user.permissions, 'showroom.sales.create'),
      canManageExpenses: hasPermission(user.permissions, 'showroom.expenses.manage'),
      canManageStaff: hasPermission(user.permissions, 'showrooms.staff.manage') || hasPermission(user.permissions, 'users.manage'),
      canCreateOrders: hasPermission(user.permissions, 'orders.create'),
      canCreateReturns: hasPermission(user.permissions, 'returns.create'),
    },
  });
}

export async function PATCH(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(user.permissions, 'showrooms.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const showroom = await findShowroom(user, id);
  if (!showroom) return NextResponse.json({ error: 'Showroom not found.' }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const changes = {};
  for (const field of ['name', 'address', 'phone', 'email']) {
    if (Object.hasOwn(body || {}, field)) {
      const value = String(body[field] || '').trim();
      if (field === 'name' && (value.length < 2 || value.length > 191)) {
        return NextResponse.json({ error: 'Showroom name must be between 2 and 191 characters.' }, { status: 400 });
      }
      if (field === 'address' && value.length > 500) return NextResponse.json({ error: 'Address is too long.' }, { status: 400 });
      if (field === 'phone' && value.length > 50) return NextResponse.json({ error: 'Phone is too long.' }, { status: 400 });
      if (field === 'email' && value && (value.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
        return NextResponse.json({ error: 'Email is invalid.' }, { status: 400 });
      }
      changes[field] = value || null;
    }
  }

  if (Object.hasOwn(body || {}, 'status')) {
    const status = String(body.status).toLowerCase();
    if (!['active', 'inactive'].includes(status)) return NextResponse.json({ error: 'Status must be active or inactive.' }, { status: 400 });
    changes.status = status;
  }
  if (!Object.keys(changes).length) return NextResponse.json({ error: 'No showroom changes were provided.' }, { status: 400 });

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.showroom.update({
      where: { id },
      data: changes,
      select: { id: true, name: true, code: true, address: true, phone: true, email: true, status: true },
    });
    if (showroom.warehouse && (changes.name || Object.hasOwn(changes, 'address'))) {
      await tx.warehouse.update({
        where: { id: showroom.warehouse.id },
        data: {
          ...(changes.name ? { name: `${changes.name} stock` } : {}),
          ...(Object.hasOwn(changes, 'address') ? { location: changes.address } : {}),
        },
      });
    }
    return result;
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'showroom.updated',
    entityType: 'showroom',
    entityId: id,
    details: changes,
  });

  return NextResponse.json({ success: true, data: updated });
}
