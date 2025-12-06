import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireUserViewPermission,
  UserViewPermission,
} from "@/lib/userPermissions";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/admin/users/[userId]/bookings
 * Get user bookings filtered by scope.
 *
 * Query parameters:
 * - scope: "all" | "org" | "club" (defaults based on caller's permission)
 * - limit: Number of results (default: 20, max: 100)
 *
 * Authorization:
 * - RootAdmin: Can view all bookings
 * - OrganizationAdmin: Can view bookings in their org's clubs
 * - ClubAdmin: Can view bookings in their club
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    
    const scopeParam = searchParams.get("scope");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    // Check permission to view this user
    const permissionResult = await requireUserViewPermission(userId);

    if (permissionResult instanceof NextResponse) {
      return permissionResult;
    }

    const permission = permissionResult as UserViewPermission;
    const { scope, organizationId, clubId } = permission;

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build query based on scope
    let whereClause: {
      userId: string;
      court?: {
        clubId?: string;
        club?: {
          organizationId: string;
        };
      };
    } = { userId };

    // Determine effective scope - normalize query param to internal scope type
    let effectiveScope: "root" | "organization" | "club" | undefined = scope;
    
    // Map query params to internal scope types
    if (scopeParam === "all" && scope === "root") {
      effectiveScope = "root";
    } else if (scopeParam === "org" || scopeParam === "organization") {
      // Only allow org scope if caller has at least organization-level access
      if (scope === "root" || scope === "organization") {
        effectiveScope = "organization";
      }
    } else if (scopeParam === "club") {
      effectiveScope = "club";
    }

    // Apply scope filters
    if (effectiveScope === "organization" && organizationId) {
      whereClause = {
        ...whereClause,
        court: {
          club: {
            organizationId,
          },
        },
      };
    } else if (effectiveScope === "club" && clubId) {
      whereClause = {
        ...whereClause,
        court: {
          clubId,
        },
      };
    }

    // Fetch bookings
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        start: true,
        end: true,
        status: true,
        price: true,
        createdAt: true,
        court: {
          select: {
            id: true,
            name: true,
            club: {
              select: {
                id: true,
                name: true,
                organizationId: true,
              },
            },
          },
        },
        coach: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Get total count for the same filter
    const totalCount = await prisma.booking.count({
      where: whereClause,
    });

    return NextResponse.json({
      bookings,
      totalCount,
      scope: effectiveScope,
      limit,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching user bookings:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
