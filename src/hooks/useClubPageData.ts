import { useEffect, useState, useCallback } from "react";
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
  }, [clubId, forceRefresh, ensureClubById, fetchClubById, club]);

  // Fetch admins if requested
  useEffect(() => {
    if (!clubId || !hasLoadedAdmins) return;

    const fetchAdmins = async () => {
      try {
        await fetchClubAdminsIfNeeded(clubId, { force: forceRefresh });
      } catch (error) {
        console.error("Failed to fetch club admins:", error);
      }
    };

    fetchAdmins();
  }, [clubId, hasLoadedAdmins, forceRefresh, fetchClubAdminsIfNeeded]);

  // Fetch bookings if requested
  useEffect(() => {
    if (!clubId || !hasLoadedBookings) return;

    const fetchBookings = async () => {
      try {
        await fetchBookingsPreviewIfNeeded(clubId, { force: forceRefresh });
      } catch (error) {
        console.error("Failed to fetch bookings preview:", error);
      }
    };

    fetchBookings();
  }, [clubId, hasLoadedBookings, forceRefresh, fetchBookingsPreviewIfNeeded]);

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
      await fetchClubById(clubId);
    } catch (error) {
      console.error("Failed to refetch club:", error);
    }
  }, [clubId, fetchClubById]);

  const refetchAdmins = useCallback(async () => {
    if (!clubId) return;
    try {
      await fetchClubAdminsIfNeeded(clubId, { force: true });
    } catch (error) {
      console.error("Failed to refetch admins:", error);
    }
  }, [clubId, fetchClubAdminsIfNeeded]);

  const refetchBookings = useCallback(async () => {
    if (!clubId) return;
    try {
      await fetchBookingsPreviewIfNeeded(clubId, { force: true });
    } catch (error) {
      console.error("Failed to refetch bookings:", error);
    }
  }, [clubId, fetchBookingsPreviewIfNeeded]);

  // Unified loading state (true if any data is loading)
  const loading = clubLoading || (hasLoadedAdmins && adminsLoading) || (hasLoadedBookings && bookingsLoading);

  // Unified error state (first error encountered)
  const error = clubError || adminsError || bookingsError;

  // Get club from cache or current club
  const clubData: ClubDetail | null = clubId && clubsById[clubId] ? clubsById[clubId] : club;

  return {
    // Data
    club: clubData,
    admins,
    bookingsPreview,

    // Loading states
    loading,
    clubLoading,
    adminsLoading,
    bookingsLoading,

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
