/**
 * Socket.IO Authentication Module (CommonJS)
 *
 * This module provides authentication for Socket.IO connections.
 * It's written in CommonJS to be compatible with server.js.
 *
 * Token Format: JWS (signed JWT) using HS256 algorithm
 * Verification: Uses jose library's jwtVerify function
 */

let jose;

async function getJose() {
  if (!jose) {
    jose = await import('jose');
  }
  return jose;
}

/**
 * Convert string to Uint8Array for jose library
 * Works in both browser and Node.js environments
 */
function stringToUint8Array(str) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  // Fallback for Node.js environments without TextEncoder
  return new Uint8Array(Buffer.from(str, 'utf-8'));
}

/**
 * Verify JWT token (JWS) and extract user information
 *
 * @param {string} token - JWS token from socket auth payload
 * @returns {Promise<Object|null>} User data if token is valid, null otherwise
 */
async function verifySocketToken(token) {
  try {
    // Validate token type - must be a non-empty string
    if (!token || typeof token !== 'string') {
      console.error('[SocketAuth] Invalid token type:', typeof token);
      return null;
    }

    // Ensure token is not just whitespace
    if (token.trim() === '') {
      console.error('[SocketAuth] Token is empty or whitespace');
      return null;
    }

    // Get secret from environment
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('[SocketAuth] AUTH_SECRET not configured');
      return null;
    }

    // Verify the JWS token using jose
    const { jwtVerify } = await getJose();
    const { payload } = await jwtVerify(
      token,
      stringToUint8Array(secret),
      {
        algorithms: ['HS256'], // Only accept HS256 algorithm
      }
    );

    // Extract user data from verified payload
    const userId = payload.sub;
    const isRoot = payload.isRoot ?? false;
    const organizationIds = payload.organizationIds || [];
    const clubIds = payload.clubIds || [];

    if (!userId) {
      console.error('[SocketAuth] Invalid token: no user ID found in payload');
      return null;
    }

    console.log('[SocketAuth] User authenticated:', {
      userId,
      isRoot,
      organizationCount: organizationIds.length,
      clubCount: clubIds.length,
    });

    return { userId, isRoot, organizationIds, clubIds };
  } catch (error) {
    console.error('[SocketAuth] Token verification failed:', error.message || error);
    return null;
  }
}

module.exports = {
  verifySocketToken,
};
