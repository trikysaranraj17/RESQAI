import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  db.logAudit({
    actor: 'Operator',
    action: 'OPERATOR_LOGOUT',
    details: 'Operator session terminated cleanly.',
  });

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
