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
 * - pageSize: Number of results per page (10, 25, 50, 100, default: 25)
 * - search: Search by name, email, phone, or ID
 * - role: Filter by role (root_admin, organization_admin, club_admin, user)
 * - organizationId: Filter by organization
 * - clubId: Filter by club
 * - status: Filter by status (active, blocked, suspended, invited, deleted)
 * - sortBy: Sort field (name, email, createdAt, lastLoginAt, lastActive, totalBookings, default: lastActive)
 * - sortOrder: Sort order (asc, desc, default: desc)
 * - dateRangeField: Field to apply date range filter (createdAt, lastActive)
 * - dateFrom: Start date for date range filter
 * - dateTo: End date for date range filter
 * - activeLast30d: Quick filter for users active in last 30 days
 * - neverBooked: Quick filter for users who never made a booking
 * - showOnlyAdmins: Show only admin users
 * - showOnlyUsers: Show only regular users
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
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25")));
    const skip = (page - 1) * pageSize;
    
    // Filters
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") as UserRole | null;
    const organizationId = searchParams.get("organizationId") || null;
    const clubId = searchParams.get("clubId") || null;
    const statusFilters = searchParams.getAll("status");
    const dateRangeField = searchParams.get("dateRangeField") as "createdAt" | "lastActive" | null;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const activeLast30d = searchParams.get("activeLast30d") === "true";
    const neverBooked = searchParams.get("neverBooked") === "true";
    const showOnlyAdmins = searchParams.get("showOnlyAdmins") === "true";
    const showOnlyUsers = searchParams.get("showOnlyUsers") === "true";
    
    // Sorting (default to lastActive desc)
    const sortBy = searchParams.get("sortBy") || "lastActive";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    
    // Build where clause
    const whereConditions: Prisma.UserWhereInput[] = [];
    
    // Search by name, email, or ID
    if (search) {
      whereConditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { id: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    
    // Filter by status (handle multiple status filters)
    if (statusFilters.length > 0) {
      const statusConditions: Prisma.UserWhereInput[] = [];
      
      for (const statusFilter of statusFilters) {
        if (statusFilter === "blocked" || statusFilter === "suspended") {
          statusConditions.push({ blocked: true });
        } else if (statusFilter === "active") {
          statusConditions.push({ blocked: false });
        } else if (statusFilter === "invited") {
          // Users who have an account but haven't verified email
          statusConditions.push({ 
            blocked: false,
            emailVerified: null,
          });
        } else if (statusFilter === "deleted") {
          // In our system, we don't have soft delete, so return empty condition
          // Using an impossible condition that matches no users
          statusConditions.push({ id: { in: [] } });
        }
      }
      
      if (statusConditions.length > 0) {
        whereConditions.push({ OR: statusConditions });
      }
    }
    
    // Quick filter: Active last 30 days
    if (activeLast30d) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      whereConditions.push({
        lastLoginAt: {
          gte: thirtyDaysAgo,
        },
      });
    }
    
    // Quick filter: Never booked
    if (neverBooked) {
      whereConditions.push({
        bookings: {
          none: {},
        },
      });
    }
    
    // Date range filter
    if (dateRangeField && (dateFrom || dateTo)) {
      const dateConditions: { gte?: Date; lte?: Date } = {};
      if (dateFrom) {
        dateConditions.gte = new Date(dateFrom);
      }
      if (dateTo) {
        dateConditions.lte = new Date(dateTo);
      }
      
      if (dateRangeField === "createdAt") {
        whereConditions.push({ createdAt: dateConditions });
      } else if (dateRangeField === "lastActive") {
        whereConditions.push({ lastLoginAt: dateConditions });
      }
    }
    
    // Show only admins / only users
    if (showOnlyAdmins) {
      whereConditions.push({
        OR: [
          { isRoot: true },
          { memberships: { some: { role: "ORGANIZATION_ADMIN" } } },
          { clubMemberships: { some: { role: "CLUB_ADMIN" } } },
        ],
      });
    } else if (showOnlyUsers) {
      whereConditions.push({
        AND: [
          { isRoot: false },
          { memberships: { none: { role: "ORGANIZATION_ADMIN" } } },
          { clubMemberships: { none: { role: "CLUB_ADMIN" } } },
        ],
      });
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
    // Note: lastActive and totalBookings require special handling since they're computed
    const validSortFields = ["name", "email", "createdAt", "lastLoginAt"];
    let orderBy: Prisma.UserOrderByWithRelationInput;
    
    if (validSortFields.includes(sortBy)) {
      orderBy = { [sortBy]: sortOrder };
    } else if (sortBy === "totalBookings") {
      // Sort by bookings count
      orderBy = { bookings: { _count: sortOrder } };
    } else {
      // Default to lastLoginAt as proxy for lastActive
      orderBy = { lastLoginAt: sortOrder };
    }
    
    // Get total count
    const totalCount = await prisma.user.count({ where });
    
    // Calculate date 30 days ago for bookings filter
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
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
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });
    
    // Get bookings count for last 30 days for each user (batch query)
    const userIds = users.map(u => u.id);
    const bookingsLast30dCounts = await prisma.booking.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: {
        id: true,
      },
    });
    
    // Create a map for quick lookup
    const bookingsLast30dMap = new Map(
      bookingsLast30dCounts.map(b => [b.userId, b._count.id])
    );
    
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
      
      // Get bookings counts
      const totalBookings = user._count.bookings;
      const bookingsLast30d = bookingsLast30dMap.get(user.id) || 0;
      
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
        totalBookings,
        bookingsLast30d,
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
