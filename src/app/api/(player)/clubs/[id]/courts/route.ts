import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
import { isSupportedSport } from "@/constants/sports";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode, findClubById, getMockCourts } from "@/services/mockDb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const club = findClubById(clubId);
      if (!club) {
        return NextResponse.json({ error: "Club not found" }, { status: 404 });
      }

      const courts = getMockCourts()
        .filter((c) => c.clubId === clubId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      return NextResponse.json({ courts });
    }

    // Check if club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const courts = await prisma.court.findMany({
      where: { clubId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        surface: true,
        indoor: true,
        sportType: true,
        defaultPriceCents: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ courts });
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

export async function POST(
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

    // Check if club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, slug, type, surface, indoor, sportType, defaultPriceCents } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate sportType if provided
    if (sportType && !isSupportedSport(sportType)) {
      return NextResponse.json(
        { error: "Invalid sport type" },
        { status: 400 }
      );
    }

    // Check for slug uniqueness if provided
    if (slug) {
      const existingCourt = await prisma.court.findUnique({
        where: { slug },
      });
      if (existingCourt) {
        return NextResponse.json(
          { error: "A court with this slug already exists" },
          { status: 409 }
        );
      }
    }

    const court = await prisma.court.create({
      data: {
        clubId,
        name: name.trim(),
        slug: slug?.trim() || null,
        type: type?.trim() || null,
        surface: surface?.trim() || null,
        indoor: indoor ?? false,
        sportType: sportType || "PADEL",
        defaultPriceCents: defaultPriceCents ?? 0,
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
