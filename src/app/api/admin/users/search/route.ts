import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";

/**
 * GET /api/admin/users/search
 * Search for users by name, email, username, or phone
 * Returns users with their existing role assignments (organization owner/admin, club owner/admin)
 * 
 * Required permissions:
 * - ROOT_ADMIN, ORGANIZATION_ADMIN, or CLUB_ADMIN
 * 
 * Query params:
 * - q: string (required) - Search query (searches name and email)
 * 
 * Response includes:
 * - users: Array of users with id, name, email, and roles
 * - roles: Array of existing role assignments with type, role, contextId, and contextName
 */
export async function GET(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Search query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Return empty results for very short queries to avoid performance issues
    if (query.trim().length < 2) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const trimmedQuery = query.trim().toLowerCase();

    // Search for users with name or email containing the query (case-insensitive)
    // Also fetch their organization and club memberships to show existing role assignments
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            email: {
              contains: trimmedQuery,
              mode: "insensitive",
            },
          },
          {
            name: {
              contains: trimmedQuery,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        memberships: {
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
      take: 50, // Fetch more initially to allow proper sorting
    });

    // Sort results: exact email match first, then email starts with query, then other matches
    const sortedUsers = users.sort((a, b) => {
      const aEmailLower = a.email.toLowerCase();
      const bEmailLower = b.email.toLowerCase();
      
      // Prioritize exact email matches
      if (aEmailLower === trimmedQuery && bEmailLower !== trimmedQuery) return -1;
      if (bEmailLower === trimmedQuery && aEmailLower !== trimmedQuery) return 1;
      
      // Then prioritize emails that start with the query
      if (aEmailLower.startsWith(trimmedQuery) && !bEmailLower.startsWith(trimmedQuery)) return -1;
      if (bEmailLower.startsWith(trimmedQuery) && !aEmailLower.startsWith(trimmedQuery)) return 1;
      
      // Finally, sort alphabetically by email
      return aEmailLower.localeCompare(bEmailLower);
    }).slice(0, 10); // Return top 10 results

    // Transform users to include role information
    const usersWithRoles = sortedUsers.map(user => {
      const roles: Array<{
        type: "organization" | "club";
        role: "owner" | "admin";
        contextId: string;
        contextName: string;
      }> = [];

      // Add organization roles
      user.memberships.forEach(membership => {
        roles.push({
          type: "organization",
          role: membership.isPrimaryOwner ? "owner" : "admin",
          contextId: membership.organizationId,
          contextName: membership.organization.name,
        });
      });

      // Add club roles
      user.clubMemberships.forEach(membership => {
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

    return NextResponse.json({ users: usersWithRoles }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error searching users:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
