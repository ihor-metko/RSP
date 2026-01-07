import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { canAccessClub } from "@/lib/permissions/clubAccess";
import { formatAddress } from "@/types/address";

/**
 * PATCH /api/admin/clubs/[id]/address
 * Update club location details via address object
 */
export async function PATCH(
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

    // Check access permission for organization admins, club owners, and club admins
    if (authResult.adminType !== "root_admin") {
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

    const address = await request.json();

    // Validate that address is provided
    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Build update data object
    const formattedAddress = formatAddress(address);
    const updateData: Record<string, unknown> = {
      address: JSON.stringify({ ...address, formattedAddress }),
    };

    console.log("Updating club address with data:", updateData.address);
    await prisma.club.update({
      where: { id: clubId },
      data: updateData,
    });

    // Return only the updated address field (partial update)
    return NextResponse.json({
      id: clubId,
      address: { ...address, formattedAddress },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating club location:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
