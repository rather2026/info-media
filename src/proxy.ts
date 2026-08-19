import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'sahel_intel_session';

// Helper to verify token in Edge/Proxy runtime with subtle crypto
async function isValidToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;
    const [username, timestampStr, signature] = parts;
    if (!username || !timestampStr || !signature) return false;

    // Check expiry (7 days)
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
      return false;
    }

    const payload = `${username}:${timestampStr}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return signature === expectedSignature;
  } catch (e) {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public routes, static assets, and auth APIs
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/cron') || // Cron has its own CRON_SECRET auth
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Check session cookie
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const secret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'sahel_intel_secret_key_2026';

  const authenticated = await isValidToken(token, secret);

  if (!authenticated) {
    // If it's an API request, return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please login.' }, { status: 401 });
    }
    // Otherwise redirect to /login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
