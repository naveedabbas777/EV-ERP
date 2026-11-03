import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { canAccessDealer, canAccessShowroom, getDealerActivityScope, getDealerScope, getShowroomScope, hasPermission } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'orders.create') && !hasPermission(user.permissions, 'orders.approve') && !hasPermission(user.permissions, 'reports.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [orders, approvals, dealers, products, showrooms] = await Promise.all([
    prisma.order.findMany({
      where: { organizationId: user.organizationId, ...getDealerActivityScope(user) },
      include: { items: true, showroom: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.approvalRequest.findMany({
      where: { organizationId: user.organizationId, entityType: 'order' },
      orderBy: { createdAt: 'desc' },
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

  const approvalMap = new Map(approvals.map((approval) => [approval.entityId, approval]));
  const orderDealers = await prisma.dealer.findMany({
    where: {
      organizationId: user.organizationId,
      ...getDealerScope(user),
      id: { in: [...new Set(orders.map((order) => order.dealerId).filter(Boolean))] },
    },
    select: { id: true, name: true },
  });
  const dealerMap = new Map(orderDealers.map((dealer) => [dealer.id, dealer]));

  const data = orders.map((order) => {
    const approval = approvalMap.get(order.id);
    const totalQuantity = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      dealerId: dealerMap.get(order.dealerId)?.name || 'Unassigned',
      showroomId: order.showroomId,
      showroomName: order.showroom?.name || '—',
      product: order.items.map((item) => item.productName).filter(Boolean).join(', ') || 'N/A',
      quantity: totalQuantity,
      total: Number(order.totalAmount || 0),
      status: order.status,
      approvalStatus: approval?.currentStatus || order.status,
      createdAt: order.createdAt.toISOString(),
    };
  });

  const summary = {
    total: data.length,
    pending: data.filter((order) => order.status === 'pending' || order.approvalStatus === 'pending').length,
    approved: data.filter((order) => order.status === 'approved' || order.approvalStatus === 'approved').length,
    rejected: data.filter((order) => order.status === 'rejected' || order.approvalStatus === 'rejected').length,
    totalValue: data.reduce((sum, order) => sum + Number(order.total || 0), 0),
  };

  return NextResponse.json({
    success: true,
    summary,
    data,
    capabilities: {
      canCreate: hasPermission(user.permissions, 'orders.create'),
      canApprove: hasPermission(user.permissions, 'orders.approve'),
    },
    options: {
      dealers,
      showrooms,
      products: products.map((product) => ({ ...product, dealerPrice: Number(product.dealerPrice) })),
    },
    scope: { dealerId: user.dealerId || null, showroomId: user.showroomId || null },
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const orderId = body?.id ? String(body.id).trim() : null;
  const actionStatus = body?.status ? String(body.status).trim().toLowerCase() : null;

  if (orderId && actionStatus) {
    if (!hasPermission(user.permissions, 'orders.approve')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!['approved', 'rejected'].includes(actionStatus)) {
      return NextResponse.json({ error: 'Status must be approved or rejected.' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, organizationId: user.organizationId, ...getDealerActivityScope(user) },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found for this organization.' }, { status: 404 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending orders can be approved or rejected.' }, { status: 409 });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.order.updateMany({
        where: { id: orderId, organizationId: user.organizationId, ...getDealerActivityScope(user), status: 'pending' },
        data: { status: actionStatus },
      });

      if (!updateResult.count) return null;

      const nextOrder = await tx.order.findFirst({
        where: { id: orderId, organizationId: user.organizationId, ...getDealerActivityScope(user) },
      });

      const approval = await tx.approvalRequest.findFirst({
        where: { organizationId: user.organizationId, entityType: 'order', entityId: orderId },
      });
      if (approval) {
        await tx.approvalRequest.update({
          where: { id: approval.id },
          data: {
            currentStatus: actionStatus,
            approverName: user.name,
            reviewedAt: new Date(),
            comments: body?.comments || `Order ${order.orderNumber} was updated by ${user.name}.`,
          },
        });
      }

      return nextOrder;
    });

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order status changed before this action could be applied.' }, { status: 409 });
    }

    await logAuditEvent({
      user,
      organizationId: user.organizationId,
      action: 'order.approved',
      entityType: 'order',
      entityId: orderId,
      details: {
        orderNumber: order.orderNumber,
        status: actionStatus,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
      },
    });
  }

  if (!hasPermission(user.permissions, 'orders.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const dealerId = user.dealerId || String(body?.dealerId || '').trim();
  const showroomId = user.showroomId || String(body?.showroomId || '').trim() || null;
  const items = Array.isArray(body?.items) ? body.items : [];
  const requestedItems = items.length
    ? items.map((item) => ({ productId: String(item?.productId || '').trim(), quantity: Number(item?.quantity) }))
    : [{ productId: String(body?.productId || '').trim(), quantity: Number(body?.quantity) }];

  if (!dealerId || !requestedItems.length || requestedItems.some((item) => !item.productId || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || item.quantity > 2147483647)) {
    return NextResponse.json({ error: 'Dealer ID and at least one valid product entry are required.' }, { status: 400 });
  }

  const [dealer, products] = await Promise.all([
    prisma.dealer.findFirst({
      where: { id: dealerId, organizationId: user.organizationId, status: 'active' },
      select: { id: true },
    }),
    prisma.product.findMany({
      where: { id: { in: [...new Set(requestedItems.map((item) => item.productId))] }, organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true, dealerPrice: true },
    }),
  ]);

  if (!dealer) {
    return NextResponse.json({ error: 'Active dealer not found in this organization.' }, { status: 404 });
  }
  if (!canAccessDealer(user, dealer.id)) {
    return NextResponse.json({ error: 'Dealer not found in your account.' }, { status: 404 });
  }
  let showroom = null;
  if (showroomId) {
    showroom = await prisma.showroom.findFirst({
      where: { id: showroomId, organizationId: user.organizationId, dealerId },
      select: { id: true, dealerId: true, status: true },
    });
    if (!canAccessShowroom(user, showroom)) {
      return NextResponse.json({ error: 'Showroom not found for this dealer.' }, { status: 404 });
    }
    if (showroom.status !== 'active') {
      return NextResponse.json({ error: 'Orders cannot be placed for an inactive showroom.' }, { status: 409 });
    }
  } else if (user.dealerId) {
    return NextResponse.json({ error: 'Select a showroom for this order.' }, { status: 400 });
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  if (requestedItems.some((item) => !productsById.has(item.productId))) {
    return NextResponse.json({ error: 'One or more products are unavailable in this organization.' }, { status: 400 });
  }

  const normalizedItems = requestedItems.map(({ productId, quantity }) => {
    const product = productsById.get(productId);
    const unitPrice = product.dealerPrice.toFixed(2);
    const [whole, fraction] = unitPrice.split('.');
    const unitPriceCents = BigInt(whole) * 100n + BigInt(fraction || '00');
    if (unitPriceCents <= 0n) return null;
    const totalCents = unitPriceCents * BigInt(quantity);
    return {
      productName: product.name,
      quantity,
      unitPrice,
      totalAmount: `${totalCents / 100n}.${String(totalCents % 100n).padStart(2, '0')}`,
      totalCents,
    };
  });
  if (normalizedItems.some((item) => !item)) {
    return NextResponse.json({ error: 'Selected products must have a positive dealer price.' }, { status: 400 });
  }
  const totalCents = normalizedItems.reduce((sum, item) => sum + item.totalCents, 0n);
  const totalAmount = `${totalCents / 100n}.${String(totalCents % 100n).padStart(2, '0')}`;
  const orderNumber = `ORD-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const createdOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        organizationId: user.organizationId,
        dealerId,
        showroomId: showroom?.id || null,
        orderNumber,
        totalAmount,
        status: 'pending',
        items: {
          create: normalizedItems.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount,
          })),
        },
      },
      include: { items: true },
    });

    await tx.approvalRequest.create({
      data: {
        organizationId: user.organizationId,
        entityType: 'order',
        entityId: order.id,
        referenceNo: order.orderNumber,
        requestedBy: user.name,
        approverName: 'Pending assignment',
        currentStatus: 'pending',
        comments: `Dealer order ${order.orderNumber} requires review before fulfillment and billing.`,
      },
    });

    return order;
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'order.created',
    entityType: 'order',
    entityId: createdOrder.id,
    details: {
      orderNumber: createdOrder.orderNumber,
      dealerId,
      showroomId: showroom?.id || null,
      totalAmount: Number(createdOrder.totalAmount),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      dealerId,
      showroomId: showroom?.id || null,
      total: Number(createdOrder.totalAmount),
      status: createdOrder.status,
    },
  });
}
