import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { Roles } from "@/constants/roles";

interface UserWhereClause {
  OR?: { name?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } }[];
  role?: { in: string[] };
  userClubs?: { some: { clubId: string } };
}

/**
 * GET /api/admin/users
 * 
 * Returns list of users with Super Admin or Admin roles.
 * Access: Root Admin only
 * 
 * Query params:
 * - search: Filter by name or email
 * - role: Filter by role (super_admin, admin)
 * - clubId: Filter by assigned club
 */
export async function GET(request: Request) {
  const authResult = await requireRole(request, [Roles.RootAdmin]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const clubId = searchParams.get("clubId") || "";

    const whereClause: UserWhereClause = {
      role: { in: [Roles.SuperAdmin, Roles.Admin] },
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role && [Roles.SuperAdmin, Roles.Admin].includes(role as typeof Roles.SuperAdmin | typeof Roles.Admin)) {
      whereClause.role = { in: [role] };
    }

    if (clubId) {
      whereClause.userClubs = { some: { clubId } };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        userClubs: {
          select: {
            id: true,
            club: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform the response to flatten club data
    const transformedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      clubs: user.userClubs.map((uc) => ({
        id: uc.club.id,
        name: uc.club.name,
      })),
    }));

    return NextResponse.json(transformedUsers);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching users:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * 
 * Creates a new user with Super Admin or Admin role.
 * Access: Root Admin only
 * 
 * Body:
 * - name: User name (required)
 * - email: User email (required)
 * - password: User password (required, min 8 characters)
 * - role: User role (required, must be super_admin or admin)
 * - clubIds: Array of club IDs to assign (required)
 *   - super_admin: can be assigned to multiple clubs
 *   - admin: must be assigned to exactly one club
 */
export async function POST(request: Request) {
  const authResult = await requireRole(request, [Roles.RootAdmin]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { name, email, password, role, clubIds } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate role
    if (!role || ![Roles.SuperAdmin, Roles.Admin].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'super_admin' or 'admin'" },
        { status: 400 }
      );
    }

    // Validate club assignments
    if (!clubIds || !Array.isArray(clubIds) || clubIds.length === 0) {
      return NextResponse.json(
        { error: "At least one club must be assigned" },
        { status: 400 }
      );
    }

    // Admin can only be assigned to one club
    if (role === Roles.Admin && clubIds.length > 1) {
      return NextResponse.json(
        { error: "Admin can only be assigned to a single club" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Validate that all provided clubIds exist
    const clubs = await prisma.club.findMany({
      where: { id: { in: clubIds } },
      select: { id: true, name: true },
    });

    if (clubs.length !== clubIds.length) {
      return NextResponse.json(
        { error: "One or more selected clubs do not exist" },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await hash(password, 12);

    // Create the user with club assignments
    const user = await prisma.$transaction(async (tx) => {
      // Create the user
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // Create club assignments
      await tx.userClub.createMany({
        data: clubIds.map((clubId: string) => ({
          userId: newUser.id,
          clubId,
        })),
      });

      return newUser;
    });

    // Return user with club data
    const userWithClubs = {
      ...user,
      clubs: clubs.map((club) => ({
        id: club.id,
        name: club.name,
      })),
    };

    return NextResponse.json(userWithClubs, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating user:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
