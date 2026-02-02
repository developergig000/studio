import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

// This API route is responsible for setting the session cookie.
// It is called by the AuthProvider on the client-side whenever the user's token changes.
export async function POST(request: NextRequest) {
  const { sessionCookie } = await request.json();
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Session cookie not provided' }, { status: 400 });
  }

  const cookieStore = cookies();
  cookieStore.set('__session', sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // The cookie will be valid for 14 days.
    maxAge: 60 * 60 * 24 * 14,
  });

  return NextResponse.json({ status: 'success' });
}

// This API route is responsible for clearing the session cookie.
// It is called by the AuthProvider on the client-side when the user signs out.
export async function DELETE() {
  const cookieStore = cookies();
  cookieStore.delete('__session');
  return NextResponse.json({ status: 'success' });
}
