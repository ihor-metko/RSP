"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import "./page.css";

/**
 * ClubOperationsPage
 * 
 * Main page for club operations - displays a day view calendar and today's bookings list.
 * Protected route accessible only to Club Admins and Organization Admins.
 * 
 * Features:
 * - Day view calendar with courts as columns
 * - Click empty slots to create bookings
 * - Click bookings to view details and cancel
 * - Side panel with today's bookings list
 * - Auto-refresh via short-polling (15-30s)
 * - Date picker to view different days
 */
export default function ClubOperationsPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const clubId = params?.id as string;

  // User store
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingUser = useUserStore((state) => state.isLoading);

  // Club and courts stores
  const { clubsById, ensureClubById, loading: loadingClub } = useClubStore();
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

  const club = clubId ? clubsById[clubId] : null;

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

    // Check if user has access to this club
    if (adminStatus.adminType === "club_admin") {
      if (!adminStatus.managedIds.includes(clubId)) {
        router.push("/admin/dashboard");
        return;
      }
    } else if (adminStatus.adminType === "organization_admin") {
      // Need to check if club belongs to managed organization
      // This will be verified server-side
      // Organization check is done at the API level
    }
    // Root admin has access to all clubs
  }, [isLoadingUser, isLoggedIn, adminStatus, clubId, club, router]);

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

  // Club not found
  if (!club && !loadingClub) {
    return (
      <main className="im-club-operations-page">
        <div className="im-club-operations-error">
          <h2>Club not found</h2>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </main>
    );
  }

  // Filter courts for this club
  // Note: The courts from the store should already be filtered by clubId
  const clubCourts = courts;

  return (
    <main className="im-club-operations-page">
      <PageHeader
        title={t("operations.title") || "Club Operations"}
        description={club?.name || "Loading..."}
        actions={
          <Button onClick={handleToday} variant="outline">
            {t("operations.today") || "Today"}
          </Button>
        }
      />

      {/* Date selector */}
      <div className="im-club-operations-controls">
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
          ) : clubCourts.length === 0 ? (
            <div className="im-club-operations-empty">
              <h3>{t("operations.noCourts") || "No courts available"}</h3>
              <p>
                {t("operations.noCourtsDescription") ||
                  "This club has no courts configured yet."}
              </p>
            </div>
          ) : (
            <DayCalendar
              courts={clubCourts}
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
      {quickCreateData && (
        <QuickCreateModal
          isOpen={isQuickCreateOpen}
          onClose={() => {
            setIsQuickCreateOpen(false);
            setQuickCreateData(null);
          }}
          clubId={clubId}
          courtId={quickCreateData.courtId}
          startTime={quickCreateData.startTime}
          courts={clubCourts}
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
