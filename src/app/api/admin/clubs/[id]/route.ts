import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { ADMIN_ROLES } from "@/constants/roles";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ADMIN_ROLES);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

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
  const authResult = await requireRole(request, ADMIN_ROLES);

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

    const body = await request.json();
    const { name, location, contactInfo, openingHours, logo } = body;

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
  const authResult = await requireRole(request, ADMIN_ROLES);

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
