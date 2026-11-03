import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessShowroom, getDealerActivityScope, getDealerScope, getShowroomScope, hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'returns.create') && !hasPermission(user.permissions, 'returns.approve') && !hasPermission(user.permissions, 'reports.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [rows, dealers, products, showrooms] = await Promise.all([
    prisma.returnRequest.findMany({
      where: { dealer: { organizationId: user.organizationId, ...getDealerScope(user) }, ...getDealerActivityScope(user) },
      include: {
        dealer: true,
        showroom: true,
        items: {
          where: { product: { organizationId: user.organizationId } },
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.dealer.findMany({
      where: { organizationId: user.organizationId, status: 'active', ...getDealerScope(user) },
      select: { id: true, name: true, registrationNumber: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true, sku: true },
      orderBy: { name: 'asc' },
    }),
    prisma.showroom.findMany({
      where: { organizationId: user.organizationId, status: 'active', ...getShowroomScope(user) },
      select: { id: true, dealerId: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const summary = {
    total: rows.length,
    pending: rows.filter((row) => row.status === 'pending').length,
    approved: rows.filter((row) => row.status === 'approved').length,
    rejected: rows.filter((row) => row.status === 'rejected').length,
  };

  return NextResponse.json({
    success: true,
    summary,
    data: rows.map((row) => ({
      id: row.id,
      dealer: row.dealer?.name || 'Unassigned',
      showroom: row.showroom?.name || 'Unspecified',
      product: row.items.map((item) => item.product?.name).filter(Boolean).join(', ') || '—',
      quantity: row.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      reason: row.items.map((item) => item.defectReason).filter(Boolean).join('; ') || '—',
      status: row.status,
    })),
    options: { dealers, products, showrooms },
    capabilities: {
      canCreate: hasPermission(user.permissions, 'returns.create'),
      canApprove: hasPermission(user.permissions, 'returns.approve'),
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
  const returnId = body?.id ? String(body.id).trim() : null;
  const status = body?.status ? String(body.status).trim().toLowerCase() : null;

  if (returnId && status) {
    if (!hasPermission(user.permissions, 'returns.approve')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status must be approved or rejected.' }, { status: 400 });
    }

    const existingReturn = await prisma.returnRequest.findFirst({
      where: { id: returnId, dealer: { organizationId: user.organizationId, ...getDealerScope(user) }, ...getDealerActivityScope(user) },
      include: { items: true },
    });

    if (!existingReturn) {
      return NextResponse.json({ error: 'Return request not found in this organization.' }, { status: 404 });
    }

    if (existingReturn.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending return requests can be reviewed.' }, { status: 409 });
    }

    const updatedCount = await prisma.returnRequest.updateMany({
      where: {
        id: returnId,
        status: 'pending',
        dealerId: existingReturn.dealerId,
        showroomId: existingReturn.showroomId,
      },
      data: { status },
    });

    if (!updatedCount.count) {
      return NextResponse.json({ error: 'Return status changed before this action could be applied.' }, { status: 409 });
    }

    await logAuditEvent({
      user,
      organizationId: user.organizationId,
      action: `return.${status}`,
      entityType: 'return_request',
      entityId: returnId,
      details: {
        status,
        items: existingReturn.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: returnId, status },
    });
  }

  if (!hasPermission(user.permissions, 'returns.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const dealerId = user.dealerId || String(body?.dealerId || '').trim();
  const showroomId = user.showroomId || String(body?.showroomId || '').trim() || null;
  const productId = String(body?.productId || '').trim();
  const quantity = Number(body?.quantity);
  const defectReason = String(body?.defectReason || '').trim();

  if (!dealerId || !productId || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 2147483647 || !defectReason || defectReason.length > 255) {
    return NextResponse.json({ error: 'Select a dealer and product, enter a positive whole-number quantity, and describe the defect.' }, { status: 400 });
  }

  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, organizationId: user.organizationId },
  });

  if (!dealer) {
    return NextResponse.json({ error: 'Dealer not found in this organization.' }, { status: 404 });
  }
  if (showroomId) {
    const showroom = await prisma.showroom.findFirst({
      where: { id: showroomId, organizationId: user.organizationId, dealerId },
      select: { id: true, dealerId: true, status: true },
    });
    if (!canAccessShowroom(user, showroom)) {
      return NextResponse.json({ error: 'Showroom not found for this dealer.' }, { status: 404 });
    }
    if (showroom.status !== 'active') {
      return NextResponse.json({ error: 'Return requests cannot be created for an inactive showroom.' }, { status: 409 });
    }
  } else if (user.dealerId) {
    return NextResponse.json({ error: 'Select a showroom for this return request.' }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId: user.organizationId },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found in this organization.' }, { status: 404 });
  }

  const returnRequest = await prisma.returnRequest.create({
    data: {
      organizationId: user.organizationId,
      dealerId,
      showroomId,
      status: 'pending',
      items: {
        create: {
          productId,
          quantity,
          defectReason,
          inspectedQty: quantity,
        },
      },
    },
    include: { dealer: true, items: { include: { product: true } } },
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'return.created',
    entityType: 'return_request',
    entityId: returnRequest.id,
    details: {
      dealerId,
      productId,
      quantity,
      defectReason,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: returnRequest.id,
      dealer: returnRequest.dealer.name,
      product: returnRequest.items[0]?.product?.name || product.name,
      quantity: returnRequest.items[0]?.quantity || 0,
      reason: returnRequest.items[0]?.defectReason || '',
      status: returnRequest.status,
    },
  });
}
