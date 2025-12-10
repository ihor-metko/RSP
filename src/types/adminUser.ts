/**
 * Types for admin users management
 */

/**
 * User role type
 */
export type UserRole = "root_admin" | "organization_admin" | "club_admin" | "user";

/**
 * User status type
 */
export type UserStatus = "active" | "blocked" | "suspended" | "invited" | "deleted";

/**
 * Organization reference in user data
 */
export interface OrganizationRef {
  id: string;
  name: string;
}

/**
 * Club reference in user data
 */
export interface ClubRef {
  id: string;
  name: string;
}

/**
 * Admin user from list endpoint (/api/admin/users/list)
 * This is the minimal user data shown in lists
 */
export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  organization: OrganizationRef | null;
  club: ClubRef | null;
  blocked: boolean;
  createdAt: string | Date;
  lastActivity: string | Date | null;
  totalBookings: number;
  bookingsLast30d: number;
}

/**
 * Membership info for detailed user view
 */
export interface UserMembership {
  id: string;
  role: string;
  isPrimaryOwner?: boolean;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Club membership info for detailed user view
 */
export interface UserClubMembership {
  id: string;
  role: string;
  club: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Booking info for detailed user view
 */
export interface UserBooking {
  id: string;
  start: string | Date;
  end: string | Date;
  status: string;
  createdAt: string | Date;
  court: {
    name: string;
    club?: {
      name: string;
    };
  };
}

/**
 * Coach info for detailed user view
 */
export interface UserCoach {
  id: string;
  bio: string | null;
  club: {
    id: string;
    name: string;
  };
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  detail: string | null;
  createdAt: string | Date;
}

/**
 * Allowed actions for user
 */
export interface AllowedActions {
  canBlock: boolean;
  canUnblock: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canViewDetails: boolean;
}

/**
 * View context for scoped views
 */
export interface ViewContext {
  type: "organization" | "club";
  id: string;
  name?: string;
}

/**
 * Admin user detail from detail endpoint (/api/admin/users/[userId])
 * This includes full user details for the detail view
 */
export interface AdminUserDetail {
  id: string;
  name: string | null;
  email: string | null;
  role?: UserRole;
  isRoot?: boolean;
  blocked: boolean;
  createdAt?: string | Date;
  lastLoginAt?: string | Date | null;
  emailVerified?: boolean;
  image?: string | null;
  memberships?: UserMembership[];
  clubMemberships?: UserClubMembership[];
  bookings?: UserBooking[];
  coaches?: UserCoach[];
  totalBookings?: number;
  mfaEnabled?: boolean;
  auditSummary?: AuditLogEntry[];
  viewScope?: "root" | "organization" | "club";
  viewContext?: ViewContext;
  allowedActions?: AllowedActions;
  // For organization-scoped view
  status?: UserStatus;
  lastBookingAt_in_org?: string | Date | null;
  bookingsCount_in_org?: number;
  roles_in_org?: string[];
  recentBookings_in_org?: UserBooking[];
  // For club-scoped view
  lastBookingAt_in_club?: string | Date | null;
  bookings_in_club?: UserBooking[];
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Users list response
 */
export interface AdminUsersListResponse {
  users: AdminUser[];
  pagination: PaginationInfo;
}

/**
 * Filters for users list
 */
export interface UsersFilters {
  search?: string;
  role?: UserRole | null;
  organizationId?: string | null;
  clubId?: string | null;
  status?: UserStatus | UserStatus[] | null;
  sortBy?: "name" | "email" | "createdAt" | "lastLoginAt" | "lastActive" | "totalBookings";
  sortOrder?: "asc" | "desc";
  dateRangeField?: "createdAt" | "lastActive";
  dateFrom?: string | null;
  dateTo?: string | null;
  activeLast30d?: boolean;
  neverBooked?: boolean;
  showOnlyAdmins?: boolean;
  showOnlyUsers?: boolean;
}

/**
 * Simple user for autocomplete/search (from /api/admin/users)
 */
export interface SimpleUser {
  id: string;
  name: string | null;
  email: string | null;
  isOrgAdmin?: boolean;
  organizationName?: string | null;
}

/**
 * Payload for updating user
 */
export interface UpdateUserPayload {
  blocked?: boolean;
}

/**
 * Payload for creating user
 */
export interface CreateUserPayload {
  email: string;
  name: string;
  password?: string;
}
