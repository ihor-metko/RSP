import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRoleLegacy as requireRole } from "@/lib/requireRole";

/**
 * @deprecated This archived feature uses the old role-based system.
 * In the new system, roles are context-specific via Membership and ClubMembership.
 * This file is kept for backward compatibility with existing tests.
 */

interface UserWhereClause {
  OR?: { name?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } }[];
  isRoot?: boolean;
}

export async function GET(request: Request) {
  const authResult = await requireRole(request, ["super_admin"]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    const whereClause: UserWhereClause = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Map old role filter to new isRoot field
    if (role === "super_admin" || role === "root_admin") {
      whereClause.isRoot = true;
    } else if (role && ["player", "coach"].includes(role)) {
      whereClause.isRoot = false;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        isRoot: true,
        createdAt: true,
      },
    });

    // Map isRoot to role for backward compatibility
    const mappedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.isRoot ? "root_admin" : "player",
      createdAt: user.createdAt,
    }));

    return NextResponse.json(mappedUsers);
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

export async function POST(request: Request) {
  const authResult = await requireRole(request, ["super_admin"]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await hash(password, 12);

    // Create the user (regular user, not root admin)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isRoot: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isRoot: true,
        createdAt: true,
      },
    });

    // Return with role for backward compatibility
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "player",
      createdAt: user.createdAt,
    }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating user:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
