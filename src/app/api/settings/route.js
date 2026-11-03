import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(user.permissions, 'users.manage') && !hasPermission(user.permissions, 'roles.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [organization, warehouseCount, userCount, roleCount, auditEntries] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: { regions: true },
    }),
    prisma.warehouse.count({ where: { organizationId: user.organizationId } }),
    prisma.user.count({ where: { organizationId: user.organizationId } }),
    prisma.role.count(),
    prisma.auditLog.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: true },
    }),
  ]);

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
  }

  return NextResponse.json({
    organization: {
      name: organization.name,
      regions: organization.regions.map((region) => region.name),
      warehouses: warehouseCount,
      users: userCount,
    },
    security: {
      roles: roleCount,
      permissions: user.permissions.length,
      lastAuditAt: auditEntries[0]?.createdAt.toISOString() || null,
    },
    auditTrail: auditEntries.map((entry) => ({
      action: entry.action,
      entityType: entry.entityType,
      user: entry.user?.name || 'System',
      createdAt: entry.createdAt.toISOString(),
    })),
    user,
  });
}
