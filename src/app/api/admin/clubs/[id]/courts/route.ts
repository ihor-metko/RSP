import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubManagement } from "@/lib/requireRole";
import { Prisma } from "@prisma/client";

/**
 * GET /api/admin/clubs/[clubId]/courts
 * 
 * Returns all courts for a specific club (admin view with full details).
 * 
 * Access: Club Owners, Club Admins for this club, Organization Admins for the parent org, Root Admins
 * 
 * Query parameters:
 * - search: Search by court name
 * - status: Filter by status (active/inactive/all)
 * - sortBy: Sort field (name/bookings/createdAt)
 * - sortOrder: Sort order (asc/desc)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: clubId } = await context.params;

  // Check authorization for this club
  const authResult = await requireClubManagement(clubId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);


    // Build where clause - filter by this specific club
    const whereClause: Prisma.CourtWhereInput = {
      clubId,
    };

    // Add search filter
    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Add status filter
    if (status === "active") {
      whereClause.isActive = true;
    } else if (status === "inactive") {
      whereClause.isActive = false;
    }
    // "all" status shows both active and inactive

    // Build orderBy clause
    let orderBy: Prisma.CourtOrderByWithRelationInput = { createdAt: "desc" };
    
    if (sortBy === "name") {
      orderBy = { name: sortOrder as "asc" | "desc" };
    } else if (sortBy === "bookings") {
      // For sorting by bookings count, we need to use a different approach
      // We'll fetch all matching courts and sort in-memory
      orderBy = { createdAt: "desc" };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch courts
    const courts = await prisma.court.findMany({
      where: whereClause,
      orderBy,
      skip: sortBy === "bookings" ? 0 : skip,
      take: sortBy === "bookings" ? undefined : limit,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        surface: true,
        indoor: true,
        sportType: true,
        isActive: true,
        defaultPriceCents: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    // Transform the response
    let courtsWithDetails = courts.map((court) => ({
      id: court.id,
      clubId,
      name: court.name,
      slug: court.slug,
      type: court.type,
      surface: court.surface,
      indoor: court.indoor,
      sportType: court.sportType,
      isActive: court.isActive,
      defaultPriceCents: court.defaultPriceCents,
      createdAt: court.createdAt,
      updatedAt: court.updatedAt,
      bookingCount: court._count.bookings,
    }));

    // Sort by bookings if requested (in-memory sorting)
    if (sortBy === "bookings") {
      courtsWithDetails.sort((a, b) => {
        const comparison = a.bookingCount - b.bookingCount;
        return sortOrder === "asc" ? comparison : -comparison;
      });
      // Apply pagination after sorting
      courtsWithDetails = courtsWithDetails.slice(skip, skip + limit);
    }

    return NextResponse.json(courtsWithDetails);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching courts:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/clubs/[clubId]/courts
 * 
 * Creates a new court for the specified club.
 * 
 * Access: Club Owners, Club Admins for this club, Organization Admins for the parent org, Root Admins
 * 
 * Request body:
 * - name: Court name (required)
 * - slug: Court slug (optional)
 * - type: Court type (optional)
 * - surface: Court surface (optional)
 * - indoor: Boolean indicating if court is indoor (optional, default: false)
 * - sportType: Sport type (optional, default: "PADEL")
 * - defaultPriceCents: Default price in cents (optional, default: 0)
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: clubId } = await context.params;

  // Check authorization for this club
  const authResult = await requireClubManagement(clubId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { name, slug, type, surface, indoor, sportType, description, isPublished, defaultPriceCents, courtFormat } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Court name is required" },
        { status: 400 }
      );
    }

    // Validate name length
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: "Court name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (name.trim().length > 120) {
      return NextResponse.json(
        { error: "Court name must be at most 120 characters" },
        { status: 400 }
      );
    }

    // Validate court format for padel courts
    if (type?.toLowerCase() === "padel") {
      if (!courtFormat) {
        return NextResponse.json(
          { error: "Padel courts must specify SINGLE or DOUBLE format" },
          { status: 400 }
        );
      }

      const normalizedFormat = courtFormat.toUpperCase();
      if (normalizedFormat !== "SINGLE" && normalizedFormat !== "DOUBLE") {
        return NextResponse.json(
          { error: "Court format must be either 'SINGLE' or 'DOUBLE'" },
          { status: 400 }
        );
      }
    }

    // Verify club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return NextResponse.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    // Create the court
    const court = await prisma.court.create({
      data: {
        clubId,
        name: name.trim(),
        slug: slug?.trim() || null,
        type: type?.trim() || null,
        surface: surface?.trim() || null,
        indoor: indoor ?? false,
        sportType: sportType || "PADEL",
        courtFormat: courtFormat ? courtFormat.toUpperCase() : null,
        description: description?.trim() || null,
        isPublished: isPublished ?? false,
        isActive: true,
        defaultPriceCents: defaultPriceCents ?? 0,
      },
      select: {
        id: true,
        clubId: true,
        name: true,
        slug: true,
        type: true,
        surface: true,
        indoor: true,
        sportType: true,
        courtFormat: true,
        description: true,
        isPublished: true,
        isActive: true,
        defaultPriceCents: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(court, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating court:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
