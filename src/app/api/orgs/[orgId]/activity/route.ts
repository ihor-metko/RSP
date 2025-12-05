import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAdmin } from "@/lib/requireRole";
import { TargetType } from "@/lib/auditLog";

/**
 * GET /api/orgs/[orgId]/activity
 * Returns audit log / activity feed for the organization.
 * Allowed: isRoot OR ORGANIZATION_ADMIN of this org
 * 
 * Query params:
 * - limit: number of entries to return (default 20, max 100)
 * - cursor: cursor for pagination (log id)
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

    // Parse query parameters
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");

    const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 100);

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

    // Fetch audit logs for this organization
    const logs = await prisma.auditLog.findMany({
      where: {
        targetType: TargetType.ORGANIZATION,
        targetId: orgId,
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: "desc" },
    });

    // Check if there are more results
    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, -1) : logs;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Get actor details for the logs
    const actorIds = [...new Set(items.map((log) => log.actorId))];
    const actors = await prisma.user.findMany({
      where: {
        id: { in: actorIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const actorMap = new Map(actors.map((a) => [a.id, a]));

    // Format response
    const formattedLogs = items.map((log) => {
      const actor = actorMap.get(log.actorId);
      return {
        id: log.id,
        action: log.action,
        actor: actor
          ? {
              id: actor.id,
              name: actor.name,
              email: actor.email,
            }
          : {
              id: log.actorId,
              name: null,
              email: null,
            },
        detail: log.detail ? JSON.parse(log.detail) : null,
        createdAt: log.createdAt,
      };
    });

    return NextResponse.json({
      items: formattedLogs,
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching organization activity:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
