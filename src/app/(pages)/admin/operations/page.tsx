"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader, Button, Input } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { useClubStore } from "@/stores/useClubStore";
import { useCourtStore } from "@/stores/useCourtStore";
import { useBookingStore } from "@/stores/useBookingStore";
import {
  DayCalendar,
  TodayBookingsList,
  QuickCreateModal,
  BookingDetailModal,
  OperationsClubSelector,
} from "@/components/club-operations";
import type { OperationsBooking } from "@/types/booking";
import { TableSkeleton } from "@/components/ui/skeletons";
import "./page.css";

/**
 * OperationsPage
 * 
 * Main page for club operations - displays a day view calendar and today's bookings list.
 * Protected route accessible only to admins from the Admin Panel.
 * 
 * Features:
 * - Day view calendar with courts as columns
 * - Click empty slots to create bookings
 * - Click bookings to view details and cancel
 * - Side panel with today's bookings list
 * - Auto-refresh via short-polling (15-30s)
 * - Date picker to view different days
 * - Club selector for Organization Admins and Root Admins
 * - Auto-selection for Club Admins (their assigned club)
 */
export default function OperationsPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  // User store
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingUser = useUserStore((state) => state.isLoading);
  const user = useUserStore((state) => state.user);

  // Club and courts stores
  const { clubsById, clubs, ensureClubById, loading: loadingClub } = useClubStore();
  const { courts, fetchCourtsIfNeeded, loading: loadingCourts } = useCourtStore();

  // Booking store
  const {
    bookings,
    fetchBookingsForDay,
    startPolling,
    stopPolling,
    loading: loadingBookings,
    error: bookingsError,
  } = useBookingStore();

  // Local state
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateData, setQuickCreateData] = useState<{
    courtId: string;
    startTime: Date;
  } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<OperationsBooking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const club = selectedClubId ? clubsById[selectedClubId] : null;

  // Check access permissions and set default club
  useEffect(() => {
    if (isLoadingUser) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    if (!adminStatus?.isAdmin) {
      router.push("/");
      return;
    }

    // Check for clubId in URL query params
    const urlClubId = searchParams.get("clubId");

    // Auto-select club for Club Admins (fast-path)
    if (adminStatus.adminType === "club_admin" && adminStatus.assignedClub) {
      // For Club Admin, validate URL clubId matches their assigned club
      if (urlClubId && urlClubId !== adminStatus.assignedClub.id) {
        // URL clubId doesn't match - enforce security by redirecting to correct club
        console.warn("Club Admin attempted to access unauthorized club");
        router.replace("/admin/operations?clubId=" + adminStatus.assignedClub.id);
      }
      setSelectedClubId(adminStatus.assignedClub.id);
    } else if (urlClubId) {
      // For Root Admin, they have access to all clubs
      if (user?.isRoot) {
        setSelectedClubId(urlClubId);
      }
      // For Org Admin with URL clubId:
      // We defer selection until clubs are loaded to validate access
      // See separate useEffect below that validates Org Admin URL clubId
    }
    // For Organization Admin and Root Admin without URL clubId: do NOT auto-select
    // They must explicitly choose a club via the selector
  }, [isLoadingUser, isLoggedIn, adminStatus, router, searchParams, user]);

  // Validate and set URL clubId for Org Admin after clubs are loaded
  useEffect(() => {
    const urlClubId = searchParams.get("clubId");
    
    if (
      urlClubId &&
      !selectedClubId &&
      adminStatus?.adminType === "organization_admin" &&
      clubs.length > 0
    ) {
      // Validate that the URL club belongs to one of the Org Admin's managed organizations
      const urlClub = clubs.find((c) => c.id === urlClubId);
      const managedOrgIds = new Set(adminStatus.managedIds);
      
      if (urlClub && managedOrgIds.has(urlClub.organizationId)) {
        // Valid club - set it
        setSelectedClubId(urlClubId);
      } else {
        // Invalid club - clear URL parameter and show error
        console.warn("Organization Admin attempted to access unauthorized club");
        router.replace("/admin/operations");
      }
    }
  }, [searchParams, selectedClubId, adminStatus, clubs, router]);

  // Load club data only when a club is selected
  useEffect(() => {
    if (selectedClubId) {
      ensureClubById(selectedClubId).catch(console.error);
      fetchCourtsIfNeeded({ clubId: selectedClubId }).catch(console.error);
    }
  }, [selectedClubId, ensureClubById, fetchCourtsIfNeeded]);

  // Load bookings for selected date only when a club is selected
  useEffect(() => {
    if (selectedClubId && selectedDate) {
      fetchBookingsForDay(selectedClubId, selectedDate).catch(console.error);
    }
  }, [selectedClubId, selectedDate, fetchBookingsForDay]);

  // Start polling when page is active
  useEffect(() => {
    if (!selectedClubId || !selectedDate) return;

    // Start polling every 15 seconds
    startPolling(selectedClubId, selectedDate, 15000);

    return () => {
      stopPolling();
    };
  }, [selectedClubId, selectedDate, startPolling, stopPolling]);

  // Handle slot click (create new booking)
  const handleSlotClick = useCallback((courtId: string, startTime: Date) => {
    setQuickCreateData({ courtId, startTime });
    setIsQuickCreateOpen(true);
  }, []);

  // Handle booking click (view details)
  const handleBookingClick = useCallback((booking: OperationsBooking) => {
    setSelectedBooking(booking);
    setIsDetailModalOpen(true);
  }, []);

  // Handle booking creation success
  const handleBookingSuccess = useCallback(() => {
    // Bookings will auto-refresh via polling
    // Or we can manually trigger a refresh
    if (selectedClubId && selectedDate) {
      fetchBookingsForDay(selectedClubId, selectedDate).catch(console.error);
    }
  }, [selectedClubId, selectedDate, fetchBookingsForDay]);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  // Go to today
  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today.toISOString().split("T")[0]);
  };

  // Handle club selection change
  const handleClubChange = (clubId: string) => {
    setSelectedClubId(clubId);
  };

  // Loading state
  if (isLoadingUser || loadingClub) {
    return (
      <main className="im-club-operations-page">
        <div className="im-club-operations-loading">
          <TableSkeleton rows={5} columns={4} />
        </div>
      </main>
    );
  }

  // Access denied
  if (!isLoggedIn || !adminStatus?.isAdmin) {
    return null;
  }

  // Check if Club Admin has no assigned club
  const isClubAdmin = adminStatus.adminType === "club_admin";
  if (isClubAdmin && !adminStatus.assignedClub) {
    return (
      <main className="im-club-operations-page">
        <div className="im-club-operations-error">
          <h2>{t("operations.noClubAssigned") || "No Club Assigned"}</h2>
          <p>{t("operations.noClubAssignedDescription") || "You don't have a club assigned yet. Please contact your administrator."}</p>
          <Button onClick={() => router.push("/admin/dashboard")}>
            {t("operations.goToDashboard") || "Go to Dashboard"}
          </Button>
        </div>
      </main>
    );
  }

  // No club selected (for Org Admins and Root Admins)
  if (!selectedClubId && !isClubAdmin) {
    return (
      <main className="im-club-operations-page">
        <PageHeader
          title={t("operations.title") || "Operations"}
          description={t("operations.description") || "Manage club operations"}
        />
        
        {/* Club selector - required before operations UI loads */}
        <div className="im-club-operations-controls">
          <div className="im-club-operations-club-selector">
            <p className="im-club-operations-instruction">
              {t("operations.selectClubInstruction") || "Please select a club to view its operations."}
            </p>
            <OperationsClubSelector
              value={selectedClubId}
              onChange={handleClubChange}
              label={t("operations.club") || "Club"}
              placeholder={t("operations.selectClub") || "Select a club"}
            />
          </div>
        </div>
      </main>
    );
  }

  // Club not found
  if (!club && !loadingClub && selectedClubId) {
    return (
      <main className="im-club-operations-page">
        <div className="im-club-operations-error">
          <h2>{t("operations.clubNotFound") || "Club not found"}</h2>
          <Button onClick={() => setSelectedClubId("")}>
            {t("operations.selectAnotherClub") || "Select Another Club"}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="im-club-operations-page">
      <PageHeader
        title={t("operations.title") || "Operations"}
        description={club?.name || "Loading..."}
        actions={
          <Button onClick={handleToday} variant="outline">
            {t("operations.today") || "Today"}
          </Button>
        }
      />

      {/* Controls - Club selector and date picker */}
      <div className="im-club-operations-controls">
        {/* Club selector */}
        <div className="im-club-operations-club-selector">
          <OperationsClubSelector
            value={selectedClubId}
            onChange={handleClubChange}
            label={t("operations.club") || "Club"}
            placeholder={t("operations.selectClub") || "Select a club"}
            disabled={isClubAdmin}
          />
        </div>

        {/* Date picker */}
        <div className="im-club-operations-date-picker">
          <label htmlFor="date" className="im-club-operations-date-label">
            {t("operations.selectDate") || "Date"}
          </label>
          <Input
            id="date"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>
      </div>

      {/* Error message */}
      {bookingsError && (
        <div className="im-club-operations-error-banner" role="alert">
          {bookingsError}
        </div>
      )}

      {/* Main content - Calendar and List */}
      <div className="im-club-operations-content">
        {/* Calendar view */}
        <div className="im-club-operations-calendar">
          {loadingCourts || loadingBookings ? (
            <div className="im-club-operations-loading">
              <TableSkeleton rows={10} columns={3} />
            </div>
          ) : courts.length === 0 ? (
            <div className="im-club-operations-empty">
              <h3>{t("operations.noCourts") || "No courts available"}</h3>
              <p>
                {t("operations.noCourtsDescription") ||
                  "This club has no courts configured yet."}
              </p>
            </div>
          ) : (
            <DayCalendar
              courts={courts}
              bookings={bookings}
              selectedDate={selectedDate}
              onBookingClick={handleBookingClick}
              onSlotClick={handleSlotClick}
            />
          )}
        </div>

        {/* Today's bookings list */}
        <div className="im-club-operations-sidebar">
          <TodayBookingsList
            bookings={bookings}
            onViewBooking={handleBookingClick}
            onCancelBooking={(bookingId) => {
              // Find booking and use store's cancel method
              const booking = bookings.find((b) => b.id === bookingId);
              if (booking) {
                handleBookingClick(booking);
              }
            }}
            loading={loadingBookings}
          />
        </div>
      </div>

      {/* Quick Create Modal */}
      {quickCreateData && selectedClubId && (
        <QuickCreateModal
          isOpen={isQuickCreateOpen}
          onClose={() => {
            setIsQuickCreateOpen(false);
            setQuickCreateData(null);
          }}
          clubId={selectedClubId}
          courtId={quickCreateData.courtId}
          startTime={quickCreateData.startTime}
          courts={courts}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        onSuccess={handleBookingSuccess}
      />
    </main>
  );
}
