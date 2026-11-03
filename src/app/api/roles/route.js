import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'roles.manage') && !hasPermission(user.permissions, 'users.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const roles = await prisma.role.findMany({
    include: { rolePermissions: { include: { permission: true } } },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    data: roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description || 'Administrative access',
      permissions: role.rolePermissions.map((item) => item.permission.key),
    })),
    total: roles.length,
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user.permissions, 'roles.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const name = body?.name?.trim();
  const description = body?.description?.trim() || 'Custom access role';
  const permissions = Array.isArray(body?.permissions) ? body.permissions : [];

  if (!name) {
    return NextResponse.json({ error: 'Role name is required.' }, { status: 400 });
  }

  const role = await prisma.role.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  });

  for (const permissionKey of permissions) {
    const permission = await prisma.permission.upsert({
      where: { key: permissionKey },
      update: {},
      create: { key: permissionKey, description: permissionKey },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });
  }

  const refreshedRole = await prisma.role.findUnique({
    where: { id: role.id },
    include: { rolePermissions: { include: { permission: true } } },
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'role.updated',
    entityType: 'role',
    entityId: refreshedRole.id,
    details: {
      roleName: refreshedRole.name,
      permissions,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: refreshedRole.id,
      name: refreshedRole.name,
      description: refreshedRole.description,
      permissions: refreshedRole.rolePermissions.map((item) => item.permission.key),
    },
  });
}
