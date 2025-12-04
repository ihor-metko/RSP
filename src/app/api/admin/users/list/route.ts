import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
import { Prisma } from "@prisma/client";

/**
 * Supported user roles for filtering.
 * - root_admin: Users with isRoot=true
 * - organization_admin: Users with ORGANIZATION_ADMIN membership
 * - club_admin: Users with CLUB_ADMIN club membership
 * - user: Regular users without admin roles
 */
type UserRole = "root_admin" | "organization_admin" | "club_admin" | "user";

/**
 * GET /api/admin/users/list
 * Returns paginated list of users with filtering and sorting for Root Admin
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Number of results per page (10, 25, 50, 100, default: 10)
 * - search: Search by name or email
 * - role: Filter by role (root_admin, organization_admin, club_admin, user)
 * - organizationId: Filter by organization
 * - clubId: Filter by club
 * - status: Filter by status (active, blocked)
 * - sortBy: Sort field (name, email, createdAt, lastLoginAt, default: createdAt)
 * - sortOrder: Sort order (asc, desc, default: desc)
 */
export async function GET(request: Request) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "10")));
    const skip = (page - 1) * pageSize;
    
    // Filters
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") as UserRole | null;
    const organizationId = searchParams.get("organizationId") || null;
    const clubId = searchParams.get("clubId") || null;
    const statusFilter = searchParams.get("status") || null;
    
    // Sorting
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    
    // Build where clause
    const whereConditions: Prisma.UserWhereInput[] = [];
    
    // Search by name or email
    if (search) {
      whereConditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    
    // Filter by status (blocked/active)
    if (statusFilter === "blocked") {
      whereConditions.push({ blocked: true });
    } else if (statusFilter === "active") {
      whereConditions.push({ blocked: false });
    }
    
    // Filter by role
    if (roleFilter === "root_admin") {
      whereConditions.push({ isRoot: true });
    } else if (roleFilter === "organization_admin") {
      whereConditions.push({
        memberships: {
          some: { role: "ORGANIZATION_ADMIN" },
        },
      });
    } else if (roleFilter === "club_admin") {
      whereConditions.push({
        clubMemberships: {
          some: { role: "CLUB_ADMIN" },
        },
      });
    } else if (roleFilter === "user") {
      whereConditions.push({
        AND: [
          { isRoot: false },
          { memberships: { none: { role: "ORGANIZATION_ADMIN" } } },
          { clubMemberships: { none: { role: "CLUB_ADMIN" } } },
        ],
      });
    }
    
    // Filter by organization
    if (organizationId) {
      whereConditions.push({
        memberships: {
          some: { organizationId },
        },
      });
    }
    
    // Filter by club
    if (clubId) {
      whereConditions.push({
        clubMemberships: {
          some: { clubId },
        },
      });
    }
    
    const where: Prisma.UserWhereInput = whereConditions.length > 0
      ? { AND: whereConditions }
      : {};
    
    // Build order by clause
    const validSortFields = ["name", "email", "createdAt", "lastLoginAt"];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const orderBy: Prisma.UserOrderByWithRelationInput = { [orderByField]: sortOrder };
    
    // Get total count
    const totalCount = await prisma.user.count({ where });
    
    // Get users with related data
    const users = await prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        isRoot: true,
        blocked: true,
        createdAt: true,
        lastLoginAt: true,
        memberships: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        clubMemberships: {
          select: {
            role: true,
            club: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            createdAt: true,
          },
        },
      },
    });
    
    // Format users for response
    const formattedUsers = users.map((user) => {
      // Determine primary role
      let role: UserRole = "user";
      if (user.isRoot) {
        role = "root_admin";
      } else if (user.memberships.some((m) => m.role === "ORGANIZATION_ADMIN")) {
        role = "organization_admin";
      } else if (user.clubMemberships.some((m) => m.role === "CLUB_ADMIN")) {
        role = "club_admin";
      }
      
      // Get organization info (first organization where user is admin)
      const orgMembership = user.memberships.find((m) => m.role === "ORGANIZATION_ADMIN");
      const organization = orgMembership?.organization || null;
      
      // Get club info (first club where user is admin)
      const clubMembership = user.clubMemberships.find((m) => m.role === "CLUB_ADMIN");
      const club = clubMembership?.club || null;
      
      // Last activity - most recent between lastLoginAt and last booking
      const lastBooking = user.bookings[0]?.createdAt || null;
      let lastActivity: Date | null = null;
      if (user.lastLoginAt && lastBooking) {
        lastActivity = user.lastLoginAt > lastBooking ? user.lastLoginAt : lastBooking;
      } else {
        lastActivity = user.lastLoginAt || lastBooking;
      }
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        organization: organization ? { id: organization.id, name: organization.name } : null,
        club: club ? { id: club.id, name: club.name } : null,
        blocked: user.blocked,
        createdAt: user.createdAt,
        lastActivity,
      };
    });
    
    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching users list:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
