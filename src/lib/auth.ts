import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const AUTH_COOKIE_NAME = 'sahel_intel_session';

export function getAuthCredentials() {
  const username = process.env.DASHBOARD_ADMIN_USER || 'admin';
  const password = process.env.DASHBOARD_ADMIN_PASSWORD || 'SahelIntel2026!*';
  return { username, password };
}

function getAuthSecret() {
  return process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'sahel_intel_secret_key_2026';
}

/**
 * Generate a signed session token
 */
export function generateSessionToken(username: string): string {
  const timestamp = Date.now();
  const payload = `${username}:${timestamp}`;
  const signature = crypto.createHmac('sha256', getAuthSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

/**
 * Verify session token validity
 */
export function verifySessionToken(token: string | undefined | null): { valid: boolean; username?: string } {
  if (!token) return { valid: false };

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username, timestampStr, signature] = decoded.split(':');
    
    if (!username || !timestampStr || !signature) return { valid: false };

    const payload = `${username}:${timestampStr}`;
    const expectedSignature = crypto.createHmac('sha256', getAuthSecret()).update(payload).digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false };
    }

    // Session expires after 7 days
    const timestamp = parseInt(timestampStr, 10);
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > maxAge) {
      return { valid: false };
    }

    return { valid: true, username };
  } catch (e) {
    return { valid: false };
  }
}

/**
 * Check if a request has a valid session cookie
 */
export function isAuthenticated(req: NextRequest): boolean {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  return verifySessionToken(token).valid;
}
