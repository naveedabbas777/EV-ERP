import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { getDealerActivityScope, getDealerScope, getShowroomScope, hasPermission } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'payments.read') && !hasPermission(user.permissions, 'reports.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [payments, dealerAggregate, ledgerAccounts, dealers, showrooms] = await Promise.all([
    prisma.payment.findMany({
      where: { dealer: { organizationId: user.organizationId, ...getDealerScope(user) }, ...getDealerActivityScope(user) },
      include: { dealer: true, sale: true, showroom: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.dealer.aggregate({
      where: { organizationId: user.organizationId, ...getDealerScope(user) },
      _sum: { outstandingBalance: true },
    }),
    user.dealerId ? Promise.resolve([]) : prisma.account.findMany({
      where: { organizationId: user.organizationId },
      include: { entries: { orderBy: { createdAt: 'desc' }, take: 6 } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.dealer.findMany({
      where: { organizationId: user.organizationId, status: 'active', ...getDealerScope(user) },
      select: { id: true, name: true, registrationNumber: true },
      orderBy: { name: 'asc' },
    }),
    prisma.showroom.findMany({
      where: { organizationId: user.organizationId, status: 'active', ...getShowroomScope(user) },
      select: { id: true, dealerId: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const totalCollected = payments
    .filter((payment) => payment.status === 'paid' || payment.status === 'approved')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const pendingReceipts = payments.filter((payment) => payment.status === 'pending').length;
  const outstandingBalance = Number(dealerAggregate._sum.outstandingBalance || 0);

  return NextResponse.json({
    success: true,
    data: payments.map((payment) => ({
      id: payment.id,
      invoice: payment.paymentNumber,
      dealer: payment.dealer?.name || 'Unassigned',
      showroom: payment.showroom?.name || 'Unspecified',
      amount: Number(payment.amount),
      due: payment.status === 'paid' || payment.status === 'approved' ? 'Completed' : '—',
      status: payment.status === 'paid' ? 'Paid' : payment.status === 'approved' ? 'Approved' : 'Pending',
      method: payment.paymentMethod || 'Not provided',
      createdAt: payment.createdAt.toISOString(),
    })),
    ledger: ledgerAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: Number(account.balance || 0),
      entries: account.entries.map((entry) => ({
        id: entry.id,
        amount: Number(entry.amount || 0),
        type: entry.entryType,
        note: entry.note || '',
        createdAt: entry.createdAt.toISOString(),
      })),
    })),
    total: payments.length,
    outstanding: outstandingBalance,
    options: { dealers, showrooms },
    capabilities: { canRecordPayment: hasPermission(user.permissions, 'payments.approve') },
    summary: {
      totalCollected,
      pendingReceipts,
      totalPayments: payments.length,
      netCash: totalCollected - outstandingBalance,
    },
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
  const dealerId = String(body?.dealerId || '').trim();
  const showroomId = String(body?.showroomId || '').trim() || null;
  const amountValue = String(body?.amount ?? '').trim();
  const paymentMethod = String(body?.paymentMethod || '').trim();
  const allowedPaymentMethods = ['bank-transfer', 'cash', 'cheque', 'card', 'mobile-wallet'];

  if (!/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(amountValue) || !allowedPaymentMethods.includes(paymentMethod)) {
    return NextResponse.json({ error: 'Dealer, a positive amount, and a supported payment method are required.' }, { status: 400 });
  }

  const [wholeAmount, fractionAmount = ''] = amountValue.split('.');
  const amountCents = BigInt(wholeAmount) * 100n + BigInt(fractionAmount.padEnd(2, '0'));
  if (!dealerId || amountCents <= 0n) {
    return NextResponse.json({ error: 'Dealer and a positive amount are required.' }, { status: 400 });
  }
  const amount = `${amountCents / 100n}.${String(amountCents % 100n).padStart(2, '0')}`;

  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, organizationId: user.organizationId },
  });

  if (!dealer) {
    return NextResponse.json({ error: 'Dealer not found in this organization.' }, { status: 404 });
  }
  if (showroomId) {
    const showroom = await prisma.showroom.findFirst({
      where: { id: showroomId, organizationId: user.organizationId, dealerId },
      select: { id: true },
    });
    if (!showroom) return NextResponse.json({ error: 'Showroom not found for this dealer.' }, { status: 404 });
  }

  const paymentRecord = await prisma.$transaction(async (tx) => {
    const cashAccount =
      (await tx.account.findFirst({ where: { organizationId: user.organizationId, name: 'Cash' } })) ||
      (await tx.account.create({
        data: {
          organizationId: user.organizationId,
          name: 'Cash',
          type: 'asset',
          balance: 0,
        },
      }));

    const receivablesAccount =
      (await tx.account.findFirst({ where: { organizationId: user.organizationId, name: 'Accounts Receivable' } })) ||
      (await tx.account.create({
        data: {
          organizationId: user.organizationId,
          name: 'Accounts Receivable',
          type: 'asset',
          balance: 0,
        },
      }));

    const payment = await tx.payment.create({
      data: {
        organizationId: user.organizationId,
        dealerId,
        showroomId,
        paymentNumber: `PAY-${Date.now()}-${randomUUID().slice(0, 8)}`,
        amount,
        status: 'paid',
        paymentMethod,
        referenceNo: String(body?.referenceNo || `REF-${Date.now()}`).trim().slice(0, 191),
      },
      include: { dealer: true },
    });

    await tx.ledgerEntry.create({
      data: {
        accountId: cashAccount.id,
        amount,
        entryType: 'debit',
        note: `Dealer payment received from ${dealer.name}`,
      },
    });

    await tx.ledgerEntry.create({
      data: {
        accountId: receivablesAccount.id,
        amount,
        entryType: 'credit',
        note: `Receipt against outstanding balance for ${dealer.name}`,
      },
    });

    await tx.account.update({
      where: { id: cashAccount.id },
      data: {
        balance: { increment: amount },
      },
    });

    const [outstandingWhole, outstandingFraction = '00'] = dealer.outstandingBalance.toFixed(2).split('.');
    const outstandingCents = BigInt(outstandingWhole) * 100n + BigInt(outstandingFraction);
    const reducedCents = outstandingCents > amountCents ? outstandingCents - amountCents : 0n;
    const reducedOutstanding = `${reducedCents / 100n}.${String(reducedCents % 100n).padStart(2, '0')}`;

    await tx.dealer.update({
      where: { id: dealerId },
      data: {
        outstandingBalance: reducedOutstanding,
      },
    });

    const outstandingAggregate = await tx.dealer.aggregate({
      where: { organizationId: user.organizationId },
      _sum: { outstandingBalance: true },
    });

    await tx.account.update({
      where: { id: receivablesAccount.id },
      data: { balance: outstandingAggregate._sum.outstandingBalance || 0 },
    });

    return payment;
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'payment.created',
    entityType: 'payment',
    entityId: paymentRecord.id,
    details: {
      paymentNumber: paymentRecord.paymentNumber,
      dealerId,
      amount: Number(paymentRecord.amount),
      method: paymentMethod,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      invoice: paymentRecord.paymentNumber,
      dealer: paymentRecord.dealer?.name || 'Unassigned',
      amount: Number(paymentRecord.amount),
      due: 'Completed',
      status: 'Paid',
    },
  });
}
