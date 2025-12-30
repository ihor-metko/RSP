import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin, isValidEmail } from "@/lib/requireRole";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";

/**
 * POST /api/admin/admins/create
 * Create a new admin user with role assignment or assign role to existing user
 * 
 * Required permissions:
 * - ROOT_ADMIN: Can create any admin
 * - ORGANIZATION_ADMIN: Can create admins for their organization
 * - CLUB_ADMIN: Cannot create admins (403)
 * 
 * Body:
 * - userSource: "existing" | "new" (required)
 * - role: "ORGANIZATION_OWNER" | "ORGANIZATION_ADMIN" | "CLUB_OWNER" | "CLUB_ADMIN" (required)
 * - organizationId: string (required for organization roles)
 * - clubId: string (required for club roles)
 * 
 * For existing users:
 * - userId: string (required)
 * 
 * For new users:
 * - name: string (required)
 * - email: string (required)
 * - phone: string (required)
 */
export async function POST(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { isRoot, adminType, managedIds } = authResult;

  try {
    const body = await request.json();
    const { userSource, role, organizationId, clubId, userId, name, email, phone } = body;

    // Validate userSource
    if (!userSource || !["existing", "new"].includes(userSource)) {
      return NextResponse.json(
        { error: "Invalid user source. Must be 'existing' or 'new'" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN", "CLUB_OWNER", "CLUB_ADMIN"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate context based on role
    if ((role === "ORGANIZATION_OWNER" || role === "ORGANIZATION_ADMIN") && !organizationId) {
      return NextResponse.json(
        { error: `Organization ID is required for ${role} role` },
        { status: 400 }
      );
    }

    if ((role === "CLUB_OWNER" || role === "CLUB_ADMIN") && !clubId) {
      return NextResponse.json(
        { error: `Club ID is required for ${role} role` },
        { status: 400 }
      );
    }

    // Validate user-specific fields based on userSource
    if (userSource === "existing") {
      if (!userId || typeof userId !== "string") {
        return NextResponse.json(
          { error: "User ID is required for existing user" },
          { status: 400 }
        );
      }
    } else {
      // New user validation
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
      if (role === "ORGANIZATION_OWNER" || role === "ORGANIZATION_ADMIN") {
        if (!managedOrgIds.includes(organizationId)) {
          return NextResponse.json(
            { error: "You can only create admins for organizations you manage" },
            { status: 403 }
          );
        }
      } else if (role === "CLUB_OWNER" || role === "CLUB_ADMIN") {
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
    if (role === "ORGANIZATION_OWNER" || role === "ORGANIZATION_ADMIN") {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }

      // For owners, check if an owner already exists
      if (role === "ORGANIZATION_OWNER") {
        const existingOwner = await prisma.membership.findFirst({
          where: {
            organizationId: organizationId,
            isPrimaryOwner: true,
          },
        });

        if (existingOwner) {
          return NextResponse.json(
            { error: "This organization already has an owner", field: "owner" },
            { status: 409 }
          );
        }
      }
    }

    // Verify club exists
    if (role === "CLUB_OWNER" || role === "CLUB_ADMIN") {
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

      // For club owners, check if an owner already exists
      if (role === "CLUB_OWNER") {
        const existingOwner = await prisma.clubMembership.findFirst({
          where: {
            clubId: clubId,
            role: ClubMembershipRole.CLUB_OWNER,
          },
        });

        if (existingOwner) {
          return NextResponse.json(
            { error: "This club already has an owner", field: "owner" },
            { status: 409 }
          );
        }
      }
    }

    let targetUserId: string;
    let targetUserEmail: string;
    let targetUserName: string | null;

    // Handle user based on source
    if (userSource === "existing") {
      // Verify existing user
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: "User not found", field: "userId" },
          { status: 404 }
        );
      }

      targetUserId = existingUser.id;
      targetUserEmail = existingUser.email;
      targetUserName = existingUser.name;

      // Check if user already has this role
      if (role === "ORGANIZATION_OWNER" || role === "ORGANIZATION_ADMIN") {
        const existingMembership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: targetUserId,
              organizationId: organizationId,
            },
          },
        });

        if (existingMembership) {
          return NextResponse.json(
            { error: "This user already has a role in this organization" },
            { status: 409 }
          );
        }
      } else {
        // For club roles, prevent Organization Owners from being assigned as Club Owners
        if (role === "CLUB_OWNER") {
          // Check if user is an Organization Owner in any organization
          const orgOwnerMembership = await prisma.membership.findFirst({
            where: {
              userId: targetUserId,
              isPrimaryOwner: true,
            },
            select: {
              organization: {
                select: { name: true },
              },
            },
          });

          if (orgOwnerMembership) {
            return NextResponse.json(
              { 
                error: `This user is an Organization Owner of "${orgOwnerMembership.organization.name}" and cannot be assigned as a Club Owner`,
                field: "userId"
              },
              { status: 409 }
            );
          }
        }

        const existingMembership = await prisma.clubMembership.findUnique({
          where: {
            userId_clubId: {
              userId: targetUserId,
              clubId: clubId,
            },
          },
        });

        if (existingMembership) {
          return NextResponse.json(
            { error: "This user already has a role in this club" },
            { status: 409 }
          );
        }
      }
    } else {
      // New user - check if email already exists
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existingUserByEmail) {
        return NextResponse.json(
          { error: "A user with this email already exists", field: "email" },
          { status: 409 }
        );
      }

      // Create new user
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          // TODO: Store phone when User model is updated to include phone field
        },
      });

      targetUserId = newUser.id;
      targetUserEmail = newUser.email;
      targetUserName = newUser.name;
    }

    // Create membership based on role
    // Note: ORGANIZATION_OWNER is mapped to ORGANIZATION_ADMIN with isPrimaryOwner: true
    // This is because the database uses a flag to distinguish ownership rather than a separate role
    if (role === "ORGANIZATION_OWNER") {
      await prisma.membership.create({
        data: {
          userId: targetUserId,
          organizationId: organizationId,
          role: MembershipRole.ORGANIZATION_ADMIN,
          isPrimaryOwner: true,
        },
      });
    } else if (role === "ORGANIZATION_ADMIN") {
      await prisma.membership.create({
        data: {
          userId: targetUserId,
          organizationId: organizationId,
          role: MembershipRole.ORGANIZATION_ADMIN,
          isPrimaryOwner: false,
        },
      });
    } else if (role === "CLUB_OWNER") {
      await prisma.clubMembership.create({
        data: {
          userId: targetUserId,
          clubId: clubId,
          role: ClubMembershipRole.CLUB_OWNER,
        },
      });
    } else if (role === "CLUB_ADMIN") {
      await prisma.clubMembership.create({
        data: {
          userId: targetUserId,
          clubId: clubId,
          role: ClubMembershipRole.CLUB_ADMIN,
        },
      });
    }

    // Return success response
    const message = userSource === "existing"
      ? "Role assigned successfully."
      : "Admin created successfully. An invitation email will be sent.";

    return NextResponse.json(
      {
        userId: targetUserId,
        email: targetUserEmail,
        name: targetUserName,
        role: role,
        message: message,
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
