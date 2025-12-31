import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { MembershipRole, ClubMembershipRole } from '@/constants/roles';

/**
 * Convert string to Uint8Array for jose library
 * Works in both browser and Node.js environments
 */
function stringToUint8Array(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  // Fallback for Node.js environments without TextEncoder
  return new Uint8Array(Buffer.from(str, 'utf-8'));
}

/**
 * Determine the highest role for a user based on their memberships
 */
function determineUserRole(
  isRoot: boolean,
  organizationMemberships: Array<{ role: string }>,
  clubMemberships: Array<{ role: string }>
): string {
  if (isRoot) {
    return 'ROOT_ADMIN';
  }
  
  if (organizationMemberships.some(m => m.role === MembershipRole.ORGANIZATION_ADMIN)) {
    return 'ORGANIZATION_ADMIN';
  }
  
  if (clubMemberships.some(m => m.role === ClubMembershipRole.CLUB_OWNER)) {
    return 'CLUB_OWNER';
  }
  
  if (clubMemberships.some(m => m.role === ClubMembershipRole.CLUB_ADMIN)) {
    return 'CLUB_ADMIN';
  }
  
  return 'PLAYER';
}

/**
 * GET /api/socket/token
 * 
 * Generates a signed JWT (JWS) for Socket.IO authentication
 * This endpoint is used by the client to get a short-lived JWS token for socket connection
 * 
 * Token Format: JWS (signed JWT) using HS256 algorithm
 * Expiration: 10 minutes
 * Payload: userId, role (isRoot), scopes (organization/club IDs)
 */
export async function GET() {
  try {
    // Check if user is authenticated
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const isRoot = session.user.isRoot ?? false;

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

    // If user is an org admin, add all clubs in that organization to their scope
    const orgAdminMemberships = organizationMemberships.filter(
      m => m.role === MembershipRole.ORGANIZATION_ADMIN
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

    // Generate scopes array for socket authorization
    const scopes: string[] = [];
    
    if (isRoot) {
      scopes.push('root_admin');
    }
    
    organizationIds.forEach(orgId => {
      scopes.push(`organization:${orgId}`);
    });
    
    clubIds.forEach(clubId => {
      scopes.push(`club:${clubId}`);
    });

    // Get secret from environment
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('[SocketToken] AUTH_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Determine user's highest role
    const userRole = determineUserRole(isRoot, organizationMemberships, clubMemberships);

    // Create a signed JWT (JWS) using HS256
    const token = await new SignJWT({
      sub: userId,
      role: userRole,
      scopes,
      organizationIds,
      clubIds,
      isRoot,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m') // 10 minutes expiration
      .sign(stringToUint8Array(secret));

    console.log('[SocketToken] Generated JWS token for user:', userId, 'with scopes:', scopes);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('[SocketToken] Error generating socket token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
