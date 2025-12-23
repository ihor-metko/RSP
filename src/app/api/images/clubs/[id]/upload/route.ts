import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { ClubMembershipRole, MembershipRole } from "@/constants/roles";
import { saveImageFile } from "@/lib/imageUpload";

/**
 * POST /api/images/clubs/[id]/upload
 * Upload images for a specific club
 * 
 * Accepts multipart/form-data with:
 * - file: The image file (jpg, jpeg, png, webp)
 * - type: The image type ("logo" or "heroImage")
 * 
 * Authorization: Club admin, club owner, organization admin (if club belongs to org), or root admin
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clubId } = await params;

    // Verify club exists and get organization ID
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, organizationId: true },
    });

    if (!club) {
      return NextResponse.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    // Check authorization - allow club admins and owners
    const authResult = await requireRole({
      contextType: "club",
      contextId: clubId,
      allowedRoles: [ClubMembershipRole.CLUB_ADMIN, ClubMembershipRole.CLUB_OWNER],
    });

    // If not authorized as club admin/owner and club belongs to an organization,
    // check if user is an organization admin
    if (!authResult.authorized && club.organizationId) {
      const orgAuthResult = await requireRole({
        contextType: "organization",
        contextId: club.organizationId,
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
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!type || !["logo", "heroImage"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid or missing type. Must be 'logo' or 'heroImage'" },
        { status: 400 }
      );
    }

    // Save the image file
    const uploadResult = await saveImageFile(file);

    // Update the club with the image URL
    const updateData: { logo?: string; heroImage?: string } = {};
    if (type === "logo") {
      updateData.logo = uploadResult.url;
    } else if (type === "heroImage") {
      updateData.heroImage = uploadResult.url;
    }

    await prisma.club.update({
      where: { id: clubId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      filename: uploadResult.filename,
      type,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error uploading club image:", error);
    }

    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
