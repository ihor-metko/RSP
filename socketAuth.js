/**
 * Socket.IO Authentication Module (CommonJS)
 * 
 * This module provides authentication for Socket.IO connections.
 * It's written in CommonJS to be compatible with server.js.
 */

const { decode } = require('next-auth/jwt');
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

    // Extract organization IDs (all organizations the user belongs to)
    const organizationIds = organizationMemberships.map(m => m.organizationId);

    // Extract club IDs (all clubs the user belongs to)
    const clubIds = clubMemberships.map(m => m.clubId);

    // For organization admins, also include all clubs within their organizations
    // Using string literal to match Prisma enum value (MembershipRole.ORGANIZATION_ADMIN)
    const orgAdminMemberships = organizationMemberships.filter(
      m => m.role === 'ORGANIZATION_ADMIN'
    );

    if (orgAdminMemberships.length > 0) {
      // Get all clubs belonging to organizations where user is an admin
      const orgAdminClubs = await prisma.club.findMany({
        where: {
          organizationId: {
            in: orgAdminMemberships.map(m => m.organizationId),
          },
        },
        select: { id: true },
      });

      // Add these clubs to the user's accessible clubs (avoid duplicates)
      const additionalClubIds = orgAdminClubs.map(c => c.id);
      additionalClubIds.forEach(clubId => {
        if (!clubIds.includes(clubId)) {
          clubIds.push(clubId);
        }
      });
    }

    console.log('[SocketAuth] User authenticated:', {
      userId,
      isRoot,
      organizationCount: organizationIds.length,
      clubCount: clubIds.length,
    });

    return {
      userId,
      isRoot,
      organizationIds,
      clubIds,
    };
  } catch (error) {
    console.error('[SocketAuth] Token verification failed:', error);
    return null;
  }
}

module.exports = {
  verifySocketToken,
};
