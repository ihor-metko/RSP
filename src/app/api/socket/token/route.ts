import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * GET /api/socket/token
 * 
 * Returns the session token for Socket.IO authentication
 * This endpoint is used by the client to get the JWT token needed for socket connection
 */
export async function GET() {
  try {
    // Check if user is authenticated
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the session token from cookies
    const cookieStore = await cookies();
    
    // Try different cookie names based on environment and NextAuth configuration
    const possibleCookieNames = [
      'authjs.session-token',
      'next-auth.session-token',
      '__Secure-authjs.session-token',
      '__Secure-next-auth.session-token',
    ];

    let token: string | undefined;

    for (const cookieName of possibleCookieNames) {
      const cookie = cookieStore.get(cookieName);
      if (cookie) {
        token = cookie.value;
        break;
      }
    }

    if (!token) {
      console.error('[SocketToken] Session token cookie not found');
      return NextResponse.json(
        { error: 'Session token not found' },
        { status: 500 }
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('[SocketToken] Error getting session token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
