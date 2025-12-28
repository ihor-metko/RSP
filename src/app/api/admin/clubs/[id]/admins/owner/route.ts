import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ClubMembershipRole, MembershipRole } from "@/constants/roles";

/**
 * PATCH /api/admin/clubs/[id]/admins/owner
 * Sets an admin as the owner of a club.
 * Only Root Admin or Organization Admin can perform this action.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, name: true, organizationId: true },
    });

    if (!club) {
      return NextResponse.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    const isRoot = session.user.isRoot ?? false;

    // Check if user has permission (Root or Organization Admin)
    if (!isRoot && club.organizationId) {
      const orgMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: club.organizationId,
          },
        },
      });

      if (!orgMembership || orgMembership.role !== MembershipRole.ORGANIZATION_ADMIN) {
        return NextResponse.json(
          { error: "Only Root Admin or Organization Admin can transfer club ownership" },
          { status: 403 }
        );
      }
    }

    // Verify target user is a club admin
    const targetMembership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId,
        },
      },
    });

    if (!targetMembership || 
        (targetMembership.role !== ClubMembershipRole.CLUB_ADMIN && 
         targetMembership.role !== ClubMembershipRole.CLUB_OWNER)) {
      return NextResponse.json(
        { error: "Target user must be a club admin" },
        { status: 400 }
      );
    }

    // If already club owner, nothing to do
    if (targetMembership.role === ClubMembershipRole.CLUB_OWNER) {
      return NextResponse.json(
        { error: "User is already the club owner" },
        { status: 400 }
      );
    }

    // Use transaction to ensure consistency
    await prisma.$transaction([
      // Demote current owner(s) to admin
      prisma.clubMembership.updateMany({
        where: {
          clubId,
          role: ClubMembershipRole.CLUB_OWNER,
        },
        data: { role: ClubMembershipRole.CLUB_ADMIN },
      }),
      // Set new owner
      prisma.clubMembership.update({
        where: { id: targetMembership.id },
        data: { role: ClubMembershipRole.CLUB_OWNER },
      }),
    ]);

    // Fetch updated user info
    const newOwner = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Club owner updated successfully",
        owner: {
          id: newOwner!.id,
          name: newOwner!.name,
          email: newOwner!.email,
          role: "owner" as const,
          entity: {
            type: "club" as const,
            id: clubId,
            name: club.name,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error setting club owner:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
