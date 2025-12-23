import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { ClubMembershipRole, MembershipRole } from "@/constants/roles";
import { saveImageFile } from "@/lib/imageUpload";

/**
 * POST /api/images/courts/[id]/upload
 * Upload image for a specific court
 * 
 * Accepts multipart/form-data with:
 * - file: The image file (jpg, jpeg, png, webp)
 * 
 * Authorization: Club admin, club owner, organization admin (if club belongs to org), or root admin
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courtId } = await params;

    // Verify court exists and get club/organization info
    const court = await prisma.court.findUnique({
      where: { id: courtId },
      select: { 
        id: true, 
        clubId: true,
        club: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!court) {
      return NextResponse.json(
        { error: "Court not found" },
        { status: 404 }
      );
    }

    // Check authorization - allow club admins and owners
    const authResult = await requireRole({
      contextType: "club",
      contextId: court.clubId,
      allowedRoles: [ClubMembershipRole.CLUB_ADMIN, ClubMembershipRole.CLUB_OWNER],
    });

    // If not authorized as club admin/owner and club belongs to an organization,
    // check if user is an organization admin
    if (!authResult.authorized && court.club.organizationId) {
      const orgAuthResult = await requireRole({
        contextType: "organization",
        contextId: court.club.organizationId,
        allowedRoles: [MembershipRole.ORGANIZATION_ADMIN],
      });

      if (!orgAuthResult.authorized) {
        return authResult.response; // Return the original club auth error
      }
      // User is authorized as org admin, continue
    } else if (!authResult.authorized) {
      return authResult.response;
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Save the image file
    const uploadResult = await saveImageFile(file);

    // Update the court with the image URL
    await prisma.court.update({
      where: { id: courtId },
      data: { imageUrl: uploadResult.url },
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      filename: uploadResult.filename,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error uploading court image:", error);
    }

    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
