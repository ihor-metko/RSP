import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubAdminManagement } from "@/lib/requireRole";
import { ClubMembershipRole } from "@/constants/roles";

/**
 * PUT /api/orgs/[orgId]/club-admins/[clubAdminId]
 * Update a Club Admin's assignment (reassign to a different club).
 * Payload: { clubId }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orgId: string; clubAdminId: string }> }
) {
  try {
    const { orgId, clubAdminId } = await params;

    const authResult = await requireClubAdminManagement(orgId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body = await request.json();
    const { clubId } = body;

    if (!clubId) {
      return NextResponse.json(
        { error: "Club ID is required" },
        { status: 400 }
      );
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Find the existing club membership
    const existingMembership = await prisma.clubMembership.findUnique({
      where: { id: clubAdminId },
      include: {
        club: true,
      },
    });

    if (!existingMembership) {
      return NextResponse.json(
        { error: "Club admin membership not found" },
        { status: 404 }
      );
    }

    // Verify the existing membership is for a club in this organization
    if (existingMembership.club.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Club admin does not belong to this organization" },
        { status: 403 }
      );
    }

    // Verify the new club exists and belongs to this organization
    const newClub = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!newClub) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    if (newClub.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Target club does not belong to this organization" },
        { status: 403 }
      );
    }

    // Check if user already has a CLUB_ADMIN membership for the new club
    if (clubId !== existingMembership.clubId) {
      const duplicateMembership = await prisma.clubMembership.findUnique({
        where: {
          userId_clubId: {
            userId: existingMembership.userId,
            clubId,
          },
        },
      });

      if (duplicateMembership) {
        return NextResponse.json(
          { error: "User already has a membership in the target club" },
          { status: 409 }
        );
      }
    }

    // Update the club membership
    const updatedMembership = await prisma.clubMembership.update({
      where: { id: clubAdminId },
      data: { clubId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Club Admin updated successfully",
      clubAdmin: {
        id: updatedMembership.id,
        userId: updatedMembership.user.id,
        userName: updatedMembership.user.name,
        userEmail: updatedMembership.user.email,
        clubId: updatedMembership.club.id,
        clubName: updatedMembership.club.name,
        createdAt: updatedMembership.createdAt,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating club admin:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orgs/[orgId]/club-admins/[clubAdminId]
 * Remove a Club Admin's role (delete the ClubMembership).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orgId: string; clubAdminId: string }> }
) {
  try {
    const { orgId, clubAdminId } = await params;

    const authResult = await requireClubAdminManagement(orgId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Find the existing club membership
    const existingMembership = await prisma.clubMembership.findUnique({
      where: { id: clubAdminId },
      include: {
        club: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!existingMembership) {
      return NextResponse.json(
        { error: "Club admin membership not found" },
        { status: 404 }
      );
    }

    // Verify the membership is for a club in this organization
    if (existingMembership.club.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Club admin does not belong to this organization" },
        { status: 403 }
      );
    }

    // Verify it's a CLUB_ADMIN membership
    if (existingMembership.role !== ClubMembershipRole.CLUB_ADMIN) {
      return NextResponse.json(
        { error: "Membership is not a Club Admin role" },
        { status: 400 }
      );
    }

    // Delete the membership
    await prisma.clubMembership.delete({
      where: { id: clubAdminId },
    });

    return NextResponse.json({
      success: true,
      message: "Club Admin removed successfully",
      removedAdmin: {
        id: existingMembership.id,
        userId: existingMembership.user.id,
        userName: existingMembership.user.name,
        userEmail: existingMembership.user.email,
        clubId: existingMembership.club.id,
        clubName: existingMembership.club.name,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error removing club admin:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
