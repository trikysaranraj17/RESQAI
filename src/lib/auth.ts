import { NextRequest } from 'next/server';

export const AUTH_COOKIE_NAME = 'resq_operator_session';

export function verifyCredentials(username?: string, password?: string): boolean {
  const expectedUser = process.env.CONTROL_CENTER_USERNAME || 'operator';
  const expectedPass = process.env.CONTROL_CENTER_PASSWORD || 'resq-command-2026';

  if (!username || !password) return false;
  return username.trim() === expectedUser.trim() && password.trim() === expectedPass.trim();
}

export function isAuthenticated(req: NextRequest): boolean {
  const cookie = req.cookies.get(AUTH_COOKIE_NAME);
  if (!cookie?.value) return false;
  
  // Validate token signature format
  try {
    const decoded = Buffer.from(cookie.value, 'base64').toString('utf-8');
    const [user, timestamp] = decoded.split(':');
    const expectedUser = process.env.CONTROL_CENTER_USERNAME || 'operator';
    
    // Check user and token validity within 12 hours
    const ageMs = Date.now() - parseInt(timestamp, 10);
    return user === expectedUser && ageMs < 12 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  const user = process.env.CONTROL_CENTER_USERNAME || 'operator';
  const timestamp = Date.now().toString();
  return Buffer.from(`${user}:${timestamp}`).toString('base64');
}
