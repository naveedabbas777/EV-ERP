import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessShowroom, getShowroomScope, hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

class PaymentConflictError extends Error {}

function parseCents(value) {
  const text = String(value ?? '').trim();
  if (!/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function decimalToCents(value) {
  const [whole, fraction = '00'] = value.toFixed(2).split('.');
  return BigInt(whole) * 100n + BigInt(fraction);
}

function centsToDecimal(cents) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

export async function POST(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(user.permissions, 'showroom.sales.create')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: showroomId } = await params;
  const showroom = await prisma.showroom.findFirst({
    where: { id: showroomId, organizationId: user.organizationId, ...getShowroomScope(user) },
    select: { id: true, dealerId: true, status: true },
  });
  if (!canAccessShowroom(user, showroom)) return NextResponse.json({ error: 'Showroom not found.' }, { status: 404 });
  if (showroom.status !== 'active') return NextResponse.json({ error: 'Payments cannot be recorded for an inactive showroom.' }, { status: 409 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const saleId = String(body?.saleId || '').trim();
  const paymentMethod = String(body?.paymentMethod || '').trim();
  const amountCents = parseCents(body?.amount);
  const methods = ['cash', 'card', 'bank-transfer', 'cheque', 'mobile-wallet'];
  if (!saleId || amountCents === null || amountCents <= 0n || !methods.includes(paymentMethod)) {
    return NextResponse.json({ error: 'Select a sale, enter a positive amount, and choose a supported payment method.' }, { status: 400 });
  }

  const sale = await prisma.showroomSale.findFirst({
    where: { id: saleId, organizationId: user.organizationId, dealerId: showroom.dealerId, showroomId },
    select: { id: true, totalAmount: true, paidAmount: true },
  });
  if (!sale) return NextResponse.json({ error: 'Sale not found in this showroom.' }, { status: 404 });

  const paidCents = decimalToCents(sale.paidAmount);
  const totalCents = decimalToCents(sale.totalAmount);
  if (paidCents + amountCents > totalCents) {
    return NextResponse.json({ error: 'Payment exceeds the remaining amount due for this sale.' }, { status: 400 });
  }

  let payment;
  try {
    payment = await prisma.$transaction(async (tx) => {
      const updated = await tx.showroomSale.updateMany({
        where: {
          id: sale.id,
          paidAmount: sale.paidAmount,
          totalAmount: { gte: centsToDecimal(paidCents + amountCents) },
        },
        data: { paidAmount: { increment: centsToDecimal(amountCents) } },
      });
      if (updated.count !== 1) throw new PaymentConflictError();

      return tx.showroomPayment.create({
        data: {
          organizationId: user.organizationId,
          dealerId: showroom.dealerId,
          showroomId,
          saleId,
          amount: centsToDecimal(amountCents),
          paymentMethod,
          referenceNo: String(body?.referenceNo || '').trim().slice(0, 191) || null,
        },
      });
    });
  } catch (error) {
    if (error instanceof PaymentConflictError) {
      return NextResponse.json({ error: 'Sale balance changed while this payment was being recorded. Refresh and retry.' }, { status: 409 });
    }
    throw error;
  }

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'showroom.payment.created',
    entityType: 'showroom_payment',
    entityId: payment.id,
    details: { showroomId, saleId, amount: Number(payment.amount), paymentMethod },
  });

  return NextResponse.json({
    success: true,
    data: { id: payment.id, saleId, amount: Number(payment.amount), remainingAmount: Number(centsToDecimal(totalCents - paidCents - amountCents)) },
  }, { status: 201 });
}
