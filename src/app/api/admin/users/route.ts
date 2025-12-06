import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetUsersForAdmin } from "@/services/mockApiHandlers";

/**
 * GET /api/admin/users
 * Returns list of users for admin selection (root admin only)
 * Supports search query via ?q= parameter
 */
export async function GET(request: Request) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const users = await mockGetUsersForAdmin(query);
      return NextResponse.json(users);
    }

    const users = await prisma.user.findMany({
      where: {
        isRoot: false, // Exclude root admins
        ...(query && {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        memberships: {
          where: {
            role: "ORGANIZATION_ADMIN",
          },
          select: {
            organization: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      isOrgAdmin: user.memberships.length > 0,
      organizationName: user.memberships[0]?.organization.name || null,
    }));

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
