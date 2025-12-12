"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader, Button, Select, Card, Table } from "@/components/ui";
import type { SelectOption } from "@/components/ui/Select";
import { useUserStore } from "@/stores/useUserStore";
import { useClubStore } from "@/stores/useClubStore";
import { useCourtStore } from "@/stores/useCourtStore";
import { useBookingStore } from "@/stores/useBookingStore";
import type { TableColumn } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/skeletons";
import "./page.css";

/**
 * OperationsPage
 * 
 * Organization-level operations dashboard.
 * Allows Organization Admins to:
 * 1. Select a club from their organization
 * 2. View today's bookings
 * 3. View upcoming bookings
 * 4. Check court status (free/occupied/maintenance)
 * 5. Access quick actions (Create booking, Block court, View schedule)
 * 
 * Protected route accessible only to Organization Admins.
 */
export default function OperationsPage() {
  const t = useTranslations();
  const router = useRouter();

  // User store
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingUser = useUserStore((state) => state.isLoading);

  // Club and courts stores
  const { clubs, fetchClubsIfNeeded, loadingClubs } = useClubStore();
  const { courts, fetchCourtsIfNeeded, loading: loadingCourts } = useCourtStore();

  // Booking store
  const {
    bookings,
    fetchBookingsForDay,
    loading: loadingBookings,
    error: bookingsError,
  } = useBookingStore();

  // Local state
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

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

    // Only Organization Admins should access this page
    if (adminStatus.adminType !== "organization_admin") {
      router.push("/admin/dashboard");
      return;
    }
  }, [isLoadingUser, isLoggedIn, adminStatus, router]);

  // Load clubs when component mounts
  useEffect(() => {
    if (adminStatus?.adminType === "organization_admin") {
      fetchClubsIfNeeded().catch(console.error);
    }
  }, [adminStatus, fetchClubsIfNeeded]);

  // Filter clubs by organization IDs that the admin manages
  const organizationClubs = clubs.filter((club) => {
    if (!club.organization?.id) return false;
    return adminStatus?.managedIds?.includes(club.organization.id) ?? false;
  });

  // Auto-select first club if none selected
  useEffect(() => {
    if (!selectedClubId && organizationClubs.length > 0) {
      setSelectedClubId(organizationClubs[0].id);
    }
  }, [selectedClubId, organizationClubs]);

  // Load courts when club is selected
  useEffect(() => {
    if (selectedClubId) {
      fetchCourtsIfNeeded({ clubId: selectedClubId }).catch(console.error);
    }
  }, [selectedClubId, fetchCourtsIfNeeded]);

  // Load bookings for selected date
  useEffect(() => {
    if (selectedClubId && selectedDate) {
      fetchBookingsForDay(selectedClubId, selectedDate).catch(console.error);
    }
  }, [selectedClubId, selectedDate, fetchBookingsForDay]);

  // Handle club selection change
  const handleClubChange = useCallback((clubId: string) => {
    setSelectedClubId(clubId);
  }, []);

  // Navigate to club operations page
  const handleViewSchedule = useCallback(() => {
    if (selectedClubId) {
      router.push(`/admin/clubs/${selectedClubId}/operations`);
    }
  }, [selectedClubId, router]);

  // Navigate to create booking
  const handleCreateBooking = useCallback(() => {
    if (selectedClubId) {
      router.push(`/admin/bookings?clubId=${selectedClubId}`);
    }
  }, [selectedClubId, router]);

  // Navigate to courts page to block a court
  const handleBlockCourt = useCallback(() => {
    if (selectedClubId) {
      router.push(`/admin/clubs/${selectedClubId}/courts`);
    }
  }, [selectedClubId, router]);

  // Loading state
  if (isLoadingUser || loadingClubs) {
    return (
      <main className="im-operations-page">
        <div className="im-operations-loading">
          <TableSkeleton rows={5} columns={4} />
        </div>
      </main>
    );
  }

  // Access denied
  if (!isLoggedIn || adminStatus?.adminType !== "organization_admin") {
    return null;
  }

  // No clubs available
  if (organizationClubs.length === 0 && !loadingClubs) {
    return (
      <main className="im-operations-page">
        <PageHeader
          title={t("operations.title") || "Operations Dashboard"}
          description={t("operations.description") || "Manage your clubs operations"}
        />
        <section className="im-operations-empty">
          <h2>{t("operations.noClubs") || "No clubs available"}</h2>
          <p>
            {t("operations.noClubsDescription") ||
              "You don't have any clubs in your organization yet."}
          </p>
        </section>
      </main>
    );
  }

  // Prepare club options for select
  const clubOptions: SelectOption[] = organizationClubs.map((club) => ({
    value: club.id,
    label: club.name,
  }));

  const selectedClub = organizationClubs.find((c) => c.id === selectedClubId);

  // Filter today's bookings
  const todayBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.start).toISOString().split("T")[0];
    return bookingDate === selectedDate;
  });

  // Filter upcoming bookings (next 7 days)
  const upcomingBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.start);
    const today = new Date(selectedDate);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return bookingDate > today && bookingDate <= nextWeek;
  });

  // Prepare courts status
  const courtsStatus = courts.map((court) => {
    const courtBookings = todayBookings.filter((b) => b.courtId === court.id);
    const now = new Date();
    const currentBooking = courtBookings.find((b) => {
      const start = new Date(b.start);
      const end = new Date(b.end);
      return start <= now && now <= end;
    });

    return {
      court,
      status: currentBooking ? "occupied" : "free",
      currentBooking,
    };
  });

  // Table columns for today's bookings
  const todayBookingsColumns: TableColumn<typeof todayBookings[0]>[] = [
    {
      key: "start",
      header: t("operations.time") || "Time",
      render: (booking) => {
        const start = new Date(booking.start);
        const end = new Date(booking.end);
        return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      },
    },
    {
      key: "courtName",
      header: t("operations.court") || "Court",
      render: (booking) => booking.courtName || "-",
    },
    {
      key: "userName",
      header: t("operations.user") || "User",
      render: (booking) => booking.userName || "Guest",
    },
    {
      key: "status",
      header: t("operations.status") || "Status",
      render: (booking) => (
        <span className={`im-booking-status im-booking-status--${booking.status}`}>
          {booking.status}
        </span>
      ),
    },
  ];

  // Table columns for upcoming bookings
  const upcomingBookingsColumns: TableColumn<typeof upcomingBookings[0]>[] = [
    {
      key: "date",
      header: t("operations.date") || "Date",
      render: (booking) => {
        const date = new Date(booking.start);
        return date.toLocaleDateString();
      },
    },
    {
      key: "start",
      header: t("operations.time") || "Time",
      render: (booking) => {
        const start = new Date(booking.start);
        return start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      },
    },
    {
      key: "courtName",
      header: t("operations.court") || "Court",
      render: (booking) => booking.courtName || "-",
    },
    {
      key: "userName",
      header: t("operations.user") || "User",
      render: (booking) => booking.userName || "Guest",
    },
  ];

  // Table columns for courts status
  const courtsStatusColumns: TableColumn<typeof courtsStatus[0]>[] = [
    {
      key: "name",
      header: t("operations.courtName") || "Court Name",
      render: (item) => item.court.name,
    },
    {
      key: "type",
      header: t("operations.type") || "Type",
      render: (item) => item.court.indoor ? "Indoor" : "Outdoor",
    },
    {
      key: "status",
      header: t("operations.status") || "Status",
      render: (item) => (
        <span className={`im-court-status im-court-status--${item.status}`}>
          {item.status === "occupied" ? t("operations.occupied") || "Occupied" : t("operations.free") || "Free"}
        </span>
      ),
    },
  ];

  return (
    <main className="im-operations-page">
      <PageHeader
        title={t("operations.title") || "Operations Dashboard"}
        description={t("operations.description") || "Manage your clubs operations"}
      />

      {/* Club Picker */}
      <section className="im-operations-club-picker">
        <Card>
          <div className="im-operations-club-picker-content">
            <h2 className="im-operations-club-picker-title">
              {t("operations.selectClub") || "Select Club"}
            </h2>
            <p className="im-operations-club-picker-description">
              {t("operations.selectClubDescription") || "Choose a club to view its operational data"}
            </p>
            <div className="im-operations-club-picker-select">
              <Select
                label={t("operations.club") || "Club"}
                options={clubOptions}
                value={selectedClubId}
                onChange={handleClubChange}
                placeholder={t("operations.chooseClub") || "Choose a club..."}
              />
            </div>
          </div>
        </Card>
      </section>

      {/* Display operational data only when a club is selected */}
      {selectedClubId && selectedClub && (
        <>
          {/* Quick Actions */}
          <section className="im-operations-quick-actions">
            <Card title={t("operations.quickActions") || "Quick Actions"}>
              <div className="im-operations-actions-grid">
                <Button onClick={handleCreateBooking} variant="primary">
                  {t("operations.createBooking") || "Create Booking"}
                </Button>
                <Button onClick={handleBlockCourt} variant="outline">
                  {t("operations.blockCourt") || "Block Court"}
                </Button>
                <Button onClick={handleViewSchedule} variant="outline">
                  {t("operations.viewSchedule") || "View Schedule"}
                </Button>
              </div>
            </Card>
          </section>

          {/* Error message */}
          {bookingsError && (
            <div className="im-operations-error-banner" role="alert">
              {bookingsError}
            </div>
          )}

          {/* Operational Data Grid */}
          <div className="im-operations-content-grid">
            {/* Today's Bookings */}
            <section className="im-operations-section">
              <Card title={t("operations.todaysBookings") || "Today's Bookings"}>
                {loadingBookings ? (
                  <TableSkeleton rows={3} columns={4} />
                ) : (
                  <Table
                    columns={todayBookingsColumns as unknown as TableColumn<Record<string, unknown>>[]}
                    data={todayBookings as unknown as Record<string, unknown>[]}
                    keyExtractor={(booking) => (booking as { id: string }).id}
                    emptyMessage={t("operations.noBookingsToday") || "No bookings for today"}
                    className="im-operations-table"
                  />
                )}
              </Card>
            </section>

            {/* Upcoming Bookings */}
            <section className="im-operations-section">
              <Card title={t("operations.upcomingBookings") || "Upcoming Bookings (Next 7 Days)"}>
                {loadingBookings ? (
                  <TableSkeleton rows={3} columns={4} />
                ) : (
                  <Table
                    columns={upcomingBookingsColumns as unknown as TableColumn<Record<string, unknown>>[]}
                    data={upcomingBookings.slice(0, 10) as unknown as Record<string, unknown>[]}
                    keyExtractor={(booking) => (booking as { id: string }).id}
                    emptyMessage={t("operations.noUpcomingBookings") || "No upcoming bookings"}
                    className="im-operations-table"
                  />
                )}
              </Card>
            </section>

            {/* Courts Status */}
            <section className="im-operations-section">
              <Card title={t("operations.courtsStatus") || "Courts Status"}>
                {loadingCourts ? (
                  <TableSkeleton rows={3} columns={3} />
                ) : (
                  <Table
                    columns={courtsStatusColumns as unknown as TableColumn<Record<string, unknown>>[]}
                    data={courtsStatus as unknown as Record<string, unknown>[]}
                    keyExtractor={(item) => (item as { court: { id: string } }).court.id}
                    emptyMessage={t("operations.noCourts") || "No courts available"}
                    className="im-operations-table"
                  />
                )}
              </Card>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
