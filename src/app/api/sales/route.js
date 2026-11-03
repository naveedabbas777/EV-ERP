import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { getDealerActivityScope, getDealerScope, getShowroomScope } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'orders.create') && !hasPermission(user.permissions, 'reports.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [rows, summary, dealers, products, showrooms] = await Promise.all([
    prisma.sale.findMany({
      where: { organizationId: user.organizationId, ...getDealerActivityScope(user) },
      include: { dealer: true, showroom: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.sale.aggregate({
      where: { organizationId: user.organizationId, ...getDealerActivityScope(user) },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.dealer.findMany({
      where: { organizationId: user.organizationId, status: 'active', ...getDealerScope(user) },
      select: { id: true, name: true, registrationNumber: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true, sku: true, dealerPrice: true },
      orderBy: { name: 'asc' },
    }),
    prisma.showroom.findMany({
      where: { organizationId: user.organizationId, status: 'active', ...getShowroomScope(user) },
      select: { id: true, dealerId: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const approvedCount = rows.filter((sale) => String(sale.status).toLowerCase() === 'approved').length;
  const pendingCount = rows.filter((sale) => String(sale.status).toLowerCase() === 'pending').length;

  return NextResponse.json({
    data: rows.map((sale) => ({
      id: sale.invoiceNumber,
      dealer: sale.dealer?.name || 'Unassigned',
      showroom: sale.showroom?.name || 'Unspecified',
      product: sale.items[0]?.product?.name || 'EV Scooter',
      quantity: sale.items.reduce((sum, item) => sum + item.quantity, 0),
      amount: Number(sale.totalAmount),
      status: sale.status,
    })),
    total: rows.length,
    options: {
      dealers,
      products: products.map((product) => ({
        ...product,
        dealerPrice: Number(product.dealerPrice),
      })),
      showrooms,
    },
    capabilities: { canCreateCompanySale: !user.dealerId && hasPermission(user.permissions, 'orders.create') },
    scope: { dealerId: user.dealerId || null, showroomId: user.showroomId || null },
    summary: {
      totalSales: summary._count.id || 0,
      approvedSales: approvedCount,
      pendingSales: pendingCount,
      totalRevenue: Number(summary._sum.totalAmount || 0),
    },
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'orders.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (user.dealerId) {
    return NextResponse.json({ error: 'Dealer accounts must record customer sales from their showroom.' }, { status: 403 });
  }

  const body = await request.json();
  const dealerId = String(body?.dealerId || '').trim();
  const showroomId = String(body?.showroomId || '').trim() || null;
  const productId = String(body?.productId || '').trim();
  const quantity = Number(body?.quantity || 0);
  const unitPrice = Number(body?.unitPrice || 0);

  if (!dealerId || !productId || !quantity || !unitPrice) {
    return NextResponse.json({ error: 'Dealer, product, quantity and unit price are required.' }, { status: 400 });
  }

  if (quantity <= 0 || unitPrice <= 0) {
    return NextResponse.json({ error: 'Quantity and unit price must be greater than zero.' }, { status: 400 });
  }

  const [dealer, product, warehouse] = await Promise.all([
    prisma.dealer.findFirst({
      where: { id: dealerId, organizationId: user.organizationId },
    }),
    prisma.product.findFirst({
      where: { id: productId, organizationId: user.organizationId },
    }),
    prisma.warehouse.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  if (!dealer) {
    return NextResponse.json({ error: 'Dealer not found in this organization.' }, { status: 404 });
  }
  if (showroomId) {
    const showroom = await prisma.showroom.findFirst({
      where: { id: showroomId, organizationId: user.organizationId, dealerId },
      select: { id: true, status: true },
    });
    if (!showroom) {
      return NextResponse.json({ error: 'Showroom not found for this dealer.' }, { status: 404 });
    }
    if (showroom.status !== 'active') {
      return NextResponse.json({ error: 'Sales cannot be recorded for an inactive showroom.' }, { status: 409 });
    }
  }

  if (!product) {
    return NextResponse.json({ error: 'Product not found in this organization.' }, { status: 404 });
  }

  if (!warehouse) {
    return NextResponse.json({ error: 'No warehouse is configured for this organization.' }, { status: 400 });
  }

  const inventory = await prisma.inventory.findFirst({
    where: { productId, warehouseId: warehouse.id },
  });

  if (!inventory) {
    return NextResponse.json({ error: 'This product is not stocked in the available warehouse.' }, { status: 400 });
  }

  const availableStock = Number(inventory.quantity || 0) - Number(inventory.reservedStock || 0);
  if (availableStock < quantity) {
    return NextResponse.json({ error: `Not enough stock available. ${availableStock} units remain in warehouse ${warehouse.name}.` }, { status: 400 });
  }

  const totalValue = quantity * unitPrice;
  const creditAvailable = Number(dealer.creditLimit || 0) - Number(dealer.outstandingBalance || 0);

  if (creditAvailable < totalValue) {
    return NextResponse.json({ error: 'Dealer credit limit would be exceeded. Please request approval or reduce the order value.' }, { status: 400 });
  }

  const sale = await prisma.$transaction(async (tx) => {
    const createdSale = await tx.sale.create({
      data: {
        organizationId: user.organizationId,
        dealerId,
        showroomId,
        invoiceNumber: `INV-${Date.now()}`,
        totalAmount: totalValue,
        status: 'approved',
        items: {
          create: {
            productId,
            quantity,
            unitPrice,
            discount: 0,
            totalAmount: totalValue,
          },
        },
      },
      include: { dealer: true, items: { include: { product: true } } },
    });

    await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: { decrement: quantity },
      },
    });

    await tx.stockMovement.create({
      data: {
        warehouseId: warehouse.id,
        productId,
        type: 'OUT',
        quantity,
        reason: 'Dealer sale',
        referenceNo: createdSale.invoiceNumber,
      },
    });

    return createdSale;
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'sale.created',
    entityType: 'sale',
    entityId: sale.id,
    details: {
      invoiceNumber: sale.invoiceNumber,
      dealerId: dealer.id,
      showroomId,
      amount: Number(sale.totalAmount),
      quantity,
      warehouseId: warehouse.id,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: sale.invoiceNumber,
      dealer: sale.dealer.name,
      product: sale.items[0]?.product?.name || product.name,
      quantity: sale.items[0]?.quantity || 0,
      amount: Number(sale.totalAmount),
      status: sale.status,
    },
  });
}
