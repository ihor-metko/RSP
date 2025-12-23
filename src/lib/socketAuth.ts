import { decode } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { MembershipRole } from '@/constants/roles';

/**
 * User socket authentication data
 * Attached to each socket connection after successful authentication
 */
export interface SocketUserData {
  userId: string;
  isRoot: boolean;
  organizationIds: string[];
  clubIds: string[];
}

/**
 * Verify JWT token and extract user information
 * 
 * @param token - JWT token from socket auth payload
 * @returns User data if token is valid, null otherwise
 */
export async function verifySocketToken(token: string): Promise<SocketUserData | null> {
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

    // Decode the JWT token using NextAuth's decode function
    const decoded = await decode({
      token,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '',
    });

    if (!decoded || !decoded.id) {
      console.error('[SocketAuth] Invalid token: no user ID found');
      return null;
    }

    const userId = decoded.id as string;
    const isRoot = (decoded.isRoot as boolean) ?? false;

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
    const orgAdminMemberships = organizationMemberships.filter(
      m => m.role === MembershipRole.ORGANIZATION_ADMIN
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
