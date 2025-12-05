import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAdmin } from "@/lib/requireRole";

/**
 * GET /api/orgs/[orgId]/clubs
 * Returns paginated list of clubs for an organization.
 * Allowed: isRoot OR ORGANIZATION_ADMIN of this org
 * 
 * Query params:
 * - limit: number of clubs to return (default 10, max 100)
 * - cursor: cursor for pagination (club id)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    const authResult = await requireOrganizationAdmin(orgId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");

    const limit = Math.min(Math.max(parseInt(limitParam || "10", 10) || 10, 1), 100);

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Build query
    const whereClause = {
      organizationId: orgId,
    };

    // Fetch clubs with counts
    const clubs = await prisma.club.findMany({
      where: whereClause,
      take: limit + 1, // Fetch one extra to determine if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            courts: true,
            clubMemberships: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Check if there are more results
    const hasMore = clubs.length > limit;
    const items = hasMore ? clubs.slice(0, -1) : clubs;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Get total count
    const totalCount = await prisma.club.count({
      where: whereClause,
    });

    // Format response
    const formattedClubs = items.map((club) => ({
      id: club.id,
      name: club.name,
      slug: club.slug,
      shortDescription: club.shortDescription,
      location: club.location,
      city: club.city,
      country: club.country,
      phone: club.phone,
      email: club.email,
      website: club.website,
      isPublic: club.isPublic,
      logo: club.logo,
      heroImage: club.heroImage,
      courtCount: club._count.courts,
      adminCount: club._count.clubMemberships,
      createdBy: club.createdBy,
      createdAt: club.createdAt,
      updatedAt: club.updatedAt,
    }));

    return NextResponse.json({
      items: formattedClubs,
      pagination: {
        total: totalCount,
        limit,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching organization clubs:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
