/**
 * Socket.IO Authentication Module (CommonJS)
 *
 * This module provides authentication for Socket.IO connections.
 * It's written in CommonJS to be compatible with server.js.
 */

const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Verify JWT token and extract user information
 *
 * @param {string} token - JWT token from socket auth payload
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

    // Dynamically import NextAuth JWT decode function
    const { decode } = await import('next-auth/jwt');

    // Decode the JWT token using NextAuth's decode function
    const decoded = await decode({
      token,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '',
    });

    if (!decoded || !decoded.id) {
      console.error('[SocketAuth] Invalid token: no user ID found');
      return null;
    }

    const userId = decoded.id;
    const isRoot = decoded.isRoot ?? false;

    // Fetch user's organization memberships
    const organizationMemberships = await prisma.membership.findMany({
      where: { userId },
      select: {
        organizationId: true,
        role: true,
      },
    });

    // Fetch user's club memberships
    const clubMemberships = await prisma.clubMembership.findMany({
      where: { userId },
      select: {
        clubId: true,
        role: true,
      },
    });

    const organizationIds = organizationMemberships.map(m => m.organizationId);
    const clubIds = clubMemberships.map(m => m.clubId);

    const orgAdminMemberships = organizationMemberships.filter(
      m => m.role === 'ORGANIZATION_ADMIN'
    );

    if (orgAdminMemberships.length > 0) {
      const orgAdminClubs = await prisma.club.findMany({
        where: {
          organizationId: {
            in: orgAdminMemberships.map(m => m.organizationId),
          },
        },
        select: { id: true },
      });

      orgAdminClubs.forEach(c => {
        if (!clubIds.includes(c.id)) clubIds.push(c.id);
      });
    }

    console.log('[SocketAuth] User authenticated:', {
      userId,
      isRoot,
      organizationCount: organizationIds.length,
      clubCount: clubIds.length,
    });

    return { userId, isRoot, organizationIds, clubIds };
  } catch (error) {
    console.error('[SocketAuth] Token verification failed:', error);
    return null;
  }
}

module.exports = {
  verifySocketToken,
};
