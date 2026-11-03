import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { withOrganizationScope } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canReview = hasPermission(user.permissions, 'orders.approve');
  if (!canReview && !hasPermission(user.permissions, 'reports.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const organizationId = user.organizationId;
  const approvals = await prisma.approvalRequest.findMany({
    where: {
      organizationId,
      entityType: { in: ['order', 'purchase_requisition'] },
    },
    orderBy: { createdAt: 'desc' },
  });
  const summary = {
    total: approvals.length,
    pending: approvals.filter((approval) => approval.currentStatus === 'pending').length,
    approved: approvals.filter((approval) => approval.currentStatus === 'approved').length,
    rejected: approvals.filter((approval) => approval.currentStatus === 'rejected').length,
  };

  return NextResponse.json({
    summary,
    data: approvals.map((approval) => ({
      id: approval.id,
      type: approval.entityType,
      referenceNo: approval.referenceNo || approval.entityId,
      requestedBy: approval.requestedBy || 'Operations',
      status: approval.currentStatus,
      comments: approval.comments || 'No comments',
      createdAt: approval.createdAt.toISOString(),
      approver: approval.approverName || 'Pending assignment',
    })),
    capabilities: { canReview },
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'orders.approve')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body?.id || '').trim();
  const status = String(body?.status || '').toLowerCase();

  if (!id) {
    return NextResponse.json({ error: 'Approval id is required.' }, { status: 400 });
  }

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Status must be approved or rejected.' }, { status: 400 });
  }

  const existingApproval = await prisma.approvalRequest.findFirst({
    where: withOrganizationScope(user, { id }),
  });

  if (!existingApproval) {
    return NextResponse.json({ error: 'Approval record not found for this organization.' }, { status: 404 });
  }

  if (existingApproval.currentStatus !== 'pending') {
    return NextResponse.json({ error: 'Only pending approvals can be reviewed.' }, { status: 409 });
  }

  if (!['order', 'purchase_requisition'].includes(existingApproval.entityType)) {
    return NextResponse.json({ error: 'This approval type is not supported.' }, { status: 400 });
  }

  let purchaseRequisition = null;
  let order = null;
  if (existingApproval.entityType === 'purchase_requisition') {
    purchaseRequisition = await prisma.purchaseRequisition.findFirst({
      where: { id: existingApproval.entityId, organizationId: user.organizationId },
    });
    if (!purchaseRequisition) {
      return NextResponse.json({ error: 'Purchase requisition not found in this organization.' }, { status: 404 });
    }
    if (status === 'approved' && !purchaseRequisition.vendorName) {
      return NextResponse.json({ error: 'Assign a vendor before approving this requisition.' }, { status: 409 });
    }
  } else {
    order = await prisma.order.findFirst({
      where: { id: existingApproval.entityId, organizationId: user.organizationId },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found in this organization.' }, { status: 404 });
    }
  }

  let approval;
  try {
    approval = await prisma.$transaction(async (tx) => {
      const resourceUpdate = purchaseRequisition
        ? await tx.purchaseRequisition.updateMany({
            where: { id: purchaseRequisition.id, organizationId: user.organizationId, status: 'pending' },
            data: { status },
          })
        : await tx.order.updateMany({
            where: { id: order.id, organizationId: user.organizationId, status: 'pending' },
            data: { status },
          });

      if (!resourceUpdate.count) return null;

      if (purchaseRequisition && status === 'approved') {
        await tx.purchaseOrder.create({
          data: {
            organizationId: user.organizationId,
            orderNo: `PO-${Date.now()}-${randomUUID().slice(0, 8)}`,
            vendorName: purchaseRequisition.vendorName,
            totalAmount: purchaseRequisition.totalAmount,
            status: 'draft',
          },
        });
      }

      const approvalUpdate = await tx.approvalRequest.updateMany({
        where: { id, organizationId: user.organizationId, currentStatus: 'pending' },
        data: {
          currentStatus: status,
          approverName: user.name,
          reviewedAt: new Date(),
          comments: body?.comments || `Updated by ${user.name}`,
        },
      });

      if (!approvalUpdate.count) throw new Error('APPROVAL_CONFLICT');
      return tx.approvalRequest.findUnique({ where: { id } });
    });
  } catch (error) {
    if (error.message === 'APPROVAL_CONFLICT') {
      return NextResponse.json({ error: 'Approval was already reviewed.' }, { status: 409 });
    }
    throw error;
  }

  if (!approval) {
    return NextResponse.json({ error: 'The linked record is no longer pending review.' }, { status: 409 });
  }

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: `approval.${status}`,
    entityType: 'approval',
    entityId: approval.id,
    details: {
      referenceNo: approval.referenceNo,
      previousStatus: existingApproval.currentStatus,
      status,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: approval.id,
      status: approval.currentStatus,
      approver: approval.approverName,
    },
  });
}
