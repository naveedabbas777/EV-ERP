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

  if (!hasPermission(user.permissions, 'employees.manage') && !hasPermission(user.permissions, 'reports.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [attendance, employees] = await Promise.all([
    prisma.attendance.findMany({
      where: { employee: { organizationId: user.organizationId } },
      include: { employee: { include: { department: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.employee.findMany({
      where: { organizationId: user.organizationId, status: 'active' },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
  ]);

  return NextResponse.json({
    data: attendance.map((record) => ({
      id: record.id,
      date: record.date.toISOString().slice(0, 10),
      employee: `${record.employee.firstName} ${record.employee.lastName}`,
      department: record.employee.department?.name || 'General',
      status: record.status.charAt(0).toUpperCase() + record.status.slice(1).toLowerCase(),
    })),
    total: attendance.length,
    options: { employees },
    capabilities: { canManage: hasPermission(user.permissions, 'employees.manage') },
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'employees.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const employeeId = String(body?.employeeId || '').trim();
  const status = String(body?.status || '').trim().toLowerCase();
  const dateValue = String(body?.date || '');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? new Date(`${dateValue}T00:00:00.000Z`) : null;

  if (!employeeId || !['present', 'late', 'absent', 'leave'].includes(status) || !date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateValue) {
    return NextResponse.json({ error: 'Select an employee, a valid attendance status, and a valid date.' }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: user.organizationId },
  });

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found in this organization.' }, { status: 404 });
  }

  const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  const existing = await prisma.attendance.findFirst({
    where: { employeeId, date: { gte: date, lt: nextDay } },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: 'Attendance has already been recorded for this employee and date.' }, { status: 409 });
  }

  const record = await prisma.attendance.create({
    data: {
      employeeId,
      status,
      date,
    },
    include: { employee: { include: { department: true } } },
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'attendance.recorded',
    entityType: 'attendance',
    entityId: record.id,
    details: { employeeId, status, date: dateValue },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: record.id,
      date: record.date.toISOString().slice(0, 10),
      employee: `${record.employee.firstName} ${record.employee.lastName}`,
      department: record.employee.department?.name || 'General',
      status: record.status.charAt(0).toUpperCase() + record.status.slice(1).toLowerCase(),
    },
  });
}
