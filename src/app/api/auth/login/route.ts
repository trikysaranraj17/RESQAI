import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, generateSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const isValid = verifyCredentials(username, password);
    if (!isValid) {
      // Intentionally generic error message to prevent enumeration
      return NextResponse.json(
        { success: false, error: 'Invalid credentials. Access denied.' },
        { status: 401 }
      );
    }

    const token = generateSessionToken();

    db.logAudit({
      actor: username || 'Operator',
      action: 'OPERATOR_LOGIN_SUCCESS',
      details: `Operator authenticated successfully into RESQ Control Center.`,
    });

    const response = NextResponse.json({
      success: true,
      user: { username, role: 'Dispatch Lead / Operator', sessionActive: true },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 60 * 60, // 12 hours
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
