import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewProcurement = ['purchases.manage', 'orders.approve', 'reports.view', 'users.manage'].some((permission) =>
    hasPermission(user.permissions, permission),
  );

  if (!canViewProcurement) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const canCreate = hasPermission(user.permissions, 'purchases.manage');
  const [requisitions, approvals, vendors, products] = await Promise.all([
    prisma.purchaseRequisition.findMany({
      where: { organizationId: user.organizationId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.approvalRequest.findMany({
      where: { organizationId: user.organizationId, entityType: 'purchase_requisition' },
      orderBy: { createdAt: 'desc' },
    }),
    canCreate ? prisma.vendor.findMany({
      where: { organizationId: user.organizationId, status: 'active' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }) : [],
    canCreate ? prisma.product.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true, sku: true, purchasePrice: true },
      orderBy: { name: 'asc' },
    }) : [],
  ]);

  const approvalMap = new Map(approvals.map((approval) => [approval.referenceNo, approval]));

  const data = requisitions.map((requisition) => {
    const approval = approvalMap.get(requisition.requisitionNo);
    const totalQuantity = requisition.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const vendorName = requisition.vendorName || '—';

    return {
      id: requisition.id,
      approvalId: approval?.id || null,
      requisitionNo: requisition.requisitionNo,
      vendor: vendorName,
      product: requisition.items.map((item) => item.productName).join(', ') || 'N/A',
      quantity: totalQuantity,
      total: Number(requisition.totalAmount || 0),
      status: requisition.status,
      approvalStatus: approval?.currentStatus || requisition.status,
      requestedBy: approval?.requestedBy || '—',
      approver: approval?.approverName || 'Pending assignment',
      createdAt: requisition.createdAt.toISOString(),
    };
  });

  const summary = {
    total: data.length,
    pending: data.filter((item) => item.approvalStatus === 'pending' || item.status === 'pending').length,
    approved: data.filter((item) => item.approvalStatus === 'approved' || item.status === 'approved').length,
    rejected: data.filter((item) => item.approvalStatus === 'rejected' || item.status === 'rejected').length,
    spend: data.reduce((sum, item) => sum + Number(item.total || 0), 0),
  };

  return NextResponse.json({
    success: true,
    summary,
    data,
    total: data.length,
    options: {
      vendors,
      products: products.map((product) => ({ ...product, purchasePrice: product.purchasePrice.toFixed(2) })),
    },
    capabilities: {
      canCreate,
      canApprove: hasPermission(user.permissions, 'orders.approve'),
    },
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'purchases.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const vendorId = String(body?.vendorId || '').trim();
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!vendorId || !items.length) {
    return NextResponse.json({ error: 'Select a vendor and add at least one purchase item.' }, { status: 400 });
  }

  const requestedItems = items.map((item) => ({
    productId: String(item?.productId || '').trim(),
    quantity: Number(item?.quantity),
  }));
  if (requestedItems.some((item) => !item.productId || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || item.quantity > 2147483647)) {
    return NextResponse.json({ error: 'Each item must have a valid product and positive whole-number quantity.' }, { status: 400 });
  }

  const [vendor, products] = await Promise.all([
    prisma.vendor.findFirst({
      where: { id: vendorId, organizationId: user.organizationId, status: 'active' },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { id: { in: [...new Set(requestedItems.map((item) => item.productId))] }, organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true, purchasePrice: true },
    }),
  ]);
  if (!vendor) {
    return NextResponse.json({ error: 'Active vendor not found in this organization.' }, { status: 404 });
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  if (requestedItems.some((item) => !productsById.has(item.productId))) {
    return NextResponse.json({ error: 'One or more products are unavailable in this organization.' }, { status: 400 });
  }

  const normalizedItems = requestedItems.map(({ productId, quantity }) => {
    const product = productsById.get(productId);
    const unitPrice = product.purchasePrice.toFixed(2);
    const [whole, fraction] = unitPrice.split('.');
    const unitPriceCents = BigInt(whole) * 100n + BigInt(fraction || '00');
    const totalCents = unitPriceCents * BigInt(quantity);
    return {
      productName: product.name,
      quantity,
      unitPrice,
      totalAmount: `${totalCents / 100n}.${String(totalCents % 100n).padStart(2, '0')}`,
      totalCents,
    };
  });
  if (normalizedItems.some((item) => item.totalCents <= 0n)) {
    return NextResponse.json({ error: 'Selected products must have a positive purchase price.' }, { status: 400 });
  }

  const totalCents = normalizedItems.reduce((sum, item) => sum + item.totalCents, 0n);
  const totalAmount = `${totalCents / 100n}.${String(totalCents % 100n).padStart(2, '0')}`;
  const requestedRequisitionNo = String(body?.requisitionNo || '').trim();
  if (requestedRequisitionNo.length > 100) {
    return NextResponse.json({ error: 'Requisition number cannot exceed 100 characters.' }, { status: 400 });
  }
  const requisitionNo = requestedRequisitionNo || `PR-${Date.now()}-${randomUUID().slice(0, 8)}`;
  if (requestedRequisitionNo && await prisma.purchaseRequisition.findUnique({ where: { requisitionNo: requestedRequisitionNo }, select: { id: true } })) {
    return NextResponse.json({ error: 'Requisition number already exists.' }, { status: 409 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const requisition = await tx.purchaseRequisition.create({
      data: {
        organizationId: user.organizationId,
        vendorName: vendor.name,
        requisitionNo,
        status: 'pending',
        totalAmount,
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

    const approval = await tx.approvalRequest.create({
      data: {
        organizationId: user.organizationId,
        entityType: 'purchase_requisition',
        entityId: requisition.id,
        referenceNo: requisition.requisitionNo,
        requestedBy: user.name,
        approverName: 'Pending assignment',
        currentStatus: 'pending',
        comments: `Procurement approval required for ${requisition.requisitionNo}.`,
      },
    });

    return { requisition, approval };
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'purchase.created',
    entityType: 'purchase',
    entityId: created.requisition.id,
    details: {
      requisitionNo: created.requisition.requisitionNo,
      vendorName: vendor.name,
      total: Number(created.requisition.totalAmount),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: created.requisition.id,
      requisitionNo: created.requisition.requisitionNo,
      vendor: vendor.name,
      total: Number(created.requisition.totalAmount),
      status: created.requisition.status,
      approvalStatus: created.approval.currentStatus,
      approvalId: created.approval.id,
    },
  });
}
