import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";

/**
 * GET /api/admin/organizations/search
 * 
 * Returns a lightweight list of organizations for dropdown/typeahead.
 * Supports search query and limit parameters.
 * 
 * Query params:
 * - search: Optional search string to filter by name or slug
 * - limit: Optional limit (default 20, max 100)
 * 
 * Access: Root Admin only (organization admins already know their org)
 */
export async function GET(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  // If user is an organization admin (not root), they can only see their org
  if (authResult.adminType === "organization_admin") {
    const organizations = await prisma.organization.findMany({
      where: {
        id: { in: authResult.managedIds },
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(organizations);
  }

  // Club admins cannot access this endpoint
  if (authResult.adminType === "club_admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Root admin can search all organizations
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "20", 10) || 20, 100);

    const whereClause = search.trim()
      ? {
          archivedAt: null,
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : { archivedAt: null };

    const organizations = await prisma.organization.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    return NextResponse.json(organizations);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error searching organizations:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
