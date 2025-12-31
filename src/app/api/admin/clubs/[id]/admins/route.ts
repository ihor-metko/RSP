import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ClubMembershipRole, MembershipRole } from "@/constants/roles";
import { hash } from "bcryptjs";

/**
 * Helper function to check if a user has Club Owner or Club Admin role
 */
async function hasClubAdminAccess(userId: string, clubId: string): Promise<boolean> {
  const clubMembership = await prisma.clubMembership.findUnique({
    where: {
      userId_clubId: {
        userId,
        clubId,
      },
    },
  });

  return clubMembership !== null && 
    (clubMembership.role === ClubMembershipRole.CLUB_OWNER || 
     clubMembership.role === ClubMembershipRole.CLUB_ADMIN);
}

/**
 * GET /api/admin/clubs/[id]/admins
 * Returns list of Club Admins for a specific club.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // Verify club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, name: true, organizationId: true },
    });

    if (!club) {
      return NextResponse.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    const isRoot = session.user.isRoot ?? false;

    // Check if user has permission for READ access
    // Allowed: Root Admin, Organization Admin, Club Owner, Club Admin
    if (!isRoot) {
      // First check if user is an Organization Admin for this club's organization
      if (club.organizationId) {
        const orgMembership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: session.user.id,
              organizationId: club.organizationId,
            },
          },
        });

        // If user is Organization Admin, allow access
        if (orgMembership?.role === MembershipRole.ORGANIZATION_ADMIN) {
          // Authorized - continue to fetch admins
        } else {
          // Check if user is a Club Owner or Club Admin for this club
          const hasAccess = await hasClubAdminAccess(session.user.id, clubId);
          if (!hasAccess) {
            return NextResponse.json(
              { error: "Forbidden" },
              { status: 403 }
            );
          }
        }
      } else {
        // No organization - check club membership only
        const hasAccess = await hasClubAdminAccess(session.user.id, clubId);
        if (!hasAccess) {
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
          );
        }
      }
    }

    const clubAdmins = await prisma.clubMembership.findMany({
      where: {
        clubId,
        role: {
          in: [ClubMembershipRole.CLUB_OWNER, ClubMembershipRole.CLUB_ADMIN],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // CLUB_OWNER before CLUB_ADMIN
        { createdAt: "asc" }
      ],
    });

    const formattedAdmins = clubAdmins.map((cm) => ({
      id: cm.user.id,
      name: cm.user.name,
      email: cm.user.email,
      role: cm.role === ClubMembershipRole.CLUB_OWNER ? ("owner" as const) : ("admin" as const),
      entity: {
        type: "club" as const,
        id: clubId,
        name: club.name,
      },
      membershipId: cm.id,
    }));

    return NextResponse.json(formattedAdmins);
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
 * POST /api/admin/clubs/[id]/admins
 * Adds a Club Admin to a specific club.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    const body = await request.json();
    const { userId, createNew, name, email, password } = body;

    // Verify club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, name: true, organizationId: true },
    });

    if (!club) {
      return NextResponse.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    const isRoot = session.user.isRoot ?? false;

    // Check if user has permission for WRITE access (Root or Organization Admin only)
    if (!isRoot) {
      if (!club.organizationId) {
        // Club has no organization - only root admin can modify
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }

      const orgMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: club.organizationId,
          },
        },
      });

      if (!orgMembership || orgMembership.role !== MembershipRole.ORGANIZATION_ADMIN) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    let targetUserId: string;

    if (createNew) {
      // Create a new user as Club Admin
      if (!name || !email || !password) {
        return NextResponse.json(
          { error: "Name, email, and password are required for new user" },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 }
        );
      }

      // Validate password length
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }

      // Create the new user
      const hashedPassword = await hash(password, 12);
      const newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase(),
          password: hashedPassword,
        },
      });

      targetUserId = newUser.id;
    } else {
      // Use existing user
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 }
        );
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      targetUserId = userId;
    }

    // Check if already assigned to this club as CLUB_ADMIN
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

    if (existingMembership) {
      // Update existing membership to CLUB_ADMIN
      await prisma.clubMembership.update({
        where: { id: existingMembership.id },
        data: { role: ClubMembershipRole.CLUB_ADMIN },
      });
    } else {
      // Create new membership
      await prisma.clubMembership.create({
        data: {
          userId: targetUserId,
          clubId,
          role: ClubMembershipRole.CLUB_ADMIN,
        },
      });
    }

    // Fetch the updated user info
    const assignedUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Club Admin assigned successfully",
        admin: {
          id: assignedUser!.id,
          name: assignedUser!.name,
          email: assignedUser!.email,
          role: "admin" as const,
          entity: {
            type: "club" as const,
            id: clubId,
            name: club.name,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error assigning Club Admin:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/clubs/[id]/admins
 * Removes a Club Admin from a specific club.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, organizationId: true },
    });

    if (!club) {
      return NextResponse.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    const isRoot = session.user.isRoot ?? false;

    // Check if user has permission for WRITE access (Root or Organization Admin only)
    if (!isRoot) {
      if (!club.organizationId) {
        // Club has no organization - only root admin can modify
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }

      const orgMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: club.organizationId,
          },
        },
      });

      if (!orgMembership || orgMembership.role !== MembershipRole.ORGANIZATION_ADMIN) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    // Find the membership to remove
    const targetMembership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
    });

    if (!targetMembership?.role || 
        ![ClubMembershipRole.CLUB_ADMIN, ClubMembershipRole.CLUB_OWNER].includes(targetMembership.role as ClubMembershipRole)) {
      return NextResponse.json(
        { error: "User is not a Club Admin of this club" },
        { status: 400 }
      );
    }

    // Prevent club owner from removing themselves
    if (targetMembership.role === ClubMembershipRole.CLUB_OWNER && userId === session.user.id) {
      return NextResponse.json(
        { error: "Club owners cannot remove themselves" },
        { status: 400 }
      );
    }

    // Delete the membership
    await prisma.clubMembership.delete({
      where: { id: targetMembership.id },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Club Admin removed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error removing Club Admin:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
