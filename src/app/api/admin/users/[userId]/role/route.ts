import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const VALID_ROLES = ["player", "coach"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function isValidRole(role: unknown): role is ValidRole {
  return typeof role === "string" && VALID_ROLES.includes(role as ValidRole);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await requireRole(request, ["admin"]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const userId = resolvedParams.userId;

    const body = await request.json();
    const { role } = body;

    if (!isValidRole(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'player' or 'coach'" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent modifying admin role
    if (existingUser.role === "admin") {
      return NextResponse.json(
        { error: "Cannot modify admin role" },
        { status: 403 }
      );
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
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
