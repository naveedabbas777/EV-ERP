import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessShowroom, getShowroomScope, hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'employees.manage') && !hasPermission(user.permissions, 'reports.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [employees, showrooms] = await Promise.all([
    prisma.employee.findMany({
      where: {
        organizationId: user.organizationId,
        ...(user.dealerId ? { showroom: { is: getShowroomScope(user) } } : {}),
      },
      include: {
        department: true,
        region: true,
        showroom: true,
        attendances: {
          where: { date: { gte: monthStart } },
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.showroom.findMany({
      where: { organizationId: user.organizationId, status: 'active', ...getShowroomScope(user) },
      select: { id: true, name: true, code: true, dealerId: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return NextResponse.json({
    data: employees.map((employee) => ({
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      role: employee.designation || 'Operations',
      location: employee.region?.name || 'Unassigned',
      showroom: employee.showroom?.name || 'Unassigned',
      attendance: employee.attendances.length
        ? `${employee.attendances.filter((record) => ['present', 'late'].includes(record.status.toLowerCase())).length}/${employee.attendances.length} recorded days`
        : 'No records this month',
      status: employee.status,
    })),
    total: employees.length,
    options: { showrooms },
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
  const firstName = String(body?.firstName || '').trim();
  const lastName = String(body?.lastName || '').trim();
  const employeeCode = String(body?.employeeCode || '').trim();
  const designation = String(body?.designation || '').trim() || 'Operations';
  const regionId = String(body?.regionId || '').trim();
  const showroomId = String(body?.showroomId || '').trim();

  if (!firstName || !lastName || !employeeCode) {
    return NextResponse.json({ error: 'First name, last name and employee code are required.' }, { status: 400 });
  }

  const existing = await prisma.employee.findUnique({
    where: { employeeCode },
  });

  if (existing) {
    return NextResponse.json({ error: 'Employee code already exists.' }, { status: 409 });
  }

  if (regionId) {
    const region = await prisma.region.findFirst({
      where: { id: regionId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!region) {
      return NextResponse.json({ error: 'Region not found in this organization.' }, { status: 404 });
    }
  }

  if (showroomId) {
    const showroom = await prisma.showroom.findFirst({
      where: { id: showroomId, organizationId: user.organizationId, status: 'active' },
      select: { id: true, dealerId: true },
    });
    if (!showroom || !canAccessShowroom(user, showroom)) {
      return NextResponse.json({ error: 'Showroom not found in this organization.' }, { status: 404 });
    }
  }

  const baseSalary = Number(body?.baseSalary ?? 0);
  if (!Number.isFinite(baseSalary) || baseSalary < 0) {
    return NextResponse.json({ error: 'Base salary must be a non-negative amount.' }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: {
      organizationId: user.organizationId,
      employeeCode,
      firstName,
      lastName,
      designation,
      regionId: regionId || null,
      showroomId: showroomId || null,
      status: 'active',
      email: String(body?.email || '').trim() || null,
      phone: String(body?.phone || '').trim() || null,
      baseSalary,
    },
    include: { region: true, showroom: true },
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'employee.created',
    entityType: 'employee',
    entityId: employee.id,
    details: { employeeCode, designation },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      role: employee.designation || 'Operations',
      location: employee.region?.name || 'Unassigned',
      showroom: employee.showroom?.name || 'Unassigned',
      attendance: 'No records this month',
      status: employee.status,
    },
  });
}
