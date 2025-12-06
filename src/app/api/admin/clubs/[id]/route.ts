import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin, requireRootAdmin } from "@/lib/requireRole";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetClubByIdDetailed, mockUpdateClub, mockDeleteClub } from "@/services/mockApiHandlers";

/**
 * Check if an admin has access to a specific club
 */
async function canAccessClub(
  adminType: "root_admin" | "organization_admin" | "club_admin",
  managedIds: string[],
  clubId: string
): Promise<boolean> {
  if (adminType === "root_admin") {
    return true;
  }

  if (adminType === "club_admin") {
    return managedIds.includes(clubId);
  }

  if (adminType === "organization_admin") {
    // Check if club belongs to one of the managed organizations
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { organizationId: true },
    });
    return club?.organizationId ? managedIds.includes(club.organizationId) : false;
  }

  return false;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const club = await mockGetClubByIdDetailed(
        clubId,
        authResult.adminType,
        authResult.managedIds
      );
      if (!club) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(club);
    }

    // Check access permission
    const hasAccess = await canAccessClub(
      authResult.adminType,
      authResult.managedIds,
      clubId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        courts: {
          orderBy: { name: "asc" },
        },
        coaches: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        gallery: {
          orderBy: { sortOrder: "asc" },
        },
        businessHours: {
          orderBy: { dayOfWeek: "asc" },
        },
        specialHours: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    return NextResponse.json(club);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching club:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  // Only root admins and organization admins can edit clubs
  if (authResult.adminType === "club_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const body = await request.json();
      const { name, location, contactInfo, openingHours, logo } = body;
      
      if (!name || !location) {
        return NextResponse.json(
          { error: "Name and location are required" },
          { status: 400 }
        );
      }
      
      const updatedClub = await mockUpdateClub(clubId, {
        name,
        location,
        contactInfo: contactInfo || null,
        openingHours: openingHours || null,
      });
      if (!updatedClub) {
        return NextResponse.json({ error: "Club not found" }, { status: 404 });
      }
      return NextResponse.json(updatedClub);
    }

    const body = await request.json();
    const { name, location, contactInfo, openingHours, logo } = body;

    if (!name || !location) {
      return NextResponse.json(
        { error: "Name and location are required" },
        { status: 400 }
      );
    }

    // Check access permission for organization admins
    if (authResult.adminType === "organization_admin") {
      const hasAccess = await canAccessClub(
        authResult.adminType,
        authResult.managedIds,
        clubId
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const existingClub = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!existingClub) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const updatedClub = await prisma.club.update({
      where: { id: clubId },
      data: {
        name,
        location,
        contactInfo: contactInfo || null,
        openingHours: openingHours || null,
        logo: logo || null,
      },
    });

    return NextResponse.json(updatedClub);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating club:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const deleted = await mockDeleteClub(clubId);
      if (!deleted) {
        return NextResponse.json({ error: "Club not found" }, { status: 404 });
      }
      return NextResponse.json({ message: "Club deleted successfully" });
    }

    const existingClub = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!existingClub) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    await prisma.club.delete({
      where: { id: clubId },
    });

    return NextResponse.json({ message: "Club deleted successfully" });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting club:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
