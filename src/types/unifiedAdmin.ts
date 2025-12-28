/**
 * Unified Admin types for both organizations and clubs
 * This consolidates admin/owner management across all container types
 */

/**
 * Container types that can have admins
 */
export type ContainerType = "organization" | "club";

/**
 * Unified admin role that covers both organization and club roles
 */
export type UnifiedAdminRole = 
  | "ORGANIZATION_OWNER"    // Organization primary owner (isPrimaryOwner: true)
  | "ORGANIZATION_ADMIN"    // Organization admin (isPrimaryOwner: false)
  | "CLUB_OWNER"           // Club owner
  | "CLUB_ADMIN";          // Club admin

/**
 * Unified Admin entity that works for both organizations and clubs
 */
export interface UnifiedAdmin {
  id: string;                    // User ID
  name: string | null;
  email: string;
  role: UnifiedAdminRole;
  containerType: ContainerType;
  containerId: string;           // Organization ID or Club ID
  containerName?: string;        // Organization or Club name
  isPrimaryOwner?: boolean;      // Only relevant for organizations
  membershipId?: string;         // Membership or ClubMembership ID
  createdAt?: Date | string;
}

/**
 * Payload for adding an admin
 */
export interface AddAdminPayload {
  containerType: ContainerType;
  containerId: string;
  role: UnifiedAdminRole;
  userSource: "existing" | "new";
  // For existing users
  userId?: string;
  // For new users
  name?: string;
  email?: string;
  phone?: string;
  // For organization owners
  setAsPrimaryOwner?: boolean;
}

/**
 * Payload for removing an admin
 */
export interface RemoveAdminPayload {
  containerType: ContainerType;
  containerId: string;
  userId: string;
}

/**
 * Payload for changing an admin's role
 */
export interface ChangeAdminRolePayload {
  containerType: ContainerType;
  containerId: string;
  userId: string;
  newRole: UnifiedAdminRole;
}

/**
 * Response from admin API operations
 */
export interface AdminOperationResponse {
  success: boolean;
  message?: string;
  admin?: UnifiedAdmin;
}
