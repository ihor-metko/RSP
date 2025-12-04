import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleLegacy as requireRole } from "@/lib/requireRole";

/**
 * @deprecated This archived feature uses the old role-based system.
 * In the new system, roles are context-specific via Membership and ClubMembership.
 * This file is kept for backward compatibility with existing tests.
 */

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
    const { clubIds, bio, phone } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent modifying root admin
    if (existingUser.isRoot) {
      return NextResponse.json(
        { error: "Cannot modify admin role" },
        { status: 403 }
      );
    }

    // In the new system, coach assignment is done via ClubMembership
    // For backward compatibility, we just create/update Coach records
    if (clubIds && Array.isArray(clubIds) && clubIds.length > 0) {
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

      // Use a transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Get existing coach records for this user
        const existingCoaches = await tx.coach.findMany({
          where: { userId },
        });

        const existingClubIds = existingCoaches
          .filter((c) => c.clubId !== null)
          .map((c) => c.clubId as string);

        const existingClubIdSet = new Set(existingClubIds);
        const newClubIdSet = new Set(clubIds as string[]);

        const clubIdsToAdd = clubIds.filter(
          (id: string) => !existingClubIdSet.has(id)
        );
        const clubIdsToRemove = existingClubIds.filter(
          (id: string) => !newClubIdSet.has(id)
        );

        // Remove coach records for clubs that are no longer selected
        if (clubIdsToRemove.length > 0) {
          const clubIdsToRemoveSet = new Set(clubIdsToRemove);
          const coachesToRemove = existingCoaches.filter(
            (c) => c.clubId && clubIdsToRemoveSet.has(c.clubId)
          );
          const coachIdsToRemove = coachesToRemove.map((c) => c.id);

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
        const coaches = await tx.coach.findMany({
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

        return {
          user: {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            isRoot: existingUser.isRoot,
            createdAt: existingUser.createdAt,
          },
          coaches,
        };
      });

      return NextResponse.json(result);
    }

    // If no clubIds provided, just return user info
    return NextResponse.json({
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        isRoot: existingUser.isRoot,
        createdAt: existingUser.createdAt,
      },
      coaches: [],
    });
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
