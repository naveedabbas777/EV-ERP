import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withOrganizationRelationScope } from '@/lib/tenant';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'payments.read') && !hasPermission(user.permissions, 'reports.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payments = await prisma.payment.findMany({
    where: withOrganizationRelationScope(user),
    include: { dealer: true, sale: true },
    orderBy: { createdAt: 'desc' },
  });

  const data = payments.map((payment) => {
    const expectedAmount = Number(payment.sale?.totalAmount || payment.amount || 0);
    const receivedAmount = Number(payment.amount || 0);
    const variance = Number(expectedAmount - receivedAmount);

    return {
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      dealer: payment.dealer?.name || 'Unassigned',
      invoice: payment.sale?.invoiceNumber || payment.referenceNo || 'Manual entry',
      expectedAmount,
      receivedAmount,
      variance,
      status:
        payment.status === 'paid'
          ? 'Matched'
          : variance === 0
            ? 'Pending'
            : 'Awaiting receipt',
      method: payment.paymentMethod || 'Not provided',
      createdAt: payment.createdAt.toISOString(),
    };
  });

  const summary = {
    total: data.length,
    matched: data.filter((item) => item.status === 'Matched').length,
    awaiting: data.filter((item) => item.status === 'Awaiting receipt').length,
    flagged: data.filter((item) => item.status === 'Pending').length,
    totalVariance: data.reduce((sum, item) => sum + Number(item.variance || 0), 0),
  };

  return NextResponse.json({
    summary,
    data,
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'payments.approve')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const paymentId = String(body?.id || '').trim();
  const action = String(body?.action || '').toLowerCase();

  if (!paymentId) {
    return NextResponse.json({ error: 'Payment id is required.' }, { status: 400 });
  }

  if (!['match', 'flag'].includes(action)) {
    return NextResponse.json({ error: 'Action must be match or flag.' }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: withOrganizationRelationScope(user, { id: paymentId }),
    include: { dealer: true },
  });

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found for this organization.' }, { status: 404 });
  }

  const nextStatus = action === 'flag' ? 'pending' : 'paid';

  const updateResult = await prisma.payment.updateMany({
    where: { id: paymentId, status: payment.status },
    data: {
      status: nextStatus,
      referenceNo: String(body?.referenceNo || payment.referenceNo || '').trim() || null,
    },
  });

  if (!updateResult.count) {
    return NextResponse.json({ error: 'Payment status changed before reconciliation could be applied.' }, { status: 409 });
  }

  const updated = await prisma.payment.findUnique({ where: { id: paymentId } });
  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: `payment.reconciliation.${action}`,
    entityType: 'payment',
    entityId: paymentId,
    details: { paymentNumber: payment.paymentNumber, previousStatus: payment.status, status: nextStatus },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      paymentNumber: updated.paymentNumber,
      status: updated.status,
      dealer: payment.dealer?.name || 'Unassigned',
    },
  });
}
