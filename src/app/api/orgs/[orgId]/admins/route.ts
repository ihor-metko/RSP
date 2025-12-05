import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAdmin } from "@/lib/requireRole";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";

/**
 * GET /api/orgs/[orgId]/admins
 * Returns SuperAdmins and Club Admins for the organization with their assigned clubs.
 * Allowed: isRoot OR ORGANIZATION_ADMIN of this org
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    const authResult = await requireOrganizationAdmin(orgId);
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

    // Fetch SuperAdmins (Organization Admins)
    const superAdmins = await prisma.membership.findMany({
      where: {
        organizationId: orgId,
        role: MembershipRole.ORGANIZATION_ADMIN,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: [{ isPrimaryOwner: "desc" }, { createdAt: "asc" }],
    });

    // Get all clubs in this organization
    const clubs = await prisma.club.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
      },
    });

    const clubIds = clubs.map((c) => c.id);

    // Fetch Club Admins
    const clubAdmins =
      clubIds.length > 0
        ? await prisma.clubMembership.findMany({
            where: {
              clubId: { in: clubIds },
              role: ClubMembershipRole.CLUB_ADMIN,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  lastLoginAt: true,
                },
              },
              club: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          })
        : [];

    // Format SuperAdmins
    const formattedSuperAdmins = superAdmins.map((m) => ({
      id: m.id,
      type: "superadmin" as const,
      userId: m.user.id,
      userName: m.user.name,
      userEmail: m.user.email,
      isPrimaryOwner: m.isPrimaryOwner,
      lastLoginAt: m.user.lastLoginAt,
      createdAt: m.createdAt,
    }));

    // Format Club Admins and group by user
    const clubAdminsByUser = new Map<
      string,
      {
        id: string;
        type: "clubadmin";
        userId: string;
        userName: string | null;
        userEmail: string;
        lastLoginAt: Date | null;
        clubs: Array<{ id: string; name: string; membershipId: string }>;
        createdAt: Date;
      }
    >();

    for (const ca of clubAdmins) {
      const existing = clubAdminsByUser.get(ca.user.id);
      if (existing) {
        existing.clubs.push({
          id: ca.club.id,
          name: ca.club.name,
          membershipId: ca.id,
        });
      } else {
        clubAdminsByUser.set(ca.user.id, {
          id: ca.id,
          type: "clubadmin",
          userId: ca.user.id,
          userName: ca.user.name,
          userEmail: ca.user.email,
          lastLoginAt: ca.user.lastLoginAt,
          clubs: [
            {
              id: ca.club.id,
              name: ca.club.name,
              membershipId: ca.id,
            },
          ],
          createdAt: ca.createdAt,
        });
      }
    }

    const formattedClubAdmins = Array.from(clubAdminsByUser.values());

    return NextResponse.json({
      superAdmins: formattedSuperAdmins,
      clubAdmins: formattedClubAdmins,
      summary: {
        totalSuperAdmins: formattedSuperAdmins.length,
        totalClubAdmins: formattedClubAdmins.length,
        totalClubs: clubs.length,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching organization admins:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
