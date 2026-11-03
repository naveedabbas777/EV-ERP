import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'EV ERP API is healthy.',
    timestamp: new Date().toISOString(),
  });
}
