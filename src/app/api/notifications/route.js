import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jsonError, jsonSuccess } from '@/lib/api-response';

export async function GET(request) {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(NextResponse, 'Unauthorized', 401);
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';

  const where = {
    organizationId: user.organizationId,
    userId: user.id,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.notification.count({
      where: {
        organizationId: user.organizationId,
        userId: user.id,
        readAt: null,
      },
    }),
  ]);

  return jsonSuccess(NextResponse, {
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      read: Boolean(item.readAt),
      createdAt: item.createdAt.toISOString(),
    })),
    unreadCount,
    total: items.length,
  });
}

export async function PATCH(request) {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(NextResponse, 'Unauthorized', 401);
  }

  const payload = await request.json().catch(() => ({}));
  const ids = Array.isArray(payload?.ids) ? payload.ids.filter(Boolean) : [];

  if (!ids.length) {
    return jsonError(NextResponse, 'No notification IDs were provided.', 400);
  }

  await prisma.notification.updateMany({
    where: {
      id: { in: ids },
      organizationId: user.organizationId,
      userId: user.id,
    },
    data: {
      readAt: new Date(),
    },
  });

  return jsonSuccess(NextResponse, { updated: ids.length }, { message: 'Notifications marked as read.' });
}
