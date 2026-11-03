import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSecureCookieOptions } from '@/lib/security';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set('ev_session', '', {
    ...getSecureCookieOptions(),
    maxAge: 0,
  });
  return NextResponse.json({ success: true });
}
