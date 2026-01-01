"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader, Button, Input, Card } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { useAdminCourtsStore } from "@/stores/useAdminCourtsStore";
import { useBookingStore } from "@/stores/useBookingStore";
import { useActiveClub } from "@/contexts/ClubContext";
import {
  DayCalendar,
  TodayBookingsList,
  BookingDetailModal,
} from "@/components/club-operations";
import { AdminQuickBookingWizard } from "@/components/AdminQuickBookingWizard";
import type { OperationsBooking } from "@/types/booking";
import { TableSkeleton } from "@/components/ui/skeletons";
import "../page.css";

// Default booking duration in minutes
const DEFAULT_BOOKING_DURATION = 60;

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
 * - Date picker to view different days
 * - Access control based on user's admin role and permissions
 */
export default function ClubOperationsPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const clubId = params.clubId as string;
  const { setActiveClubId } = useActiveClub();

  // User store
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingUser = useUserStore((state) => state.isLoading);
  const user = useUserStore((state) => state.user);

  // Club and courts stores
  const { clubsById, clubs, ensureClubById, loadingClubs: loadingClub, clubsError } = useAdminClubStore();
  const courts = useAdminCourtsStore((state) => state.getCourtsForClub(clubId));
  const fetchCourtsIfNeeded = useAdminCourtsStore((state) => state.fetchCourtsIfNeeded);
  const loadingCourts = useAdminCourtsStore((state) => state.loadingCourts);

  // Booking store
  const {
    bookings,
    fetchBookingsForDay,
    loading: loadingBookings,
    error: bookingsError,
  } = useBookingStore();

  // Local state
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [isBookingWizardOpen, setIsBookingWizardOpen] = useState(false);
  const [wizardPredefinedData, setWizardPredefinedData] = useState<{
    organizationId?: string;
    clubId: string;
    courtId?: string;
    date?: string;
    startTime?: string;
    duration?: number;
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

  // Load club data and set active club for socket connection
  useEffect(() => {
    if (clubId) {
      // Set active club for socket room targeting
      // This will trigger BookingSocket to connect for admin users
      setActiveClubId(clubId);
      
      ensureClubById(clubId).catch(console.error);
      fetchCourtsIfNeeded(clubId).catch(console.error);
    }

    // Cleanup: Clear active club when leaving this page
    // This will trigger BookingSocket to disconnect automatically
    // Also clear localStorage to prevent stale clubId from persisting
    return () => {
      setActiveClubId(null);
    };
  }, [clubId, ensureClubById, fetchCourtsIfNeeded, setActiveClubId]);

  // Load bookings for selected date (initial fetch)
  useEffect(() => {
    if (clubId && selectedDate) {
      fetchBookingsForDay(clubId, selectedDate).catch(console.error);
    }
  }, [clubId, selectedDate, fetchBookingsForDay]);

  // Handle slot click (create new booking)
  const handleSlotClick = useCallback((courtId: string, startTime: Date) => {
    // Extract date and time from startTime
    const date = startTime.toISOString().split('T')[0];
    const timeStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
    
    setWizardPredefinedData({
      clubId,
      courtId,
      date,
      startTime: timeStr,
      duration: DEFAULT_BOOKING_DURATION,
    });
    setIsBookingWizardOpen(true);
  }, [clubId]);

  // Handle booking click (view details)
  const handleBookingClick = useCallback((booking: OperationsBooking) => {
    setSelectedBooking(booking);
    setIsDetailModalOpen(true);
  }, []);

  // Handle booking creation success
  const handleBookingSuccess = useCallback(() => {
    // Refresh bookings
    if (clubId && selectedDate) {
      fetchBookingsForDay(clubId, selectedDate).catch(console.error);
    }
  }, [clubId, selectedDate, fetchBookingsForDay]);

  // Handle refresh from real-time updates
  const handleRefreshBookings = useCallback(() => {
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

  // Open booking wizard without pre-filled data (except club)
  const handleCreateBooking = () => {
    setWizardPredefinedData({
      clubId,
      // Don't prefill court, date, or time - let user select
    });
    setIsBookingWizardOpen(true);
  };

  // Loading state - show skeleton while loading user or club data
  // Also show skeleton if club hasn't been fetched yet (to avoid showing "not found" during initial load)
  // But don't show loading if we've already determined access is denied
  if (!accessDenied && (isLoadingUser || loadingClub || (!club && !clubsError && clubId))) {
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
          <h2>{t("operations.accessDenied")}</h2>
          <p>{t("operations.accessDeniedDescription")}</p>
          <Button onClick={handleBackToList}>
            {t("operations.backToList")}
          </Button>
        </div>
      </main>
    );
  }

  // Club not found - only show if we've finished loading and got an error
  if (!club && !loadingClub && clubsError && clubId) {
    return (
      <main className="im-club-operations-page">
        <div className="im-club-operations-error">
          <h2>{t("operations.clubNotFound")}</h2>
          <Button onClick={handleBackToList}>
            {t("operations.backToList")}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="im-club-operations-page">
      {/* Real-time booking events are now handled by GlobalSocketListener in root layout */}
      
      <PageHeader
        title={t("operations.title")}
        description={t("operations.pageDescription")}
        actions={
          <>
            <Button onClick={handleBackToList} variant="outline">
              {t("operations.backToList")}
            </Button>
            <Button 
              onClick={handleCreateBooking}
              disabled={loadingCourts}
            >
              {t("operations.newBooking")}
            </Button>
          </>
        }
      />

      {/* Club Information Block */}
      <Card className="im-club-operations-club-block">
        <div className="im-club-operations-club-info">
          <div className="im-club-operations-club-details">
            <div className="im-club-operations-club-label">{t("operations.currentClub")}</div>
            <div className="im-club-operations-club-name">{club?.name || "Loading..."}</div>
          </div>
          <div className="im-club-operations-view-actions">
            {/* View Switcher */}
            <div className="im-club-operations-view-switcher">
              <Button
                onClick={() => setViewMode("calendar")}
                variant={viewMode === "calendar" ? "primary" : "outline"}
                size="small"
              >
                {t("operations.calendarView")}
              </Button>
              <Button
                onClick={() => setViewMode("list")}
                variant={viewMode === "list" ? "primary" : "outline"}
                size="small"
              >
                {t("operations.listView")}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Controls - Date picker */}
      <div className="im-club-operations-controls">
        {/* Date picker */}
        <div className="im-club-operations-date-picker">
          <label htmlFor="date" className="im-club-operations-date-label">
            {t("operations.selectDate")}
          </label>
          <Input
            id="date"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>
        <Button onClick={handleToday} variant="outline" size="small">
          {t("operations.today")}
        </Button>
      </div>

      {/* Error message */}
      {bookingsError && (
        <div className="im-club-operations-error-banner" role="alert">
          {bookingsError}
        </div>
      )}

      {/* Main content - Calendar and List */}
      {viewMode === "calendar" ? (
        <div className="im-club-operations-content">
          {/* Calendar view */}
          <div className="im-club-operations-calendar">
            {loadingCourts || loadingBookings ? (
              <div className="im-club-operations-loading">
                <TableSkeleton rows={10} columns={3} />
              </div>
            ) : courts.length === 0 ? (
              <div className="im-club-operations-empty">
                <h3>{t("operations.noCourts")}</h3>
                <p>
                  {t("operations.noCourtsDescription")}
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
              clubId={clubId}
              onRefresh={handleRefreshBookings}
            />
          </div>
        </div>
      ) : (
        // List view - Show only bookings list
        <div className="im-club-operations-list-view">
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
            clubId={clubId}
            onRefresh={handleRefreshBookings}
          />
        </div>
      )}

      {/* Admin Quick Booking Wizard */}
      {adminStatus?.isAdmin && adminStatus.adminType !== "none" && (
        <AdminQuickBookingWizard
          isOpen={isBookingWizardOpen}
          onClose={() => {
            setIsBookingWizardOpen(false);
            setWizardPredefinedData(null);
          }}
          onBookingComplete={handleBookingSuccess}
          predefinedData={wizardPredefinedData || undefined}
          adminType={adminStatus.adminType === "club_owner" ? "club_admin" : adminStatus.adminType}
          managedIds={adminStatus.managedIds}
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
