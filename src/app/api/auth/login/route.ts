import { NextRequest, NextResponse } from 'next/server';
import { getAuthCredentials, generateSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, password } = body;

    const credentials = getAuthCredentials();

    if (
      !username ||
      !password ||
      username.trim() !== credentials.username ||
      password !== credentials.password
    ) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة (Identifiants invalides)' },
        { status: 401 }
      );
    }

    const token = generateSessionToken(credentials.username);

    const response = NextResponse.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: { username: credentials.username },
    });

    // Set HttpOnly secure cookie for 7 days
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
