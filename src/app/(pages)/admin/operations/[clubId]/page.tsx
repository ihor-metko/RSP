"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
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
} from "@/components/club-operations";
import type { OperationsBooking } from "@/types/booking";
import { TableSkeleton } from "@/components/ui/skeletons";
import "../page.css";

/**
 * ClubOperationsPage
 * 
 * Club-specific operations page - displays calendar and bookings for a single club.
 * Protected route accessible only to admins with permission to the specified club.
 * 
 * Features:
 * - Day view calendar with courts as columns
 * - Click empty slots to create bookings
 * - Click bookings to view details and cancel
 * - Side panel with today's bookings list
 * - Auto-refresh via short-polling (15-30s)
 * - Date picker to view different days
 * - Access control based on user's admin role and permissions
 */
export default function ClubOperationsPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const clubId = params.clubId as string;

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
  const [accessDenied, setAccessDenied] = useState(false);

  const club = clubsById[clubId];

  // Check access permissions
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

    // Verify access to this specific club
    if (!clubId) {
      router.push("/admin/operations");
      return;
    }

    // Root admin has access to all clubs
    if (user?.isRoot) {
      return;
    }

    // For Club Admin, verify they have access to this specific club
    // Note: We check managedIds (which contains all club IDs they can manage)
    // rather than assignedClub, which is only the first club for navigation
    if (adminStatus.adminType === "club_admin") {
      const hasAccess = adminStatus.managedIds.includes(clubId);
      if (!hasAccess) {
        console.warn("Club Admin attempted to access unauthorized club");
        setAccessDenied(true);
        return;
      }
    }

    // For Organization Admin, verify the club belongs to one of their managed organizations
    if (adminStatus.adminType === "organization_admin") {
      // We need to load clubs to check organization membership
      // This will be checked after clubs are loaded
    }
  }, [isLoadingUser, isLoggedIn, adminStatus, router, clubId, user]);

  // Validate Organization Admin access after clubs are loaded
  useEffect(() => {
    if (
      adminStatus?.adminType === "organization_admin" &&
      clubs.length > 0 &&
      clubId &&
      !user?.isRoot
    ) {
      const targetClub = clubs.find((c) => c.id === clubId);
      const managedOrgIds = new Set(adminStatus.managedIds);

      if (!targetClub || !managedOrgIds.has(targetClub.organizationId)) {
        console.warn("Organization Admin attempted to access unauthorized club");
        setAccessDenied(true);
      }
    }
  }, [adminStatus, clubs, clubId, user]);

  // Load club data
  useEffect(() => {
    if (clubId) {
      ensureClubById(clubId).catch(console.error);
      fetchCourtsIfNeeded({ clubId }).catch(console.error);
    }
  }, [clubId, ensureClubById, fetchCourtsIfNeeded]);

  // Load bookings for selected date
  useEffect(() => {
    if (clubId && selectedDate) {
      fetchBookingsForDay(clubId, selectedDate).catch(console.error);
    }
  }, [clubId, selectedDate, fetchBookingsForDay]);

  // Start polling when page is active
  useEffect(() => {
    if (!clubId || !selectedDate) return;

    // Start polling every 15 seconds
    startPolling(clubId, selectedDate, 15000);

    return () => {
      stopPolling();
    };
  }, [clubId, selectedDate, startPolling, stopPolling]);

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
    if (clubId && selectedDate) {
      fetchBookingsForDay(clubId, selectedDate).catch(console.error);
    }
  }, [clubId, selectedDate, fetchBookingsForDay]);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  // Go to today
  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today.toISOString().split("T")[0]);
  };

  // Go back to club list
  const handleBackToList = () => {
    router.push("/admin/operations");
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

  // Access denied to this specific club
  if (accessDenied) {
    return (
      <main className="im-club-operations-page">
        <div className="im-club-operations-error">
          <h2>{t("operations.accessDenied") || "Access Denied"}</h2>
          <p>{t("operations.accessDeniedDescription") || "You don't have permission to access this club's operations."}</p>
          <Button onClick={handleBackToList}>
            {t("operations.backToList") || "Back to Operations"}
          </Button>
        </div>
      </main>
    );
  }

  // Club not found
  if (!club && !loadingClub && clubId) {
    return (
      <main className="im-club-operations-page">
        <div className="im-club-operations-error">
          <h2>{t("operations.clubNotFound") || "Club not found"}</h2>
          <Button onClick={handleBackToList}>
            {t("operations.backToList") || "Back to Operations"}
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
          <>
            <Button onClick={handleBackToList} variant="outline">
              {t("operations.backToList") || "Back to List"}
            </Button>
            <Button onClick={handleToday} variant="outline">
              {t("operations.today") || "Today"}
            </Button>
          </>
        }
      />

      {/* Controls - Date picker */}
      <div className="im-club-operations-controls">
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
      {quickCreateData && clubId && (
        <QuickCreateModal
          isOpen={isQuickCreateOpen}
          onClose={() => {
            setIsQuickCreateOpen(false);
            setQuickCreateData(null);
          }}
          clubId={clubId}
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
