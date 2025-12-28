import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";

/**
 * GET /api/admin/users/search
 * Search for users by name, email, username, or phone
 * 
 * Required permissions:
 * - ROOT_ADMIN, ORGANIZATION_ADMIN, or CLUB_ADMIN
 * 
 * Query params:
 * - q: string (required) - Search query (searches name and email)
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
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
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

    return NextResponse.json({ users: sortedUsers }, { status: 200 });
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
