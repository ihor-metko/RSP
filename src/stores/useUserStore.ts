import { create } from "zustand";
import type { MeResponse, AdminStatus, MembershipInfo, ClubMembershipInfo } from "@/app/api/me/route";

/**
 * User object type for the store
 */
export interface User {
  id: string;
  email: string | null;
  name: string | null;
  isRoot: boolean;
}

/**
 * Admin type constants
 */
export const ADMIN_TYPE = {
  ROOT: "root_admin",
  ORGANIZATION: "organization_admin",
  CLUB: "club_admin",
  NONE: "none",
} as const;

/**
 * Role constants for the store
 */
export const USER_ROLE = {
  ROOT_ADMIN: "ROOT_ADMIN",
  ORGANIZATION_ADMIN: "ORGANIZATION_ADMIN",
  CLUB_ADMIN: "CLUB_ADMIN",
} as const;

/**
 * User store state interface
 */
interface UserState {
  // State
  user: User | null;
  roles: string[];
  isLoggedIn: boolean;
  isLoading: boolean;
  adminStatus: AdminStatus | null;
  memberships: MembershipInfo[];
  clubMemberships: ClubMembershipInfo[];

  // Actions
  setUser: (user: User | null) => void;
  setRoles: (roles: string[]) => void;
  loadUser: () => Promise<void>;
  reloadUser: () => Promise<void>;
  clearUser: () => void;
  
  // Role checks
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  
  // Admin checks
  isAdmin: () => boolean;
  isOrgAdmin: (orgId?: string) => boolean;
  isClubAdmin: (clubId?: string) => boolean;
}

/**
 * Zustand store for managing authenticated user state and roles.
 * 
 * This store is the centralized source of truth for:
 * - User authentication state
 * - User roles (ROOT_ADMIN, ORGANIZATION_ADMIN, CLUB_ADMIN)
 * - Role-based authorization helpers
 * 
 * All role checks should be done through this store's helpers (hasRole, hasAnyRole)
 * to maintain consistency across the application.
 * 
 * @example
 * // Check if user has a specific role
 * const hasRole = useUserStore(state => state.hasRole);
 * if (hasRole("ROOT_ADMIN")) {
 *   // Root admin only logic
 * }
 * 
 * @example
 * // Check if user has any of multiple roles
 * const hasAnyRole = useUserStore(state => state.hasAnyRole);
 * if (hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN"])) {
 *   // Admin logic
 * }
 * 
 * @example
 * // Load user on app start
 * const loadUser = useUserStore(state => state.loadUser);
 * useEffect(() => {
 *   loadUser();
 * }, []);
 */
export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  user: null,
  roles: [],
  isLoggedIn: false,
  isLoading: false,
  adminStatus: null,
  memberships: [],
  clubMemberships: [],

  /**
   * Set the current user and update isLoggedIn status
   */
  setUser: (user: User | null) => {
    set({
      user,
      isLoggedIn: !!user,
    });
  },

  /**
   * Set the roles for the current user
   */
  setRoles: (roles: string[]) => {
    set({ roles });
  },

  /**
   * Load the current user from the API
   * Fetches consolidated user info and admin status from /api/me
   */
  loadUser: async () => {
    set({ isLoading: true });
    try {
      // Fetch consolidated user info and admin status
      const meResponse = await fetch("/api/me");
      
      if (!meResponse.ok) {
        // User is not authenticated
        set({
          user: null,
          roles: [],
          isLoggedIn: false,
          isLoading: false,
          adminStatus: null,
          memberships: [],
          clubMemberships: [],
        });
        return;
      }

      const meData: MeResponse = await meResponse.json();
      
      // Build user object
      const user: User = {
        id: meData.userId,
        email: meData.email,
        name: meData.name,
        isRoot: meData.isRoot,
      };

      // Map admin type to role
      let roles: string[] = [];
      const roleMap: Record<string, string> = {
        [ADMIN_TYPE.ROOT]: USER_ROLE.ROOT_ADMIN,
        [ADMIN_TYPE.ORGANIZATION]: USER_ROLE.ORGANIZATION_ADMIN,
        [ADMIN_TYPE.CLUB]: USER_ROLE.CLUB_ADMIN,
      };
      
      const role = roleMap[meData.adminStatus.adminType];
      if (role) {
        roles = [role];
      }

      set({
        user,
        roles,
        isLoggedIn: true,
        isLoading: false,
        adminStatus: meData.adminStatus,
        memberships: meData.memberships,
        clubMemberships: meData.clubMemberships,
      });
    } catch (error) {
      console.error("Failed to load user:", error);
      set({
        user: null,
        roles: [],
        isLoggedIn: false,
        isLoading: false,
        adminStatus: null,
        memberships: [],
        clubMemberships: [],
      });
    }
  },

  /**
   * Force reload the current user from the API
   * Use this after role changes or membership updates
   */
  reloadUser: async () => {
    await get().loadUser();
  },

  /**
   * Clear user state (logout)
   */
  clearUser: () => {
    set({
      user: null,
      roles: [],
      isLoggedIn: false,
      isLoading: false,
      adminStatus: null,
      memberships: [],
      clubMemberships: [],
    });
  },

  /**
   * Check if the current user has a specific role
   * 
   * Supported admin roles:
   * - ROOT_ADMIN: Platform root administrator
   * - ORGANIZATION_ADMIN: Organization administrator
   * - CLUB_ADMIN: Club administrator
   * 
   * Note: This store only manages admin roles. Context-specific membership roles
   * (e.g., MEMBER in an organization or club) are handled server-side via the
   * requireRole helper with appropriate context.
   * 
   * @param role - The role to check
   * @returns true if the user has the role, false otherwise
   */
  hasRole: (role: string) => {
    const { roles } = get();
    return roles.includes(role);
  },

  /**
   * Check if the current user has any of the specified roles
   * 
   * @param roles - Array of roles to check
   * @returns true if the user has at least one of the roles, false otherwise
   */
  hasAnyRole: (roles: string[]) => {
    const { roles: userRoles } = get();
    return roles.some(role => userRoles.includes(role));
  },

  /**
   * Check if the current user is an admin (any admin type)
   * 
   * @returns true if the user is any type of admin, false otherwise
   */
  isAdmin: () => {
    const { adminStatus } = get();
    return adminStatus?.isAdmin ?? false;
  },

  /**
   * Check if the current user is an organization admin
   * 
   * @param orgId - Optional organization ID to check if user is admin of that specific org
   * @returns true if the user is an org admin (and of the specific org if provided), false otherwise
   */
  isOrgAdmin: (orgId?: string) => {
    const { adminStatus, user } = get();
    
    // Root admins have access to all organizations
    if (user?.isRoot) {
      return true;
    }

    if (adminStatus?.adminType !== "organization_admin") {
      return false;
    }

    // If no specific orgId is provided, just check if user is an org admin
    if (!orgId) {
      return true;
    }

    // Check if user manages the specific organization
    return adminStatus.managedIds.includes(orgId);
  },

  /**
   * Check if the current user is a club admin
   * 
   * @param clubId - Optional club ID to check if user is admin of that specific club
   * @returns true if the user is a club admin (and of the specific club if provided), false otherwise
   * 
   * Note: Organization admins have access to all clubs within their organizations.
   * This check only verifies if the user has the CLUB_ADMIN role for a specific club.
   * For checking access to clubs within an organization's scope, use server-side
   * authorization with the full context.
   */
  isClubAdmin: (clubId?: string) => {
    const { adminStatus, user } = get();
    
    // Root admins have access to all clubs
    if (user?.isRoot) {
      return true;
    }

    // Check if user has club_admin role
    if (adminStatus?.adminType !== "club_admin") {
      return false;
    }

    // If no specific clubId is provided, just check if user is a club admin
    if (!clubId) {
      return true;
    }

    // Check if user manages the specific club
    return adminStatus.managedIds.includes(clubId);
  },
}));

/**
 * Convenience hook to check if user is logged in
 */
export const useIsLoggedIn = () => useUserStore(state => state.isLoggedIn);

/**
 * Convenience hook to check if user has a specific role
 */
export const useHasRole = (role: string) => useUserStore(state => state.hasRole(role));

/**
 * Convenience hook to check if user has any of the specified roles
 */
export const useHasAnyRole = (roles: string[]) => useUserStore(state => state.hasAnyRole(roles));

/**
 * Convenience hook to get the current user
 */
export const useCurrentUser = () => useUserStore(state => state.user);

// Note: For membership role enums (MEMBER, etc.), import directly from @/constants/roles
// This store only manages admin-level roles
