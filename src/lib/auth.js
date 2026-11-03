import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { validateRequiredEnv } from '@/lib/security';

export const DEMO_USER = {
  id: 'user-1',
  name: 'Aisha Rahman',
  email: 'admin@evdealer.com',
  role: 'Super Admin',
  organizationId: 'org-1',
  permissions: ['*'],
};

export async function getSessionUser() {
  validateRequiredEnv();

  const cookieStore = await cookies();
  const session = cookieStore.get(process.env.SESSION_COOKIE_NAME || 'ev_session');

  if (!session?.value) {
    return null;
  }

  try {
    const parsed = JSON.parse(session.value);
    if (!parsed || !parsed.id || !parsed.email) {
      return null;
    }

    const dbUser = await prisma.user.findFirst({
      where: {
        id: parsed.id,
        email: parsed.email,
        ...(parsed.organizationId ? { organizationId: parsed.organizationId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        organizationId: true,
        dealerId: true,
        showroomId: true,
        isActive: true,
      },
    });

    if (!dbUser || !dbUser.isActive) {
      return null;
    }

    return {
      ...parsed,
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      organizationId: dbUser.organizationId,
      dealerId: dbUser.dealerId,
      showroomId: dbUser.showroomId,
    };
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

export async function isAuthenticated() {
  return Boolean(await getSessionUser());
}
