import { prisma } from '@/lib/prisma';

export async function logAuditEvent({ user, organizationId, action, entityType, entityId, details = {} }) {
  if (!organizationId || !action || !entityType) {
    return null;
  }

  return prisma.auditLog.create({
    data: {
      organizationId,
      userId: user?.id || null,
      action,
      entityType,
      entityId: entityId || null,
      details,
    },
  });
}
