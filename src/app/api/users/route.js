import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';

async function findUserRoleForOrganization(userId, organizationId) {
  return prisma.userRole.findFirst({
    where: { userId, user: { organizationId } },
    include: { role: true },
  });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManageUsers = hasPermission(user.permissions, 'users.manage') || hasPermission(user.permissions, 'roles.manage');
  const canManageStaff = hasPermission(user.permissions, 'showrooms.staff.manage');
  if (!canManageUsers && !canManageStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [users, dealers, showrooms] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: user.organizationId, ...(user.dealerId ? { dealerId: user.dealerId } : {}) },
      include: {
        userRoles: {
          include: { role: true },
        },
        showroom: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    canManageUsers && !user.dealerId
      ? prisma.dealer.findMany({
        where: { organizationId: user.organizationId, status: 'active' },
        select: { id: true, name: true, registrationNumber: true },
        orderBy: { name: 'asc' },
      })
      : Promise.resolve([]),
    prisma.showroom.findMany({
      where: { organizationId: user.organizationId, status: 'active', ...(user.dealerId ? { dealerId: user.dealerId } : {}) },
      select: { id: true, dealerId: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return NextResponse.json({
    data: users.map((record) => ({
      id: record.id,
      name: record.name,
      email: record.email,
      role: record.userRoles[0]?.role?.name || 'Dealer User',
      status: record.isActive ? 'Active' : 'Inactive',
      attributes: record.attributes || {},
      dealerId: record.dealerId,
      showroomId: record.showroomId,
      showroom: record.showroom,
      createdAt: record.createdAt.toISOString(),
    })),
    total: users.length,
    options: { dealers, showrooms, dealerId: user.dealerId || null },
    capabilities: { canManageUsers, canManageStaff },
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManageUsers = hasPermission(user.permissions, 'users.manage');
  const canManageStaff = hasPermission(user.permissions, 'showrooms.staff.manage');
  if (!canManageUsers && !canManageStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;
  const roleName = body?.roleName?.trim() || 'Dealer User';
  const status = body?.status === 'Inactive' ? false : true;
  const dealerId = user.dealerId || String(body?.dealerId || '').trim() || null;
  const showroomId = String(body?.showroomId || '').trim() || null;

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { organizationId_email: { organizationId: user.organizationId, email } },
  });

  if (existingUser) {
    return NextResponse.json({ error: 'User already exists in this organization.' }, { status: 409 });
  }

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    return NextResponse.json({ error: `Role "${roleName}" was not found.` }, { status: 404 });
  }

  if (canManageStaff && !canManageUsers && roleName !== 'Showroom Staff') {
    return NextResponse.json({ error: 'Dealer admins can create showroom staff accounts only.' }, { status: 403 });
  }
  if ((roleName === 'Dealer Admin' || roleName === 'Showroom Staff') && !dealerId) {
    return NextResponse.json({ error: 'A dealer must be assigned to dealer and showroom accounts.' }, { status: 400 });
  }
  if (roleName === 'Dealer Admin' && showroomId) {
    return NextResponse.json({ error: 'Dealer Admin accounts manage all showrooms and cannot be restricted to one showroom.' }, { status: 400 });
  }
  if (roleName === 'Showroom Staff' && !showroomId) {
    return NextResponse.json({ error: 'Select the showroom this staff account can access.' }, { status: 400 });
  }
  if (roleName !== 'Dealer Admin' && roleName !== 'Showroom Staff' && (dealerId || showroomId)) {
    return NextResponse.json({ error: 'Only dealer and showroom roles can be assigned to a dealer or showroom.' }, { status: 400 });
  }
  if (dealerId && roleName === 'Dealer Admin') {
    const dealer = await prisma.dealer.findFirst({ where: { id: dealerId, organizationId: user.organizationId } });
    if (!dealer || (user.dealerId && dealer.id !== user.dealerId)) {
      return NextResponse.json({ error: 'Dealer not found in your organization.' }, { status: 404 });
    }
  }
  if (showroomId) {
    const showroom = await prisma.showroom.findFirst({
      where: { id: showroomId, organizationId: user.organizationId, dealerId },
      select: { id: true },
    });
    if (!showroom || (user.showroomId && showroom.id !== user.showroomId)) {
      return NextResponse.json({ error: 'Showroom not found for the selected dealer.' }, { status: 404 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const createdUser = await prisma.user.create({
    data: {
      organizationId: user.organizationId,
      name,
      email,
      passwordHash,
      isActive: status,
      dealerId,
      showroomId,
      attributes: dealerId ? {} : { region: 'all' },
      userRoles: {
        create: [{ roleId: role.id }],
      },
    },
    include: {
      userRoles: { include: { role: true } },
    },
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'user.created',
    entityType: 'user',
    entityId: createdUser.id,
    details: {
      email,
      roleName,
      createdBy: user.name,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.userRoles[0]?.role?.name || roleName,
      status: createdUser.isActive ? 'Active' : 'Inactive',
      dealerId: createdUser.dealerId,
      showroomId: createdUser.showroomId,
    },
  });
}

export async function PATCH(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManageUsers = hasPermission(user.permissions, 'users.manage');
  const canManageStaff = hasPermission(user.permissions, 'showrooms.staff.manage');
  if (!canManageUsers && !canManageStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const targetId = body?.id;
  if (!targetId) {
    return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetId,
      organizationId: user.organizationId,
      ...(user.dealerId ? { dealerId: user.dealerId } : {}),
      ...(canManageStaff && !canManageUsers ? { NOT: { id: user.id } } : {}),
    },
    include: { userRoles: { include: { role: true } } },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found in this organization.' }, { status: 404 });
  }

  const nextName = body?.name?.trim() || targetUser.name;
  const nextEmail = body?.email?.trim().toLowerCase() || targetUser.email;
  const nextStatus = body?.status === 'Inactive' ? false : body?.isActive === false ? false : Boolean(body?.isActive ?? targetUser.isActive);
  const nextRoleName = body?.roleName?.trim() || (targetUser.userRoles[0]?.roleId ? await prisma.role.findUnique({ where: { id: targetUser.userRoles[0].roleId } }).then((role) => role?.name) : 'Dealer User');
  const nextDealerId = user.dealerId || (Object.hasOwn(body || {}, 'dealerId') ? String(body.dealerId || '').trim() || null : targetUser.dealerId);
  const nextShowroomId = Object.hasOwn(body || {}, 'showroomId') ? String(body.showroomId || '').trim() || null : targetUser.showroomId;
  const currentRoleName = targetUser.userRoles[0]?.role?.name || 'Dealer User';

  if (canManageStaff && !canManageUsers && (currentRoleName !== 'Showroom Staff' || nextRoleName !== 'Showroom Staff')) {
    return NextResponse.json({ error: 'Dealer admins can manage showroom staff accounts only.' }, { status: 403 });
  }
  if ((nextRoleName === 'Dealer Admin' || nextRoleName === 'Showroom Staff') && !nextDealerId) {
    return NextResponse.json({ error: 'A dealer must be assigned to dealer and showroom accounts.' }, { status: 400 });
  }
  if (nextRoleName === 'Dealer Admin' && nextShowroomId) {
    return NextResponse.json({ error: 'Dealer Admin accounts manage all showrooms and cannot be restricted to one showroom.' }, { status: 400 });
  }
  if (nextRoleName === 'Showroom Staff' && !nextShowroomId) {
    return NextResponse.json({ error: 'Select the showroom this staff account can access.' }, { status: 400 });
  }
  if (nextRoleName !== 'Dealer Admin' && nextRoleName !== 'Showroom Staff' && (nextDealerId || nextShowroomId)) {
    return NextResponse.json({ error: 'Only dealer and showroom roles can be assigned to a dealer or showroom.' }, { status: 400 });
  }
  if (nextDealerId && nextRoleName === 'Dealer Admin') {
    const dealer = await prisma.dealer.findFirst({ where: { id: nextDealerId, organizationId: user.organizationId } });
    if (!dealer || (user.dealerId && dealer.id !== user.dealerId)) {
      return NextResponse.json({ error: 'Dealer not found in your organization.' }, { status: 404 });
    }
  }
  if (nextShowroomId) {
    const showroom = await prisma.showroom.findFirst({
      where: { id: nextShowroomId, organizationId: user.organizationId, dealerId: nextDealerId },
      select: { id: true },
    });
    if (!showroom || (user.showroomId && showroom.id !== user.showroomId)) {
      return NextResponse.json({ error: 'Showroom not found for the selected dealer.' }, { status: 404 });
    }
  }

  if (nextEmail !== targetUser.email) {
    const duplicate = await prisma.user.findUnique({
      where: { organizationId_email: { organizationId: user.organizationId, email: nextEmail } },
    });

    if (duplicate && duplicate.id !== targetId) {
      return NextResponse.json({ error: 'A user with this email already exists in this organization.' }, { status: 409 });
    }
  }

  const role = await prisma.role.findUnique({ where: { name: nextRoleName } });
  if (!role) {
    return NextResponse.json({ error: `Role "${nextRoleName}" was not found.` }, { status: 404 });
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetId },
      data: {
        name: nextName,
        email: nextEmail,
        isActive: nextStatus,
        dealerId: nextDealerId,
        showroomId: nextShowroomId,
        ...(body?.password ? { passwordHash: await bcrypt.hash(body.password, 10) } : {}),
      },
    });

    const existingRoleLink = await tx.userRole.findFirst({
      where: { userId: targetId },
    });

    if (existingRoleLink) {
      await tx.userRole.update({
        where: { id: existingRoleLink.id },
        data: { roleId: role.id },
      });
    } else {
      await tx.userRole.create({
        data: { userId: targetId, roleId: role.id },
      });
    }

    return updated;
  });

  const refreshed = await prisma.user.findUnique({
    where: { id: targetId },
    include: { userRoles: { include: { role: true } } },
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'user.updated',
    entityType: 'user',
    entityId: targetId,
    details: {
      email: refreshed.email,
      roleName: nextRoleName,
      status: refreshed.isActive ? 'Active' : 'Inactive',
      dealerId: refreshed.dealerId,
      showroomId: refreshed.showroomId,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: refreshed.id,
      name: refreshed.name,
      email: refreshed.email,
      role: refreshed.userRoles[0]?.role?.name || nextRoleName,
      status: refreshed.isActive ? 'Active' : 'Inactive',
    },
  });
}
