import { useEffect, useState, useCallback, useRef } from "react";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { useClubBookingsStore } from "@/stores/useClubBookingsStore";
import { useClubAdminsStore } from "@/stores/useClubAdminsStore";
import type { ClubDetail } from "@/types/club";

/**
 * Options for controlling what data to load
 */
interface UseClubPageDataOptions {
  /**
   * Whether to load bookings preview immediately (default: true)
   */
  loadBookings?: boolean;

  /**
   * Whether to load club admins immediately (default: true)
   */
  loadAdmins?: boolean;

  /**
   * Whether to force refresh all data (default: false)
   */
  forceRefresh?: boolean;
}

/**
 * Orchestration hook for Club Details page
 * 
 * This hook coordinates fetching and caching of all club-related data:
 * - Club basic info (from useAdminClubStore)
 * - Club admins (from useClubAdminsStore)
 * - Bookings preview (from useClubBookingsStore)
 * 
 * Features:
 * - Prevents duplicate API calls through store-based caching
 * - Uses inflight guards to prevent concurrent duplicate requests
 * - Supports lazy loading (load data only when needed)
 * - Returns unified loading/error states
 * 
 * Usage:
 * ```tsx
 * const { club, admins, bookingsPreview, loading, error, refetchClub } = useClubPageData(clubId);
 * 
 * // Lazy load admins when tab opens
 * const { loadAdmins } = useClubPageData(clubId, { loadAdmins: false });
 * useEffect(() => {
 *   if (activeTab === 'admins') {
 *     loadAdmins();
 *   }
 * }, [activeTab]);
 * ```
 */
export function useClubPageData(
  clubId: string | null,
  options: UseClubPageDataOptions = {}
) {
  const {
    loadBookings = true,
    loadAdmins = true,
    forceRefresh = false,
  } = options;

  // Track which data has been loaded to support lazy loading
  const [hasLoadedAdmins, setHasLoadedAdmins] = useState(loadAdmins);
  const [hasLoadedBookings, setHasLoadedBookings] = useState(loadBookings);

  // Track if initial fetch has been triggered for each data type
  const clubFetchTriggeredRef = useRef<string | null>(null);
  const adminsFetchTriggeredRef = useRef<string | null>(null);
  const bookingsFetchTriggeredRef = useRef<string | null>(null);

  // Club store
  const club = useAdminClubStore((state) => state.currentClub);
  const clubsById = useAdminClubStore((state) => state.clubsById);
  const clubLoading = useAdminClubStore((state) => state.loading);
  const clubError = useAdminClubStore((state) => state.error);
  const ensureClubById = useAdminClubStore((state) => state.ensureClubById);
  const fetchClubById = useAdminClubStore((state) => state.fetchClubById);

  // Admins store
  const getClubAdmins = useClubAdminsStore((state) => state.getClubAdmins);
  const adminsLoading = useClubAdminsStore((state) => state.loading);
  const adminsError = useClubAdminsStore((state) => state.error);
  const fetchClubAdminsIfNeeded = useClubAdminsStore(
    (state) => state.fetchClubAdminsIfNeeded
  );

  // Bookings store
  const getBookingsPreview = useClubBookingsStore((state) => state.getBookingsPreview);
  const bookingsLoading = useClubBookingsStore((state) => state.loading);
  const bookingsError = useClubBookingsStore((state) => state.error);
  const fetchBookingsPreviewIfNeeded = useClubBookingsStore(
    (state) => state.fetchBookingsPreviewIfNeeded
  );

  // Get data from stores
  const admins = clubId ? getClubAdmins(clubId) : null;
  const bookingsPreview = clubId ? getBookingsPreview(clubId) : null;

  // Fetch club data on mount or when clubId changes
  useEffect(() => {
    if (!clubId) return;

    // Prevent duplicate fetches for the same clubId
    if (clubFetchTriggeredRef.current === clubId && !forceRefresh) return;
    clubFetchTriggeredRef.current = clubId;

    const fetchClubData = async () => {
      try {
        // Fetch club info and cache it
        await ensureClubById(clubId, { force: forceRefresh });
        
        // Also update currentClub for consistency with existing code
        if (!club || club.id !== clubId) {
          await fetchClubById(clubId);
        }
      } catch (error) {
        console.error("Failed to fetch club data:", error);
      }
    };

    fetchClubData();
    // Note: ensureClubById and fetchClubById are Zustand store actions with stable references
    // that don't change between renders. Including them would not change behavior.
    // The club dependency is intentionally omitted to prevent fetching on every club update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, forceRefresh]);

  // Fetch admins if requested
  useEffect(() => {
    if (!clubId || !hasLoadedAdmins) return;

    // Prevent duplicate fetches for the same clubId
    if (adminsFetchTriggeredRef.current === clubId && !forceRefresh) return;
    adminsFetchTriggeredRef.current = clubId;

    const fetchAdmins = async () => {
      try {
        await fetchClubAdminsIfNeeded(clubId, { force: forceRefresh });
      } catch (error) {
        console.error("Failed to fetch club admins:", error);
      }
    };

    fetchAdmins();
    // Note: fetchClubAdminsIfNeeded is a Zustand store action with a stable reference.
    // Including it would not change behavior but could trigger unnecessary re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, hasLoadedAdmins, forceRefresh]);

  // Fetch bookings if requested
  useEffect(() => {
    if (!clubId || !hasLoadedBookings) return;

    // Prevent duplicate fetches for the same clubId
    if (bookingsFetchTriggeredRef.current === clubId && !forceRefresh) return;
    bookingsFetchTriggeredRef.current = clubId;

    const fetchBookings = async () => {
      try {
        await fetchBookingsPreviewIfNeeded(clubId, { force: forceRefresh });
      } catch (error) {
        console.error("Failed to fetch bookings preview:", error);
      }
    };

    fetchBookings();
    // Note: fetchBookingsPreviewIfNeeded is a Zustand store action with a stable reference.
    // Including it would not change behavior but could trigger unnecessary re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, hasLoadedBookings, forceRefresh]);

  // Lazy load functions for tabs/sections
  const loadAdminsData = useCallback(async () => {
    if (!clubId || hasLoadedAdmins) return;
    setHasLoadedAdmins(true);
  }, [clubId, hasLoadedAdmins]);

  const loadBookingsData = useCallback(async () => {
    if (!clubId || hasLoadedBookings) return;
    setHasLoadedBookings(true);
  }, [clubId, hasLoadedBookings]);

  // Refetch functions for manual refresh
  const refetchClub = useCallback(async () => {
    if (!clubId) return;
    try {
      // Reset fetch trigger to allow refetch
      clubFetchTriggeredRef.current = null;
      await fetchClubById(clubId);
    } catch (error) {
      console.error("Failed to refetch club:", error);
    }
    // Note: fetchClubById is a Zustand store action with a stable reference.
    // Including it would not change behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const refetchAdmins = useCallback(async () => {
    if (!clubId) return;
    try {
      // Reset fetch trigger to allow refetch
      adminsFetchTriggeredRef.current = null;
      await fetchClubAdminsIfNeeded(clubId, { force: true });
    } catch (error) {
      console.error("Failed to refetch admins:", error);
    }
    // Note: fetchClubAdminsIfNeeded is a Zustand store action with a stable reference.
    // Including it would not change behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const refetchBookings = useCallback(async () => {
    if (!clubId) return;
    try {
      // Reset fetch trigger to allow refetch
      bookingsFetchTriggeredRef.current = null;
      await fetchBookingsPreviewIfNeeded(clubId, { force: true });
    } catch (error) {
      console.error("Failed to refetch bookings:", error);
    }
    // Note: fetchBookingsPreviewIfNeeded is a Zustand store action with a stable reference.
    // Including it would not change behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // Page-level loading depends only on club data (base data)
  const isClubLoading = clubLoading;
  
  // Section-specific loading states
  const isAdminsLoading = hasLoadedAdmins && adminsLoading;
  const isBookingsLoading = hasLoadedBookings && bookingsLoading;

  // Unified loading state (true if any data is loading) - DEPRECATED, use specific states
  const loading = isClubLoading || isAdminsLoading || isBookingsLoading;

  // Unified error state (first error encountered)
  const error = clubError || adminsError || bookingsError;

  // Get club from cache or current club
  const clubData: ClubDetail | null = clubId && clubsById[clubId] ? clubsById[clubId] : club;

  return {
    // Data
    club: clubData,
    admins,
    bookingsPreview,

    // Loading states - IMPORTANT: Use specific states, not unified 'loading'
    loading, // DEPRECATED: Only for backward compatibility
    isClubLoading, // Use this for page-level loader
    clubLoading: isClubLoading, // Alias for consistency
    adminsLoading: isAdminsLoading, // Use this for admins section skeleton
    bookingsLoading: isBookingsLoading, // Use this for bookings section skeleton

    // Error states
    error,
    clubError,
    adminsError,
    bookingsError,

    // Lazy load functions
    loadAdmins: loadAdminsData,
    loadBookings: loadBookingsData,

    // Refetch functions
    refetchClub,
    refetchAdmins,
    refetchBookings,
  };
}
