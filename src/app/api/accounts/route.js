import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

const asNumber = (value) => Number(value ?? 0) || 0;

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'accounts.read') && !hasPermission(user.permissions, 'reports.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [accounts, expenses] = await Promise.all([
    prisma.account.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      include: { entries: { orderBy: { createdAt: 'desc' }, take: 5 } },
    }),
    prisma.expense.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const summary = {
    totalAccounts: accounts.length,
    totalBalance: accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0),
    payable: accounts.filter((account) => /payable|liability/i.test(account.type || '')).reduce((sum, account) => sum + Number(account.balance || 0), 0),
    receivable: accounts.filter((account) => /receivable|asset/i.test(account.type || '')).reduce((sum, account) => sum + Number(account.balance || 0), 0),
    expenses: expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
  };

  return NextResponse.json({
    success: true,
    summary,
    data: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: Number(account.balance || 0),
      entries: account.entries.map((entry) => ({
        id: entry.id,
        type: entry.entryType,
        amount: Number(entry.amount || 0),
        note: entry.note || 'Ledger entry',
        createdAt: entry.createdAt.toISOString(),
      })),
    })),
    expenses: expenses.map((expense) => ({
      id: expense.id,
      title: expense.title,
      category: expense.category,
      amount: Number(expense.amount || 0),
      status: expense.status,
      createdAt: expense.createdAt.toISOString(),
    })),
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'accounts.manage') && !hasPermission(user.permissions, 'payments.approve')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body?.name || '').trim();
  const type = String(body?.type || 'asset').trim() || 'asset';
  const amount = asNumber(body?.amount);
  const entryType = String(body?.entryType || 'debit').trim().toLowerCase();
  const note = String(body?.note || '').trim() || 'Manual account posting';

  if (!name || !amount) {
    return NextResponse.json({ error: 'Account name and an amount are required.' }, { status: 400 });
  }

  if (!['debit', 'credit'].includes(entryType)) {
    return NextResponse.json({ error: 'Entry type must be debit or credit.' }, { status: 400 });
  }

  const account = await prisma.$transaction(async (tx) => {
    const existingAccount = await tx.account.findFirst({ where: { organizationId: user.organizationId, name } });
    const targetAccount = existingAccount || await tx.account.create({
      data: {
        organizationId: user.organizationId,
        name,
        type,
        balance: 0,
      },
    });

    const amountValue = Number(amount || 0);
    const nextBalance = entryType === 'credit'
      ? Number(targetAccount.balance || 0) + amountValue
      : Number(targetAccount.balance || 0) - amountValue;

    await tx.ledgerEntry.create({
      data: {
        accountId: targetAccount.id,
        amount: amountValue,
        entryType,
        note,
      },
    });

    const updatedAccount = await tx.account.update({
      where: { id: targetAccount.id },
      data: {
        type: type || targetAccount.type,
        balance: nextBalance,
      },
    });

    if (type === 'expense' || body?.expenseTitle) {
      await tx.expense.create({
        data: {
          title: String(body?.expenseTitle || name).trim() || name,
          organizationId: user.organizationId,
          amount: amountValue,
          category: String(body?.category || 'General').trim() || 'General',
          status: String(body?.status || 'approved').trim() || 'approved',
        },
      });
    }

    return updatedAccount;
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'accounts.posted',
    entityType: 'account',
    entityId: account.id,
    details: {
      name,
      type,
      amount,
      entryType,
      note,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: account.id,
      name,
      type,
      balance: Number(account.balance || 0),
      entryType,
      amount,
    },
  });
}
