import { prisma } from "@/lib/prisma";

/**
 * Audit log action types
 */
export const AuditAction = {
  ORG_CREATE: "org.create",
  ORG_UPDATE: "org.update",
  ORG_ARCHIVE: "org.archive",
  ORG_RESTORE: "org.restore",
  ORG_DELETE: "org.delete",
  ORG_REASSIGN_OWNER: "org.reassign_owner",
  ORG_ASSIGN_ADMIN: "org.assign_admin",
  ORG_REMOVE_ADMIN: "org.remove_admin",
  CLUB_CREATE: "club.create",
  CLUB_UPDATE: "club.update",
  CLUB_ARCHIVE: "club.archive",
  CLUB_DELETE: "club.delete",
  USER_BLOCK: "user.block",
  USER_UNBLOCK: "user.unblock",
  USER_DELETE: "user.delete",
  USER_ROLE_CHANGE: "user.role_change",
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

/**
 * Target types for audit logs
 */
export const TargetType = {
  ORGANIZATION: "organization",
  CLUB: "club",
  USER: "user",
  MEMBERSHIP: "membership",
} as const;

export type TargetTypeValue = (typeof TargetType)[keyof typeof TargetType];

/**
 * Create an audit log entry
 * @param actorId - The ID of the user performing the action
 * @param action - The action being performed
 * @param targetType - The type of entity being affected
 * @param targetId - The ID of the entity being affected
 * @param detail - Optional additional context as an object (will be stringified)
 */
export async function auditLog(
  actorId: string,
  action: AuditActionType | string,
  targetType: TargetTypeValue | string,
  targetId: string,
  detail?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        detail: detail ? JSON.stringify(detail) : null,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to create audit log:", error);
    }
  }
}

/**
 * Get audit logs for a specific target
 * @param targetType - The type of entity
 * @param targetId - The ID of the entity
 * @param limit - Maximum number of entries to return
 */
export async function getAuditLogs(
  targetType: TargetTypeValue | string,
  targetId: string,
  limit: number = 50
) {
  return prisma.auditLog.findMany({
    where: {
      targetType,
      targetId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}
