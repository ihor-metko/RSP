import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin, requireRootAdmin } from "@/lib/requireRole";

/**
 * Check if an admin has access to a specific club
 */
async function canAccessClub(
  adminType: "root_admin" | "organization_admin" | "club_owner" | "club_admin",
  managedIds: string[],
  clubId: string
): Promise<boolean> {
  if (adminType === "root_admin") {
    return true;
  }

  if (adminType === "club_owner") {
    return managedIds.includes(clubId);
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

    // Parse JSON fields
    const formattedClub = {
      ...club,
      logoData: club.logoData ? JSON.parse(club.logoData) : null,
      bannerData: club.bannerData ? JSON.parse(club.bannerData) : null,
    };

    return NextResponse.json(formattedClub);
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

    const body = await request.json();
    const { name, location, contactInfo, openingHours, logoData, bannerData } = body;

    if (!name || !location) {
      return NextResponse.json(
        { error: "Name and location are required" },
        { status: 400 }
      );
    }

    const updatedClub = await prisma.club.update({
      where: { id: clubId },
      data: {
        name,
        location,
        contactInfo: contactInfo || null,
        openingHours: openingHours || null,
        logoData: logoData ? JSON.stringify(logoData) : null,
        bannerData: bannerData ? JSON.stringify(bannerData) : null,
      },
    });

    // Parse JSON fields for response
    const formattedClub = {
      ...updatedClub,
      logoData: updatedClub.logoData ? JSON.parse(updatedClub.logoData) : null,
      bannerData: updatedClub.bannerData ? JSON.parse(updatedClub.bannerData) : null,
    };

    return NextResponse.json(formattedClub);
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
