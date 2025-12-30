import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { Prisma } from "@prisma/client";

/**
 * GET /api/admin/users
 * Returns list of users for admin selection with role-scoped visibility
 * Supports search query via ?q= parameter
 * 
 * Access control:
 * - Root Admin: Can see all users
 * - Organization Admin: Can see users from clubs in their organizations
 * - Club Admin: Can see users from their clubs
 */
export async function GET(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { isRoot, adminType, managedIds } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    // Build where conditions
    const whereConditions: Prisma.UserWhereInput[] = [
      { isRoot: false }, // Exclude root users from results
    ];

    // Apply search filter if provided
    if (query) {
      whereConditions.push({
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      });
    }

    // Apply role-based access control scope filtering
    if (!isRoot) {
      if (adminType === "organization_admin") {
        // Organization admins can only see users from clubs in their organization(s)
        whereConditions.push({
          clubMemberships: {
            some: {
              club: {
                organizationId: { in: managedIds },
              },
            },
          },
        });
      } else if (adminType === "club_admin" || adminType === "club_owner") {
        // Club admins/owners can only see users from their specific club(s)
        whereConditions.push({
          clubMemberships: {
            some: {
              clubId: { in: managedIds },
            },
          },
        });
      }
    }

    const where: Prisma.UserWhereInput = { AND: whereConditions };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        memberships: {
          where: {
            role: "ORGANIZATION_ADMIN",
          },
          select: {
            id: true,
            organizationId: true,
            isPrimaryOwner: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        clubMemberships: {
          where: {
            role: {
              in: ["CLUB_OWNER", "CLUB_ADMIN"],
            },
          },
          select: {
            id: true,
            clubId: true,
            role: true,
            club: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    // Transform users to include role information in the same format as /api/admin/users/search
    const formattedUsers = users.map((user) => {
      const roles: Array<{
        type: "organization" | "club";
        role: "owner" | "admin";
        contextId: string;
        contextName: string;
      }> = [];

      // Add organization admin roles (already filtered to ORGANIZATION_ADMIN)
      user.memberships.forEach((membership) => {
        roles.push({
          type: "organization",
          role: membership.isPrimaryOwner ? "owner" : "admin",
          contextId: membership.organizationId,
          contextName: membership.organization.name,
        });
      });

      // Add club admin/owner roles (already filtered to CLUB_OWNER and CLUB_ADMIN)
      user.clubMemberships.forEach((membership) => {
        roles.push({
          type: "club",
          role: membership.role === "CLUB_OWNER" ? "owner" : "admin",
          contextId: membership.clubId,
          contextName: membership.club.name,
        });
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        roles,
      };
    });

    return NextResponse.json(formattedUsers);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching users:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
