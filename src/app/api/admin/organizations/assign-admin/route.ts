import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
import { hash } from "bcryptjs";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockAssignOrgAdmin } from "@/services/mockApiHandlers";

/**
 * POST /api/admin/organizations/assign-admin
 * Assigns or creates a SuperAdmin for an organization.
 * Supports multiple SuperAdmins per organization.
 * The first SuperAdmin becomes the primary owner by default.
 */
export async function POST(request: Request) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { organizationId, userId, createNew, name, email, password } = body;
    const setAsPrimaryOwner = body.setAsPrimaryOwner === true;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      if (createNew) {
        return NextResponse.json(
          { error: "Creating new users not supported in mock mode" },
          { status: 501 }
        );
      }
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 }
        );
      }
      const result = await mockAssignOrgAdmin(organizationId, userId);
      if (!result) {
        return NextResponse.json(
          { error: "Organization or user not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "SuperAdmin assigned successfully",
      });
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

    let targetUserId: string;

    if (createNew) {
      // Create a new user as SuperAdmin
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

    if (existingMembership && existingMembership.role === "ORGANIZATION_ADMIN") {
      return NextResponse.json(
        { error: "User is already a SuperAdmin of this organization" },
        { status: 409 }
      );
    }

    // Check if there are existing SuperAdmins for this organization
    const existingAdminsCount = await prisma.membership.count({
      where: {
        organizationId,
        role: "ORGANIZATION_ADMIN",
      },
    });

    // First SuperAdmin becomes primary owner by default
    const shouldBePrimaryOwner = existingAdminsCount === 0 || setAsPrimaryOwner === true;

    // If setting as primary owner, remove primary owner status from others
    if (shouldBePrimaryOwner && existingAdminsCount > 0) {
      await prisma.membership.updateMany({
        where: {
          organizationId,
          role: "ORGANIZATION_ADMIN",
          isPrimaryOwner: true,
        },
        data: { isPrimaryOwner: false },
      });
    }

    if (existingMembership) {
      // Update existing membership to ORGANIZATION_ADMIN
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: { 
          role: "ORGANIZATION_ADMIN",
          isPrimaryOwner: shouldBePrimaryOwner,
        },
      });
    } else {
      // Create new membership
      await prisma.membership.create({
        data: {
          userId: targetUserId,
          organizationId,
          role: "ORGANIZATION_ADMIN",
          isPrimaryOwner: shouldBePrimaryOwner,
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
        message: "SuperAdmin assigned successfully",
        superAdmin: {
          ...assignedUser,
          isPrimaryOwner: shouldBePrimaryOwner,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error assigning SuperAdmin:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
