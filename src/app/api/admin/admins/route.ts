import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";
import { hash } from "bcryptjs";
import type { UnifiedAdmin, ContainerType, AddAdminPayload, RemoveAdminPayload } from "@/types/unifiedAdmin";

/**
 * GET /api/admin/admins
 * Unified endpoint to fetch admins for any container (organization or club)
 * 
 * Query params:
 * - containerType: "organization" | "club"
 * - containerId: string
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const containerType = searchParams.get("containerType") as ContainerType;
    const containerId = searchParams.get("containerId");

    if (!containerType || !containerId) {
      return NextResponse.json(
        { error: "containerType and containerId are required" },
        { status: 400 }
      );
    }

    if (containerType !== "organization" && containerType !== "club") {
      return NextResponse.json(
        { error: "Invalid containerType. Must be 'organization' or 'club'" },
        { status: 400 }
      );
    }

    const isRoot = session.user.isRoot ?? false;
    let admins: UnifiedAdmin[] = [];

    if (containerType === "organization") {
      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: containerId },
        select: { id: true, name: true },
      });

      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }

      // Check permissions: Root or Organization Admin
      if (!isRoot) {
        const orgMembership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: session.user.id,
              organizationId: containerId,
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

      // Fetch organization admins
      const orgAdmins = await prisma.membership.findMany({
        where: {
          organizationId: containerId,
          role: MembershipRole.ORGANIZATION_ADMIN,
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
          { isPrimaryOwner: "desc" },
          { createdAt: "asc" },
        ],
      });

      admins = orgAdmins.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.isPrimaryOwner ? "ORGANIZATION_OWNER" : "ORGANIZATION_ADMIN",
        containerType: "organization" as const,
        containerId: containerId,
        containerName: organization.name,
        isPrimaryOwner: m.isPrimaryOwner,
        membershipId: m.id,
        createdAt: m.createdAt,
      }));
    } else {
      // containerType === "club"
      // Verify club exists
      const club = await prisma.club.findUnique({
        where: { id: containerId },
        select: { id: true, name: true, organizationId: true },
      });

      if (!club) {
        return NextResponse.json(
          { error: "Club not found" },
          { status: 404 }
        );
      }

      // Check permissions: Root or Organization Admin
      if (!isRoot && club.organizationId) {
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

      // Fetch club admins
      const clubAdmins = await prisma.clubMembership.findMany({
        where: {
          clubId: containerId,
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
        orderBy: { createdAt: "asc" },
      });

      admins = clubAdmins.map((cm) => ({
        id: cm.user.id,
        name: cm.user.name,
        email: cm.user.email,
        role: cm.role === ClubMembershipRole.CLUB_OWNER ? "CLUB_OWNER" : "CLUB_ADMIN",
        containerType: "club" as const,
        containerId: containerId,
        containerName: club.name,
        membershipId: cm.id,
        createdAt: cm.createdAt,
      }));
    }

    return NextResponse.json(admins);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching admins:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/admins
 * Unified endpoint to add an admin to any container (organization or club)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: AddAdminPayload = await request.json();
    const { containerType, containerId, role, userSource, userId, name, email, phone, setAsPrimaryOwner } = body;

    // Validate input
    if (!containerType || !containerId || !role || !userSource) {
      return NextResponse.json(
        { error: "containerType, containerId, role, and userSource are required" },
        { status: 400 }
      );
    }

    if (containerType !== "organization" && containerType !== "club") {
      return NextResponse.json(
        { error: "Invalid containerType. Must be 'organization' or 'club'" },
        { status: 400 }
      );
    }

    const isRoot = session.user.isRoot ?? false;
    let targetUserId: string;

    // Handle user creation or lookup
    if (userSource === "existing") {
      if (!userId) {
        return NextResponse.json(
          { error: "userId is required for existing users" },
          { status: 400 }
        );
      }

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
    } else {
      // userSource === "new"
      if (!name || !email) {
        return NextResponse.json(
          { error: "name and email are required for new users" },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 }
        );
      }

      // Create new user (without password - will be invited)
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
        },
      });

      targetUserId = newUser.id;
    }

    let admin: UnifiedAdmin;

    if (containerType === "organization") {
      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: containerId },
        select: { id: true, name: true },
      });

      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }

      // Check permissions: Root or Organization Admin
      if (!isRoot) {
        const orgMembership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: session.user.id,
              organizationId: containerId,
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

      // Check if user already has membership
      const existingMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: targetUserId,
            organizationId: containerId,
          },
        },
      });

      if (existingMembership && existingMembership.role === MembershipRole.ORGANIZATION_ADMIN) {
        return NextResponse.json(
          { error: "User is already an admin of this organization" },
          { status: 409 }
        );
      }

      // Determine if should be primary owner
      const shouldBePrimaryOwner = role === "ORGANIZATION_OWNER" || setAsPrimaryOwner === true;

      // If setting as primary owner, remove primary owner status from others
      if (shouldBePrimaryOwner) {
        await prisma.membership.updateMany({
          where: {
            organizationId: containerId,
            role: MembershipRole.ORGANIZATION_ADMIN,
            isPrimaryOwner: true,
          },
          data: { isPrimaryOwner: false },
        });
      }

      // Create or update membership
      if (existingMembership) {
        await prisma.membership.update({
          where: { id: existingMembership.id },
          data: {
            role: MembershipRole.ORGANIZATION_ADMIN,
            isPrimaryOwner: shouldBePrimaryOwner,
          },
        });
      } else {
        await prisma.membership.create({
          data: {
            userId: targetUserId,
            organizationId: containerId,
            role: MembershipRole.ORGANIZATION_ADMIN,
            isPrimaryOwner: shouldBePrimaryOwner,
          },
        });
      }

      // Fetch user info
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, email: true },
      });

      admin = {
        id: targetUserId,
        name: user!.name,
        email: user!.email,
        role: shouldBePrimaryOwner ? "ORGANIZATION_OWNER" : "ORGANIZATION_ADMIN",
        containerType: "organization",
        containerId: containerId,
        containerName: organization.name,
        isPrimaryOwner: shouldBePrimaryOwner,
      };
    } else {
      // containerType === "club"
      // Verify club exists
      const club = await prisma.club.findUnique({
        where: { id: containerId },
        select: { id: true, name: true, organizationId: true },
      });

      if (!club) {
        return NextResponse.json(
          { error: "Club not found" },
          { status: 404 }
        );
      }

      // Check permissions: Root or Organization Admin
      if (!isRoot && club.organizationId) {
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

      // Check if user already has club membership
      const existingMembership = await prisma.clubMembership.findUnique({
        where: {
          userId_clubId: {
            userId: targetUserId,
            clubId: containerId,
          },
        },
      });

      if (
        existingMembership &&
        (existingMembership.role === ClubMembershipRole.CLUB_OWNER ||
          existingMembership.role === ClubMembershipRole.CLUB_ADMIN)
      ) {
        return NextResponse.json(
          { error: "User is already an admin of this club" },
          { status: 409 }
        );
      }

      const clubRole = role === "CLUB_OWNER" ? ClubMembershipRole.CLUB_OWNER : ClubMembershipRole.CLUB_ADMIN;

      // Create or update club membership
      if (existingMembership) {
        await prisma.clubMembership.update({
          where: { id: existingMembership.id },
          data: { role: clubRole },
        });
      } else {
        await prisma.clubMembership.create({
          data: {
            userId: targetUserId,
            clubId: containerId,
            role: clubRole,
          },
        });
      }

      // Fetch user info
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, email: true },
      });

      admin = {
        id: targetUserId,
        name: user!.name,
        email: user!.email,
        role: role as "CLUB_OWNER" | "CLUB_ADMIN",
        containerType: "club",
        containerId: containerId,
        containerName: club.name,
      };
    }

    return NextResponse.json({
      success: true,
      message: "Admin added successfully",
      admin,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error adding admin:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/admins
 * Unified endpoint to remove an admin from any container (organization or club)
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: RemoveAdminPayload = await request.json();
    const { containerType, containerId, userId } = body;

    // Validate input
    if (!containerType || !containerId || !userId) {
      return NextResponse.json(
        { error: "containerType, containerId, and userId are required" },
        { status: 400 }
      );
    }

    if (containerType !== "organization" && containerType !== "club") {
      return NextResponse.json(
        { error: "Invalid containerType. Must be 'organization' or 'club'" },
        { status: 400 }
      );
    }

    const isRoot = session.user.isRoot ?? false;

    if (containerType === "organization") {
      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: containerId },
      });

      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }

      // Check permissions: Root or Organization Primary Owner
      if (!isRoot) {
        const currentUserMembership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: session.user.id,
              organizationId: containerId,
            },
          },
        });

        if (
          !currentUserMembership ||
          currentUserMembership.role !== MembershipRole.ORGANIZATION_ADMIN ||
          !currentUserMembership.isPrimaryOwner
        ) {
          return NextResponse.json(
            { error: "Only Root Admin or Organization Owner can remove admins" },
            { status: 403 }
          );
        }

        // Prevent owner from removing themselves
        if (userId === session.user.id) {
          return NextResponse.json(
            { error: "Cannot remove yourself as owner. Transfer ownership first." },
            { status: 400 }
          );
        }
      }

      // Find the membership to remove
      const targetMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: containerId,
          },
        },
      });

      if (!targetMembership || targetMembership.role !== MembershipRole.ORGANIZATION_ADMIN) {
        return NextResponse.json(
          { error: "User is not an admin of this organization" },
          { status: 400 }
        );
      }

      // Check if this is the primary owner
      if (targetMembership.isPrimaryOwner) {
        // Only root admin can remove the primary owner
        if (!isRoot) {
          return NextResponse.json(
            { error: "Only root admin can remove the organization owner" },
            { status: 403 }
          );
        }

        // Count remaining admins
        const adminCount = await prisma.membership.count({
          where: {
            organizationId: containerId,
            role: MembershipRole.ORGANIZATION_ADMIN,
          },
        });

        // Cannot remove primary owner if there are other admins - must transfer ownership first
        if (adminCount > 1) {
          return NextResponse.json(
            { error: "Cannot remove the primary owner. Transfer ownership first." },
            { status: 400 }
          );
        }
      }

      // Delete the membership
      await prisma.membership.delete({
        where: { id: targetMembership.id },
      });
    } else {
      // containerType === "club"
      // Verify club exists
      const club = await prisma.club.findUnique({
        where: { id: containerId },
        select: { id: true, organizationId: true },
      });

      if (!club) {
        return NextResponse.json(
          { error: "Club not found" },
          { status: 404 }
        );
      }

      // Check permissions: Root or Organization Admin
      if (!isRoot && club.organizationId) {
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
            clubId: containerId,
          },
        },
      });

      if (
        !targetMembership ||
        (targetMembership.role !== ClubMembershipRole.CLUB_OWNER &&
          targetMembership.role !== ClubMembershipRole.CLUB_ADMIN)
      ) {
        return NextResponse.json(
          { error: "User is not an admin of this club" },
          { status: 400 }
        );
      }

      // Delete the club membership
      await prisma.clubMembership.delete({
        where: { id: targetMembership.id },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Admin removed successfully",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error removing admin:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
