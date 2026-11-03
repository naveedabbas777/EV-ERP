import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validation';
import { checkRateLimit, getClientIp, sanitizeText, validateRequiredEnv } from '@/lib/security';

export async function POST(request) {
  try {
    validateRequiredEnv();

    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid email address.' },
        { status: 400 },
      );
    }

    const email = sanitizeText(parsed.data.email, '').toLowerCase();
    const rateLimit = checkRateLimit(`forgot-password:${email}:${getClientIp(request)}`, 3, 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many reset requests. Please wait a moment and try again.' },
        { status: 429 },
      );
    }

    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If that account exists, a reset link has been sent to the email address.',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);
    const currentAttributes = user.attributes && typeof user.attributes === 'object' ? user.attributes : {};

    await prisma.user.update({
      where: { id: user.id },
      data: {
        attributes: {
          ...currentAttributes,
          passwordResetToken: token,
          passwordResetExpires: expiresAt.toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'If that account exists, a reset link has been sent to the email address.',
      ...(process.env.NODE_ENV !== 'production' ? { token } : {}),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Unable to process password reset request.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid password reset payload.' },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const token = parsed.data.token.trim();
    const password = parsed.data.password;

    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
    }

    const attributes = user.attributes && typeof user.attributes === 'object' ? user.attributes : {};
    const resetToken = attributes.passwordResetToken;
    const resetExpiresAt = attributes.passwordResetExpires ? new Date(attributes.passwordResetExpires) : null;

    if (!resetToken || resetToken !== token || !resetExpiresAt || resetExpiresAt <= new Date()) {
      return NextResponse.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        attributes: {
          ...attributes,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Unable to reset the password.' }, { status: 500 });
  }
}
