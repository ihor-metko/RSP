import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const { id: clubId, courtId } = resolvedParams;

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            businessHours: {
              orderBy: { dayOfWeek: "asc" },
            },
          },
        },
        courtPriceRules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });

    if (!court) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    if (court.clubId !== clubId) {
      return NextResponse.json(
        { error: "Court does not belong to this club" },
        { status: 404 }
      );
    }

    return NextResponse.json(court);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching court:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const { id: clubId, courtId } = resolvedParams;

    // Check if court exists and belongs to the club
    const existingCourt = await prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!existingCourt) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    if (existingCourt.clubId !== clubId) {
      return NextResponse.json(
        { error: "Court does not belong to this club" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, slug, type, surface, indoor, defaultPriceCents } = body;

    // Validation
    const errors: Record<string, string> = {};

    // Name validation: required, 2-120 chars
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        errors.name = "Name is required";
      } else if (name.trim().length < 2) {
        errors.name = "Name must be at least 2 characters";
      } else if (name.trim().length > 120) {
        errors.name = "Name must be at most 120 characters";
      }
    }

    // Slug validation: pattern [a-z0-9-]+
    if (slug !== undefined && slug !== null && slug !== "") {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens";
      }
    }

    // Price validation: >= 0
    if (defaultPriceCents !== undefined) {
      if (typeof defaultPriceCents !== "number" || defaultPriceCents < 0) {
        errors.defaultPriceCents = "Price must be a non-negative number";
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", errors },
        { status: 400 }
      );
    }

    // Check for slug uniqueness if provided and different from current
    if (slug && slug !== existingCourt.slug) {
      const existingSlugCourt = await prisma.court.findUnique({
        where: { slug },
      });
      if (existingSlugCourt && existingSlugCourt.id !== courtId) {
        // Generate a slug suggestion using a single query
        const baseSlug = slug.replace(/-\d+$/, "");
        const existingSlugs = await prisma.court.findMany({
          where: {
            slug: {
              startsWith: baseSlug,
            },
          },
          select: { slug: true },
        });
        
        const slugSet = new Set(existingSlugs.map(c => c.slug));
        let counter = 1;
        let suggestion = `${baseSlug}-1`;
        while (slugSet.has(suggestion) && counter <= 100) {
          counter++;
          suggestion = `${baseSlug}-${counter}`;
        }
        
        return NextResponse.json(
          {
            error: "A court with this slug already exists",
            errors: { slug: "This slug is already in use" },
            suggestion,
          },
          { status: 409 }
        );
      }
    }

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (slug !== undefined) updateData.slug = slug?.trim() || null;
    if (type !== undefined) updateData.type = type?.trim() || null;
    if (surface !== undefined) updateData.surface = surface?.trim() || null;
    if (indoor !== undefined) updateData.indoor = indoor;
    if (defaultPriceCents !== undefined) updateData.defaultPriceCents = defaultPriceCents;

    const updatedCourt = await prisma.court.update({
      where: { id: courtId },
      data: updateData,
      include: {
        club: {
          select: {
            id: true,
            name: true,
            businessHours: {
              orderBy: { dayOfWeek: "asc" },
            },
          },
        },
        courtPriceRules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });

    return NextResponse.json(updatedCourt);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating court:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; courtId: string }> }
) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const { id: clubId, courtId } = resolvedParams;

    // Check if court exists and belongs to the club
    const existingCourt = await prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!existingCourt) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    if (existingCourt.clubId !== clubId) {
      return NextResponse.json(
        { error: "Court does not belong to this club" },
        { status: 404 }
      );
    }

    await prisma.court.delete({
      where: { id: courtId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting court:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
