import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authed = isAuthenticated(req);
  return NextResponse.json({
    authenticated: authed,
    user: authed ? { username: process.env.CONTROL_CENTER_USERNAME || 'operator', role: 'Operator' } : null,
  });
}
