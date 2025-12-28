import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireRootAdmin } from "@/lib/requireRole";
import { MembershipRole } from "@/constants/roles";
import { hash } from "bcryptjs";

/**
 * GET /api/admin/organizations/[id]/admins
 * Returns list of admins for a specific organization.
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
    const organizationId = resolvedParams.id;

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const isRoot = session.user.isRoot ?? false;

    // Check if user has permission (Root or Organization Admin)
    if (!isRoot) {
      const orgMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId,
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

    const admins = await prisma.membership.findMany({
      where: {
        organizationId,
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
      orderBy: [{ isPrimaryOwner: "desc" }, { createdAt: "asc" }],
    });

    const formattedAdmins = admins.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.isPrimaryOwner ? ("owner" as const) : ("admin" as const),
      entity: {
        type: "organization" as const,
        id: organizationId,
        name: organization.name,
      },
      membershipId: m.id,
    }));

    return NextResponse.json(formattedAdmins);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching organization admins:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/organizations/[id]/admins
 * Adds an admin to a specific organization.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const organizationId = resolvedParams.id;

    const body = await request.json();
    const { userId, createNew, name, email, password } = body;
    const setAsPrimaryOwner = body.setAsPrimaryOwner === true;

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    let targetUserId: string;

    if (createNew) {
      // Create a new user as admin
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

    // Check if already assigned to this organization as ORGANIZATION_ADMIN
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId,
        },
      },
    });

    if (existingMembership && existingMembership.role === MembershipRole.ORGANIZATION_ADMIN) {
      return NextResponse.json(
        { error: "User is already an admin of this organization" },
        { status: 409 }
      );
    }

    // Check if there are existing admins for this organization
    const existingAdminsCount = await prisma.membership.count({
      where: {
        organizationId,
        role: MembershipRole.ORGANIZATION_ADMIN,
      },
    });

    // First admin becomes primary owner by default
    const shouldBePrimaryOwner = existingAdminsCount === 0 || setAsPrimaryOwner === true;

    // If setting as primary owner, remove primary owner status from others
    if (shouldBePrimaryOwner && existingAdminsCount > 0) {
      await prisma.membership.updateMany({
        where: {
          organizationId,
          role: MembershipRole.ORGANIZATION_ADMIN,
          isPrimaryOwner: true,
        },
        data: { isPrimaryOwner: false },
      });
    }

    let membershipId: string;

    if (existingMembership) {
      // Update existing membership to ORGANIZATION_ADMIN
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: { 
          role: MembershipRole.ORGANIZATION_ADMIN,
          isPrimaryOwner: shouldBePrimaryOwner,
        },
      });
      membershipId = existingMembership.id;
    } else {
      // Create new membership
      const newMembership = await prisma.membership.create({
        data: {
          userId: targetUserId,
          organizationId,
          role: MembershipRole.ORGANIZATION_ADMIN,
          isPrimaryOwner: shouldBePrimaryOwner,
        },
      });
      membershipId = newMembership.id;
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
        message: "Admin assigned successfully",
        admin: {
          id: assignedUser!.id,
          name: assignedUser!.name,
          email: assignedUser!.email,
          role: shouldBePrimaryOwner ? ("owner" as const) : ("admin" as const),
          entity: {
            type: "organization" as const,
            id: organizationId,
            name: organization.name,
          },
          membershipId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error assigning admin:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/organizations/[id]/admins
 * Removes an admin from a specific organization.
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
    const organizationId = resolvedParams.id;

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const isRoot = session.user.isRoot ?? false;

    // If not root, check if the current user is the primary owner
    if (!isRoot) {
      const currentUserMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId,
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
          organizationId,
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
          organizationId,
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
      // If only one admin remains (the owner), they can be removed by root admin
    }

    // Delete the membership
    await prisma.membership.delete({
      where: { id: targetMembership.id },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Admin removed successfully",
      },
      { status: 200 }
    );
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
