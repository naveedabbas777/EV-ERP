import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getUserPermissionSet } from '@/lib/permissions';
import { loginSchema } from '@/lib/validation';
import { checkRateLimit, getClientIp, getSecureCookieOptions, sanitizeText, validateRequiredEnv } from '@/lib/security';

export async function POST(request) {
  try {
    validateRequiredEnv();

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid login payload.' },
        { status: 400 },
      );
    }

    const email = sanitizeText(parsed.data.email, '').toLowerCase();
    const password = parsed.data.password;
    const rateLimitKey = `login:${email}:${getClientIp(request)}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again shortly.' },
        { status: 429 },
      );
    }

    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        organizationId: true,
        dealerId: true,
        showroomId: true,
        passwordHash: true,
        isActive: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const permissions = await getUserPermissionSet({ id: user.id, email: user.email });

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId,
      dealerId: user.dealerId,
      showroomId: user.showroomId,
      role: user.userRoles?.[0]?.role?.name || 'User',
      permissions,
    };

    const cookieStore = await cookies();
    cookieStore.set('ev_session', JSON.stringify(sessionUser), getSecureCookieOptions());

    return NextResponse.json({ success: true, user: sessionUser });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Unable to process login request.' }, { status: 500 });
  }
}
