/**
 * Store Access Helpers and Enforcement
 * 
 * This file provides helper functions to ensure proper usage of Zustand stores
 * and prevent implicit refetching or unstable rendering patterns.
 * 
 * Rules:
 * 1. All domain data (organizations, clubs, bookings) must be accessed via stores
 * 2. No direct fetch calls in pages or components for domain data
 * 3. Data fetching must happen only inside store actions
 * 4. Use these helpers to prevent implicit fetches and ensure proper context
 */

import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useClubStore } from "@/stores/useClubStore";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { usePlayerClubStore } from "@/stores/usePlayerClubStore";
import type { OrganizationDetail } from "@/stores/useOrganizationStore";
import type { ClubDetail } from "@/types/club";
import type { PlayerClubDetail } from "@/stores/usePlayerClubStore";

/**
 * Ensure organization is loaded by ID with proper context
 * 
 * This helper prevents duplicate fetches and ensures organization data
 * is loaded from the store with proper caching and inflight guards.
 * 
 * @param organizationId - The organization ID to ensure is loaded
 * @param options - Optional configuration
 * @returns Promise<OrganizationDetail>
 * 
 * @example
 * ```tsx
 * const org = await ensureOrganizationContext('org-123');
 * // Organization is now guaranteed to be in the store
 * ```
 */
export async function ensureOrganizationContext(
  organizationId: string,
  options?: { force?: boolean }
): Promise<OrganizationDetail> {
  const store = useOrganizationStore.getState();
  return store.ensureOrganizationById(organizationId, options);
}

/**
 * Ensure club is loaded by ID with proper context (Admin)
 * 
 * This helper prevents duplicate fetches and ensures club data
 * is loaded from the admin store with proper caching and inflight guards.
 * 
 * @param clubId - The club ID to ensure is loaded
 * @param options - Optional configuration
 * @returns Promise<ClubDetail>
 * 
 * @example
 * ```tsx
 * const club = await ensureAdminClubContext('club-123');
 * // Club is now guaranteed to be in the admin store
 * ```
 */
export async function ensureAdminClubContext(
  clubId: string,
  options?: { force?: boolean }
): Promise<ClubDetail> {
  const store = useAdminClubStore.getState();
  return store.ensureClubById(clubId, options);
}

/**
 * Ensure club is loaded by ID with proper context (Player)
 * 
 * This helper prevents duplicate fetches and ensures public club data
 * is loaded from the player store with proper caching and inflight guards.
 * 
 * @param clubId - The club ID to ensure is loaded
 * @param options - Optional configuration
 * @returns Promise<PlayerClubDetail>
 * 
 * @example
 * ```tsx
 * const club = await ensurePlayerClubContext('club-123');
 * // Club is now guaranteed to be in the player store
 * ```
 */
export async function ensurePlayerClubContext(
  clubId: string,
  options?: { force?: boolean }
): Promise<PlayerClubDetail> {
  const store = usePlayerClubStore.getState();
  return store.ensureClubById(clubId, options);
}

/**
 * @deprecated Use ensureAdminClubContext or ensurePlayerClubContext instead
 * Ensure club is loaded by ID with proper context
 * 
 * This helper prevents duplicate fetches and ensures club data
 * is loaded from the store with proper caching and inflight guards.
 * 
 * @param clubId - The club ID to ensure is loaded
 * @param options - Optional configuration
 * @returns Promise<ClubDetail>
 * 
 * @example
 * ```tsx
 * const club = await ensureClubContext('club-123');
 * // Club is now guaranteed to be in the store
 * ```
 */
export async function ensureClubContext(
  clubId: string,
  options?: { force?: boolean }
): Promise<ClubDetail> {
  const store = useClubStore.getState();
  return store.ensureClubById(clubId, options);
}

/**
 * Ensure clubs are loaded for an organization (Admin)
 * 
 * This helper prevents duplicate fetches and ensures club list is loaded
 * from the admin store with proper organization context.
 * 
 * @param organizationId - The organization ID to load clubs for
 * @param options - Optional configuration
 * @returns Promise<void>
 * 
 * @example
 * ```tsx
 * await ensureAdminClubsForOrganization('org-123');
 * const clubs = useAdminClubStore.getState().clubs;
 * ```
 */
export async function ensureAdminClubsForOrganization(
  organizationId: string | null,
  options?: { force?: boolean }
): Promise<void> {
  const store = useAdminClubStore.getState();
  return store.fetchClubsIfNeeded({ organizationId, force: options?.force });
}

/**
 * Ensure clubs are loaded (Player)
 * 
 * This helper prevents duplicate fetches and ensures public club list is loaded
 * from the player store.
 * 
 * @param options - Optional configuration (search, city filters)
 * @returns Promise<void>
 * 
 * @example
 * ```tsx
 * await ensurePlayerClubs({ search: 'tennis' });
 * const clubs = usePlayerClubStore.getState().clubs;
 * ```
 */
export async function ensurePlayerClubs(
  options?: { force?: boolean; search?: string; city?: string }
): Promise<void> {
  const store = usePlayerClubStore.getState();
  return store.fetchClubsIfNeeded(options);
}

/**
 * @deprecated Use ensureAdminClubsForOrganization or ensurePlayerClubs instead
 * Ensure clubs are loaded for an organization
 * 
 * This helper prevents duplicate fetches and ensures club list is loaded
 * from the store with proper organization context.
 * 
 * @param organizationId - The organization ID to load clubs for
 * @param options - Optional configuration
 * @returns Promise<void>
 * 
 * @example
 * ```tsx
 * await ensureClubsForOrganization('org-123');
 * const clubs = useClubStore.getState().clubs;
 * ```
 */
export async function ensureClubsForOrganization(
  organizationId: string | null,
  options?: { force?: boolean }
): Promise<void> {
  const store = useClubStore.getState();
  return store.fetchClubsIfNeeded({ organizationId, force: options?.force });
}

/**
 * Safe selector pattern for organizations
 * 
 * Use this to select organization data from the store without triggering
 * re-renders when unrelated state changes.
 * 
 * @param selector - Function to select specific data from organizations
 * @returns Hook to use in components
 * 
 * @example
 * ```tsx
 * const useOrgNames = selectOrganizations(orgs => orgs.map(o => o.name));
 * const names = useOrgNames();
 * ```
 */
export function selectOrganizations<T>(
  selector: (orgs: ReturnType<typeof useOrganizationStore.getState>["organizations"]) => T
) {
  return () => useOrganizationStore((state) => selector(state.organizations));
}

/**
 * Safe selector pattern for clubs (Admin)
 * 
 * Use this to select club data from the admin store without triggering
 * re-renders when unrelated state changes.
 * 
 * @param selector - Function to select specific data from clubs
 * @returns Hook to use in components
 * 
 * @example
 * ```tsx
 * const useClubNames = selectAdminClubs(clubs => clubs.map(c => c.name));
 * const names = useClubNames();
 * ```
 */
export function selectAdminClubs<T>(
  selector: (clubs: ReturnType<typeof useAdminClubStore.getState>["clubs"]) => T
) {
  return () => useAdminClubStore((state) => selector(state.clubs));
}

/**
 * Safe selector pattern for clubs (Player)
 * 
 * Use this to select club data from the player store without triggering
 * re-renders when unrelated state changes.
 * 
 * @param selector - Function to select specific data from clubs
 * @returns Hook to use in components
 * 
 * @example
 * ```tsx
 * const useClubNames = selectPlayerClubs(clubs => clubs.map(c => c.name));
 * const names = useClubNames();
 * ```
 */
export function selectPlayerClubs<T>(
  selector: (clubs: ReturnType<typeof usePlayerClubStore.getState>["clubs"]) => T
) {
  return () => usePlayerClubStore((state) => selector(state.clubs));
}

/**
 * @deprecated Use selectAdminClubs or selectPlayerClubs instead
 * Safe selector pattern for clubs
 * 
 * Use this to select club data from the store without triggering
 * re-renders when unrelated state changes.
 * 
 * @param selector - Function to select specific data from clubs
 * @returns Hook to use in components
 * 
 * @example
 * ```tsx
 * const useClubNames = selectClubs(clubs => clubs.map(c => c.name));
 * const names = useClubNames();
 * ```
 */
export function selectClubs<T>(
  selector: (clubs: ReturnType<typeof useClubStore.getState>["clubs"]) => T
) {
  return () => useClubStore((state) => selector(state.clubs));
}

/**
 * Invalidate organization cache
 * 
 * Use this when you need to force a refetch of organizations,
 * for example after creating or updating an organization.
 * 
 * @example
 * ```tsx
 * await createOrganization(data);
 * invalidateOrganizations(); // Force refetch on next access
 * ```
 */
export function invalidateOrganizations(): void {
  const store = useOrganizationStore.getState();
  // Force refetch by calling refetch
  store.refetch();
}

/**
 * Invalidate club cache (Admin)
 * 
 * Use this when you need to force a refetch of clubs from admin store,
 * for example after creating or updating a club.
 * 
 * @example
 * ```tsx
 * await createClub(data);
 * invalidateAdminClubs(); // Force refetch on next access
 * ```
 */
export function invalidateAdminClubs(): void {
  const store = useAdminClubStore.getState();
  store.invalidateClubs();
}

/**
 * Invalidate club cache (Player)
 * 
 * Use this when you need to force a refetch of clubs from player store,
 * for example when search filters change.
 * 
 * @example
 * ```tsx
 * invalidatePlayerClubs(); // Force refetch on next access
 * ```
 */
export function invalidatePlayerClubs(): void {
  const store = usePlayerClubStore.getState();
  store.invalidateClubs();
}

/**
 * @deprecated Use invalidateAdminClubs or invalidatePlayerClubs instead
 * Invalidate club cache
 * 
 * Use this when you need to force a refetch of clubs,
 * for example after creating or updating a club.
 * 
 * @example
 * ```tsx
 * await createClub(data);
 * invalidateClubs(); // Force refetch on next access
 * ```
 */
export function invalidateClubs(): void {
  const store = useClubStore.getState();
  store.invalidateClubs();
}

/**
 * Type guard to check if a fetch operation is for domain data
 * 
 * This helps identify if a fetch call should be replaced with store access.
 * Domain data includes organizations, clubs, and bookings.
 * 
 * Exceptions (not domain data, direct fetch is OK):
 * - Specialized operations (image uploads, admin assignments)
 * - Public endpoints with server-side filtering
 * - User-specific queries (player bookings, user profile)
 * - Reporting endpoints (admin lists with pagination/filtering)
 * 
 * @param url - The URL being fetched
 * @returns boolean - true if this is domain data that should use stores
 * 
 * @example
 * ```tsx
 * if (isDomainDataFetch('/api/clubs/123')) {
 *   // Should use: useClubStore.ensureClubById('123')
 *   // NOT: fetch('/api/clubs/123')
 * }
 * ```
 */
export function isDomainDataFetch(url: string): boolean {
  // Match domain data patterns (base resources without specialized operations)
  const domainPatterns = [
    /^\/api\/admin\/organizations(?:\/[^/]+)?$/,  // /api/admin/organizations or /api/admin/organizations/:id
    /^\/api\/orgs\/[^/]+$/,                       // /api/orgs/:id
    /^\/api\/admin\/clubs(?:\/[^/]+)?$/,         // /api/admin/clubs or /api/admin/clubs/:id
    /^\/api\/clubs\/[^/]+$/,                     // /api/clubs/:id (single club)
  ];

  // Exceptions - these are specialized operations, not domain data
  const operationPatterns = [
    /\/images$/,                                  // Image upload operations
    /\/assign-admin$/,                           // Admin assignment operations
    /\/remove-admin$/,                           // Admin removal operations
    /\/set-owner$/,                              // Owner change operations
    /\/section$/,                                // Section update operations
    /\/payment-accounts/,                        // Payment operations
    /\/price-rules/,                             // Price rule operations
    /\/club-admins/,                             // Club admin management
    // Query parameters that indicate reporting/filtering operations (not single resource fetch)
    /\?(.*&)?(page|perPage|search|q|filter|sort|status|organizationId|clubId|userId|dateFrom|dateTo)=/,
  ];

  // Check if it matches domain patterns
  const isDomain = domainPatterns.some(pattern => pattern.test(url));
  
  // Check if it's an exception (specialized operation)
  const isOperation = operationPatterns.some(pattern => pattern.test(url));

  // It's domain data if it matches domain patterns AND is not an operation
  return isDomain && !isOperation;
}
