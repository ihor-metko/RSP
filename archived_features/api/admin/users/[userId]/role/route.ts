import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

/**
 * @deprecated This API is archived and will be removed. 
 * User roles are now context-specific via Membership and ClubMembership tables.
 * Use isRoot on User model to identify root admins.
 */

const VALID_ROLES = ["player", "coach"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function isValidRole(role: unknown): role is ValidRole {
  return typeof role === "string" && VALID_ROLES.includes(role as ValidRole);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await requireRole(request, ["super_admin"]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const userId = resolvedParams.userId;

    const body = await request.json();
    const { role, clubIds, bio, phone } = body;

    if (!isValidRole(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'player' or 'coach'" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isRoot: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent modifying root admin (replaced role check with isRoot check)
    if (existingUser.isRoot) {
      return NextResponse.json(
        { error: "Cannot modify root admin" },
        { status: 403 }
      );
    }

    // When assigning coach role, validate that at least one club is selected
    if (role === "coach") {
      if (!clubIds || !Array.isArray(clubIds) || clubIds.length === 0) {
        return NextResponse.json(
          { error: "At least one club must be selected when assigning coach role" },
          { status: 400 }
        );
      }

      // Validate that all provided clubIds exist
      const clubs = await prisma.club.findMany({
        where: { id: { in: clubIds } },
        select: { id: true },
      });

      if (clubs.length !== clubIds.length) {
        return NextResponse.json(
          { error: "One or more selected clubs do not exist" },
          { status: 400 }
        );
      }
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get existing coach records for this user
      const existingCoaches = await tx.coach.findMany({
        where: { userId },
      });

      let coaches: Array<{
        id: string;
        userId: string;
        clubId: string | null;
        bio: string | null;
        phone: string | null;
        createdAt: Date;
      }> = [];

      // If assigning coach role, create/update Coach records for each club
      if (role === "coach") {
        const existingClubIds = existingCoaches
          .filter((c) => c.clubId !== null)
          .map((c) => c.clubId as string);

        // Use Sets for O(1) lookup performance
        const existingClubIdSet = new Set(existingClubIds);
        const newClubIdSet = new Set(clubIds as string[]);

        // Determine which clubs to add and which to remove
        const clubIdsToAdd = clubIds.filter(
          (id: string) => !existingClubIdSet.has(id)
        );
        const clubIdsToRemove = existingClubIds.filter(
          (id: string) => !newClubIdSet.has(id)
        );

        // Remove coach records for clubs that are no longer selected
        if (clubIdsToRemove.length > 0) {
          const clubIdsToRemoveSet = new Set(clubIdsToRemove);
          // First find the coach IDs to remove
          const coachesToRemove = existingCoaches.filter(
            (c) => c.clubId && clubIdsToRemoveSet.has(c.clubId)
          );
          const coachIdsToRemove = coachesToRemove.map((c) => c.id);

          // Delete their availability records
          if (coachIdsToRemove.length > 0) {
            await tx.coachAvailability.deleteMany({
              where: { coachId: { in: coachIdsToRemove } },
            });
          }

          await tx.coach.deleteMany({
            where: {
              userId,
              clubId: { in: clubIdsToRemove },
            },
          });
        }

        // Create coach records for new clubs
        for (const cId of clubIdsToAdd) {
          await tx.coach.create({
            data: {
              userId,
              clubId: cId,
              bio: bio || null,
              phone: phone || null,
            },
          });
        }

        // Fetch the updated coach records
        coaches = await tx.coach.findMany({
          where: { userId },
          select: {
            id: true,
            userId: true,
            clubId: true,
            bio: true,
            phone: true,
            createdAt: true,
          },
        });
      }

      // If changing to player, delete Coach records
      if (role === "player" && existingCoaches.length > 0) {
        const coachIds = existingCoaches.map((c) => c.id);

        // Delete all coach availability records first (due to foreign key constraint)
        if (coachIds.length > 0) {
          await tx.coachAvailability.deleteMany({
            where: {
              coachId: { in: coachIds },
            },
          });
        }

        // Delete coach records
        await tx.coach.deleteMany({
          where: { userId },
        });
      }

      // Get updated user info
      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          isRoot: true,
          createdAt: true,
        },
      });

      return { user: updatedUser, coaches, role };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating user role:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
