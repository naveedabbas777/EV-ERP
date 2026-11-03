import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(user.permissions, 'reports.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const entries = await prisma.auditLog.findMany({
    where: { organizationId: user.organizationId },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });

  return NextResponse.json({
    data: entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      user: entry.user?.name || 'System',
      details: entry.details ? JSON.stringify(entry.details) : '{}',
      createdAt: entry.createdAt.toISOString(),
    })),
    total: entries.length,
  });
}
