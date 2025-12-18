import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin, isValidEmail } from "@/lib/requireRole";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";

/**
 * POST /api/admin/admins/create
 * Create a new admin user with role assignment
 * 
 * Required permissions:
 * - ROOT_ADMIN: Can create any admin
 * - ORGANIZATION_ADMIN: Can create admins for their organization
 * - CLUB_ADMIN: Cannot create admins (403)
 * 
 * Body:
 * - name: string (required)
 * - email: string (required)
 * - phone: string (required)
 * - role: "ORGANIZATION_ADMIN" | "CLUB_ADMIN" (required)
 * - organizationId: string (required for ORGANIZATION_ADMIN)
 * - clubId: string (required for CLUB_ADMIN)
 */
export async function POST(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { isRoot, adminType, managedIds } = authResult;

  try {
    const body = await request.json();
    const { name, email, phone, role, organizationId, clubId } = body;

    // Validate required fields
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format", field: "email" },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Phone is required" },
        { status: 400 }
      );
    }

    if (!role || !["ORGANIZATION_ADMIN", "CLUB_ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ORGANIZATION_ADMIN or CLUB_ADMIN" },
        { status: 400 }
      );
    }

    // Validate context based on role
    if (role === "ORGANIZATION_ADMIN" && !organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required for ORGANIZATION_ADMIN role" },
        { status: 400 }
      );
    }

    if (role === "CLUB_ADMIN" && !clubId) {
      return NextResponse.json(
        { error: "Club ID is required for CLUB_ADMIN role" },
        { status: 400 }
      );
    }

    // Authorization check: Club admins cannot create admins
    if (adminType === "club_admin") {
      return NextResponse.json(
        { error: "Club admins cannot create other admins" },
        { status: 403 }
      );
    }

    // Authorization check: Organization admins can only create admins for their organization
    if (adminType === "organization_admin" && !isRoot) {
      const managedOrgIds = managedIds;

      // Check if trying to create admin for their organization
      if (role === "ORGANIZATION_ADMIN") {
        if (!managedOrgIds.includes(organizationId)) {
          return NextResponse.json(
            { error: "You can only create admins for organizations you manage" },
            { status: 403 }
          );
        }
      } else if (role === "CLUB_ADMIN") {
        // Check if the club belongs to their organization
        const club = await prisma.club.findUnique({
          where: { id: clubId },
          select: { organizationId: true },
        });

        if (!club || !club.organizationId || !managedOrgIds.includes(club.organizationId)) {
          return NextResponse.json(
            { error: "You can only create club admins for clubs in your organization" },
            { status: 403 }
          );
        }
      }
    }

    // Verify organization exists
    if (role === "ORGANIZATION_ADMIN") {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }
    }

    // Verify club exists and belongs to organization
    if (role === "CLUB_ADMIN") {
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
    }

    // Check if user with email already exists
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: "A user with this email already exists", field: "email" },
        { status: 409 }
      );
    }

    // Note: Phone uniqueness check is not implemented as the User model
    // doesn't have a phone field in the current schema. Phone data is collected
    // for future use but not currently stored in the database.
    // TODO: Add phone field to User model and implement uniqueness validation

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        // TODO: Store phone when User model is updated to include phone field
      },
    });

    // Create membership based on role
    if (role === "ORGANIZATION_ADMIN") {
      await prisma.membership.create({
        data: {
          userId: newUser.id,
          organizationId: organizationId,
          role: MembershipRole.ORGANIZATION_ADMIN,
          isPrimaryOwner: false,
        },
      });
    } else if (role === "CLUB_ADMIN") {
      await prisma.clubMembership.create({
        data: {
          userId: newUser.id,
          clubId: clubId,
          role: ClubMembershipRole.CLUB_ADMIN,
        },
      });
    }

    // Return success response
    return NextResponse.json(
      {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: role,
        message: "Admin created successfully. An invitation email will be sent.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating admin:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
