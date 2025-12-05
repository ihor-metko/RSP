import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubAdminManagement, isValidEmail } from "@/lib/requireRole";
import { ClubMembershipRole } from "@/constants/roles";

/**
 * GET /api/orgs/[orgId]/club-admins
 * List all club admins for an organization with their assigned clubs.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    const authResult = await requireClubAdminManagement(orgId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get all clubs in the organization
    const clubs = await prisma.club.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });

    // Early return if no clubs exist - no need to query club memberships
    if (clubs.length === 0) {
      return NextResponse.json([]);
    }

    const clubIds = clubs.map((c) => c.id);

    // Get all club admins for clubs in this organization
    const clubMemberships = await prisma.clubMembership.findMany({
      where: {
        clubId: { in: clubIds },
        role: ClubMembershipRole.CLUB_ADMIN,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format the response
    const clubAdmins = clubMemberships.map((m) => ({
      id: m.id,
      userId: m.user.id,
      userName: m.user.name,
      userEmail: m.user.email,
      clubId: m.club.id,
      clubName: m.club.name,
      createdAt: m.createdAt,
    }));

    return NextResponse.json(clubAdmins);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching club admins:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[orgId]/club-admins
 * Assign an existing user or create a new user as CLUB_ADMIN for a specific club.
 * Payload: { userId?; email?; name?; clubId }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    const authResult = await requireClubAdminManagement(orgId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body = await request.json();
    const { userId, email, name, clubId } = body;

    if (!clubId) {
      return NextResponse.json(
        { error: "Club ID is required" },
        { status: 400 }
      );
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Verify club exists and belongs to this organization
    const club = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    if (club.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Club does not belong to this organization" },
        { status: 403 }
      );
    }

    let targetUserId: string;

    if (userId) {
      // Use existing user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      targetUserId = userId;
    } else if (email) {
      // Create a new user or use existing user by email
      const emailLower = email.toLowerCase().trim();

      // Validate email format
      if (!isValidEmail(emailLower)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: emailLower },
      });

      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        // Create a new user (invite flow - they will need to set password later)
        if (!name || typeof name !== "string" || name.trim().length === 0) {
          return NextResponse.json(
            { error: "Name is required for new user" },
            { status: 400 }
          );
        }

        const newUser = await prisma.user.create({
          data: {
            name: name.trim(),
            email: emailLower,
            // No password - user will need to go through password reset/invite flow
          },
        });

        targetUserId = newUser.id;
      }
    } else {
      return NextResponse.json(
        { error: "Either userId or email is required" },
        { status: 400 }
      );
    }

    // Check if user is already a CLUB_ADMIN for this club
    const existingMembership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId: targetUserId,
          clubId,
        },
      },
    });

    if (existingMembership && existingMembership.role === ClubMembershipRole.CLUB_ADMIN) {
      return NextResponse.json(
        { error: "User is already a Club Admin of this club" },
        { status: 409 }
      );
    }

    // Create or update the club membership
    let clubMembership;
    if (existingMembership) {
      // Update existing membership to CLUB_ADMIN
      clubMembership = await prisma.clubMembership.update({
        where: { id: existingMembership.id },
        data: { role: ClubMembershipRole.CLUB_ADMIN },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          club: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } else {
      // Create new membership as CLUB_ADMIN
      clubMembership = await prisma.clubMembership.create({
        data: {
          userId: targetUserId,
          clubId,
          role: ClubMembershipRole.CLUB_ADMIN,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          club: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Club Admin assigned successfully",
        clubAdmin: {
          id: clubMembership.id,
          userId: clubMembership.user.id,
          userName: clubMembership.user.name,
          userEmail: clubMembership.user.email,
          clubId: clubMembership.club.id,
          clubName: clubMembership.club.name,
          createdAt: clubMembership.createdAt,
        },
      },
      { status: existingMembership ? 200 : 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error assigning club admin:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
