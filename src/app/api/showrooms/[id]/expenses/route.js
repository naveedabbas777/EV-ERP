import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessShowroom, getShowroomScope, hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(user.permissions, 'showroom.expenses.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: showroomId } = await params;
  const showroom = await prisma.showroom.findFirst({
    where: { id: showroomId, organizationId: user.organizationId, ...getShowroomScope(user) },
    select: { id: true, dealerId: true, status: true },
  });
  if (!canAccessShowroom(user, showroom)) return NextResponse.json({ error: 'Showroom not found.' }, { status: 404 });
  if (showroom.status !== 'active') return NextResponse.json({ error: 'Expenses cannot be recorded for an inactive showroom.' }, { status: 409 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const title = String(body?.title || '').trim();
  const category = String(body?.category || '').trim();
  const amountText = String(body?.amount ?? '').trim();
  if (!title || title.length > 191 || !category || category.length > 100 || !/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(amountText)) {
    return NextResponse.json({ error: 'Enter an expense title, category, and valid positive amount.' }, { status: 400 });
  }
  const [whole, fraction = ''] = amountText.split('.');
  const amountCents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (amountCents <= 0n) return NextResponse.json({ error: 'Expense amount must be greater than zero.' }, { status: 400 });
  const amount = `${amountCents / 100n}.${String(amountCents % 100n).padStart(2, '0')}`;

  const expense = await prisma.expense.create({
    data: {
      organizationId: user.organizationId,
      showroomId,
      title,
      category,
      amount,
      status: 'pending',
    },
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'showroom.expense.created',
    entityType: 'expense',
    entityId: expense.id,
    details: { showroomId, title, category, amount },
  });

  return NextResponse.json({
    success: true,
    data: { id: expense.id, title: expense.title, category: expense.category, amount: Number(expense.amount), status: expense.status },
  }, { status: 201 });
}
