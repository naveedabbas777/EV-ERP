import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'employees.manage') && !hasPermission(user.permissions, 'payments.read') && !hasPermission(user.permissions, 'payments.approve')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [salaries, employees] = await Promise.all([
    prisma.salary.findMany({
      where: { employee: { organizationId: user.organizationId } },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.employee.findMany({
      where: { organizationId: user.organizationId, status: 'active' },
      select: { id: true, firstName: true, lastName: true, employeeCode: true, baseSalary: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
  ]);

  return NextResponse.json({
    data: salaries.map((salary) => ({
      id: salary.id,
      employee: `${salary.employee.firstName} ${salary.employee.lastName}`,
      amount: Number(salary.amount),
      month: salary.month,
      status: salary.paidAt ? 'Paid' : 'Pending',
      createdAt: salary.createdAt.toISOString(),
    })),
    total: salaries.length,
    options: {
      employees: employees.map((employee) => ({ ...employee, baseSalary: employee.baseSalary === null ? '' : employee.baseSalary.toFixed(2) })),
    },
    capabilities: {
      canCreate: hasPermission(user.permissions, 'employees.manage') || hasPermission(user.permissions, 'payments.approve'),
      canMarkPaid: hasPermission(user.permissions, 'payments.approve'),
    },
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManageEmployees = hasPermission(user.permissions, 'employees.manage');
  const canApprovePayments = hasPermission(user.permissions, 'payments.approve');
  if (!canManageEmployees && !canApprovePayments) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const employeeId = String(body?.employeeId || '').trim();
  const month = String(body?.month || '').trim();
  const amountValue = String(body?.amount ?? '').trim();
  const markPaid = body?.paid === true;

  if (!employeeId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(amountValue)) {
    return NextResponse.json({ error: 'Select an employee, a valid month, and a valid salary amount.' }, { status: 400 });
  }

  if (markPaid && !canApprovePayments) {
    return NextResponse.json({ error: 'Payment approval permission is required to mark payroll as paid.' }, { status: 403 });
  }

  const [wholeAmount, fractionAmount = ''] = amountValue.split('.');
  const amountCents = BigInt(wholeAmount) * 100n + BigInt(fractionAmount.padEnd(2, '0'));
  if (amountCents <= 0n) {
    return NextResponse.json({ error: 'Salary amount must be greater than zero.' }, { status: 400 });
  }
  const amount = `${amountCents / 100n}.${String(amountCents % 100n).padStart(2, '0')}`;

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: user.organizationId, status: 'active' },
  });

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found in this organization.' }, { status: 404 });
  }

  const existingSalary = await prisma.salary.findFirst({
    where: { employeeId, month, employee: { organizationId: user.organizationId } },
    select: { id: true },
  });
  if (existingSalary) {
    return NextResponse.json({ error: 'A salary record already exists for this employee and month.' }, { status: 409 });
  }

  const salary = await prisma.salary.create({
    data: {
      employeeId,
      month,
      amount,
      paidAt: markPaid ? new Date() : null,
    },
    include: { employee: true },
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: markPaid ? 'payroll.paid' : 'payroll.created',
    entityType: 'salary',
    entityId: salary.id,
    details: { employeeId, month, amount },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: salary.id,
      employee: `${salary.employee.firstName} ${salary.employee.lastName}`,
      amount: Number(salary.amount),
      month: salary.month,
      status: salary.paidAt ? 'Paid' : 'Pending',
      createdAt: salary.createdAt.toISOString(),
    },
  });
}
