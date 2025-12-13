"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader, Button, Modal, type TableColumn } from "@/components/ui";
import { TableSkeleton } from "@/components/ui/skeletons";
import { formatPrice } from "@/utils/price";
import { useUserStore } from "@/stores/useUserStore";
import { AdminQuickBookingWizard } from "@/components/AdminQuickBookingWizard";
import { useListController } from "@/hooks";
import {
  ListControllerProvider,
  ListToolbar,
  ListSearch,
  SortSelect,
  OrgSelector,
  ClubSelector,
  StatusFilter,
  DateRangeFilter,
  QuickPresets,
  PaginationControls,
} from "@/components/list-controls";
import type { AdminBookingsListResponse, AdminBookingResponse } from "@/app/api/admin/bookings/route";
import type { AdminBookingDetailResponse } from "@/app/api/admin/bookings/[id]/route";
import "./AdminBookings.css";

// Define filters interface
interface BookingFilters {
  searchQuery: string;
  organizationFilter: string;
  clubFilter: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
}

/**
 * Format date to display format
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get user initials from name for avatar
 */
function getInitials(name: string | null | undefined, email: string | null): string {
  const getEmailInitial = () => {
    return email && email.length > 0 ? email.charAt(0).toUpperCase() : "?";
  };

  if (!name) {
    return getEmailInitial();
  }
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) {
    return getEmailInitial();
  }
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Calculate duration in minutes
 */
function calculateDuration(start: string, end: string): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.round((endTime - startTime) / (1000 * 60));
}

/**
 * Status badge component with translations
 */
function StatusBadge({ status }: { status: string }) {
  const t = useTranslations();
  const statusClass = `im-booking-status im-booking-status--${status}`;
  
  // Map status to translation key
  const statusLabels: Record<string, string> = {
    pending: t("adminBookings.statusPending"),
    paid: t("adminBookings.statusPaid"),
    reserved: t("adminBookings.statusReserved"),
    cancelled: t("adminBookings.statusCancelled"),
  };
  
  // Get translated label or use a capitalized version of status as last resort
  const displayText = statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  
  return <span className={statusClass}>{displayText}</span>;
}

/**
 * Admin Bookings Page Component
 *
 * Displays bookings with role-based filtering:
 * - Root Admin: All bookings with org/club filters
 * - Organization Admin: Organization bookings with club filter
 * - Club Admin: Club bookings only
 */
export default function AdminBookingsPage() {
  const t = useTranslations();
  const router = useRouter();

  // Get admin status from user store
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoading = useUserStore((state) => state.isLoading);

  // Bookings data
  const [bookingsData, setBookingsData] = useState<AdminBookingsListResponse | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [error, setError] = useState("");

  // Use list controller hook for persistent filters
  const controller = useListController<BookingFilters>({
    entityKey: "bookings",
    defaultFilters: {
      searchQuery: "",
      organizationFilter: "",
      clubFilter: "",
      statusFilter: "",
      dateFrom: "",
      dateTo: "",
    },
    defaultSortBy: "startAt",
    defaultSortOrder: "asc",
    defaultPage: 1,
    defaultPageSize: 25,
  });

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingDetailResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Action states
  const [isCancelling, setIsCancelling] = useState(false);

  // Admin Booking Wizard state
  const [isBookingWizardOpen, setIsBookingWizardOpen] = useState(false);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!adminStatus?.isAdmin) return;

    setIsLoadingBookings(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("page", String(controller.page));
      params.set("perPage", String(controller.pageSize));

      if (controller.filters.searchQuery) params.set("search", controller.filters.searchQuery);
      if (controller.filters.organizationFilter) params.set("orgId", controller.filters.organizationFilter);
      if (controller.filters.clubFilter) params.set("clubId", controller.filters.clubFilter);
      if (controller.filters.statusFilter) params.set("status", controller.filters.statusFilter);
      if (controller.filters.dateFrom) params.set("dateFrom", controller.filters.dateFrom);
      if (controller.filters.dateTo) params.set("dateTo", controller.filters.dateTo);

      const response = await fetch(`/api/admin/bookings?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/sign-in");
          return;
        }
        if (response.status === 403) {
          setError(t("adminBookings.accessDenied"));
          return;
        }
        throw new Error("Failed to fetch bookings");
      }

      const data: AdminBookingsListResponse = await response.json();
      setBookingsData(data);
    } catch {
      setError(t("adminBookings.failedToLoad"));
    } finally {
      setIsLoadingBookings(false);
    }
  }, [adminStatus, controller.page, controller.pageSize, controller.filters, router, t]);

  // Fetch bookings when filters change
  useEffect(() => {
    if (adminStatus?.isAdmin) {
      fetchBookings();
    }
  }, [adminStatus, fetchBookings]);

  // View booking details
  const handleViewBooking = async (booking: AdminBookingResponse) => {
    setIsLoadingDetail(true);
    setIsModalOpen(true);

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}`);
      if (response.ok) {
        const data: AdminBookingDetailResponse = await response.json();
        setSelectedBooking(data);
      } else {
        setError(t("adminBookings.failedToLoadDetails"));
      }
    } catch {
      setError(t("adminBookings.failedToLoadDetails"));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm(t("adminBookings.confirmCancel"))) return;

    setIsCancelling(true);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (response.ok) {
        // Refresh bookings
        await fetchBookings();
        setIsModalOpen(false);
        setSelectedBooking(null);
      } else {
        setError(t("adminBookings.failedToCancel"));
      }
    } catch {
      setError(t("adminBookings.failedToCancel"));
    } finally {
      setIsCancelling(false);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  // Status options for StatusFilter
  const statusOptions = [
    { value: "pending", label: t("adminBookings.statusPending") },
    { value: "paid", label: t("adminBookings.statusPaid") },
    { value: "reserved", label: t("adminBookings.statusReserved") },
    { value: "cancelled", label: t("adminBookings.statusCancelled") },
  ];

  // Sort options for SortSelect
  const sortOptions = [
    { key: "startAt", label: t("adminBookings.sortByStartTime"), direction: "asc" as const },
    { key: "startAt", label: t("adminBookings.sortByStartTimeDesc"), direction: "desc" as const },
    { key: "createdAt", label: t("adminBookings.sortByCreated"), direction: "desc" as const },
    { key: "createdAt", label: t("adminBookings.sortByCreatedAsc"), direction: "asc" as const },
    { key: "status", label: t("adminBookings.sortByStatus"), direction: "asc" as const },
  ];

  // Quick presets for common date ranges
  const getQuickPresets = () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split("T")[0];

    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekStr = startOfWeek.toISOString().split("T")[0];

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    const endOfWeekStr = endOfWeek.toISOString().split("T")[0];

    return [
      {
        id: "today",
        label: t("adminBookings.today"),
        filters: { dateFrom: todayStr, dateTo: todayStr },
      },
      {
        id: "next_7_days",
        label: t("adminBookings.next7Days"),
        filters: { dateFrom: todayStr, dateTo: next7DaysStr },
      },
      {
        id: "this_week",
        label: t("adminBookings.thisWeek"),
        filters: { dateFrom: startOfWeekStr, dateTo: endOfWeekStr },
      },
    ];
  };

  // Show loading state while user store is loading
  if (isLoading) {
    return (
      <main className="im-admin-bookings-page">
        <div className="im-admin-bookings-loading">
          <div className="im-admin-bookings-loading-spinner" />
          <span>{t("common.loading")}</span>
        </div>
      </main>
    );
  }

  if (!isLoggedIn || !adminStatus?.isAdmin) {
    router.push("/auth/sign-in");
    return null;
  }

  const handleOpenBookingWizard = () => {
    setIsBookingWizardOpen(true);
  };

  const handleCloseBookingWizard = () => {
    setIsBookingWizardOpen(false);
  };

  const handleBookingComplete = async () => {
    // Refresh bookings list
    await fetchBookings();
  };

  // Define table columns based on admin type
  const columns: TableColumn<AdminBookingResponse>[] = [
    {
      key: "id",
      header: t("adminBookings.bookingId"),
      render: (booking) => `${booking.id.slice(0, 8)}...`,
    },
    {
      key: "userName",
      header: t("adminBookings.user"),
      render: (booking) => booking.userName || booking.userEmail,
    },
    ...(adminStatus?.adminType === "root_admin"
      ? [
        {
          key: "organizationName",
          header: t("adminBookings.organization"),
          render: (booking: AdminBookingResponse) => booking.organizationName || "—",
        },
      ]
      : []),
    ...(adminStatus?.adminType !== "club_admin"
      ? [
        {
          key: "clubName",
          header: t("adminBookings.club"),
          render: (booking: AdminBookingResponse) => booking.clubName,
        },
      ]
      : []),
    {
      key: "court",
      header: t("adminBookings.court"),
      render: (booking) => booking.courtName,
    },
    {
      key: "start",
      header: t("adminBookings.dateTime"),
      render: (booking) => formatDateTime(booking.start),
    },
    {
      key: "duration",
      header: t("common.duration"),
      render: (booking) => `${calculateDuration(booking.start, booking.end)} ${t("common.minutes")}`,
    },
    {
      key: "status",
      header: t("common.status"),
      render: (booking) => <StatusBadge status={booking.status} />,
    },
    {
      key: "actions",
      header: t("common.actions"),
      render: (booking) => (
        <div className="im-admin-bookings-actions" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="small"
            onClick={() => handleViewBooking(booking)}
          >
            {t("common.view")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ListControllerProvider controller={controller}>
      <main className="im-admin-bookings-page">
        <PageHeader
          title={t("adminBookings.title")}
          description={t("adminBookings.subtitle")}
        />

        {/* List Controls Toolbar with consolidated filters */}
        <ListToolbar 
          showReset
          actionButton={
            <Button onClick={handleOpenBookingWizard} variant="primary" aria-label={t("adminWizard.title")}>
              {t("adminWizard.title")}
            </Button>
          }
        >
          <ListSearch
            placeholder={t("adminBookings.searchPlaceholder")}
            filterKey="searchQuery"
          />

          <QuickPresets presets={getQuickPresets()} />

          <DateRangeFilter
            field="startAt"
            label={t("adminBookings.dateRange")}
            fromKey="dateFrom"
            toKey="dateTo"
            fromLabel={t("adminBookings.from")}
            toLabel={t("adminBookings.to")}
          />

          <SortSelect
            options={sortOptions}
            label={t("adminBookings.sortBy")}
          />

          {adminStatus?.adminType === "root_admin" && (
            <OrgSelector
              filterKey="organizationFilter"
              label={t("adminBookings.organization")}
              placeholder={t("adminBookings.allOrganizations")}
            />
          )}

          {adminStatus?.adminType !== "club_admin" && (
            <ClubSelector
              filterKey="clubFilter"
              orgFilterKey="organizationFilter"
              label={t("adminBookings.club")}
              placeholder={t("adminBookings.allClubs")}
            />
          )}

          <StatusFilter
            statuses={statusOptions}
            filterKey="statusFilter"
            label={t("common.status")}
            placeholder={t("common.allStatuses")}
          />
        </ListToolbar>

        {/* Error message */}
        {error && (
          <div className="im-admin-bookings-error" role="alert">
            {error}
          </div>
        )}

        {/* Bookings table with loading and empty states */}
        {isLoadingBookings ? (
          <TableSkeleton rows={Math.min(controller.pageSize, 20)} columns={columns.length} showHeader />
        ) : !bookingsData || bookingsData.bookings.length === 0 ? (
          <div className="im-admin-bookings-table-container">
            <div className="im-admin-bookings-empty">
              <svg
                className="im-admin-bookings-empty-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3 className="im-admin-bookings-empty-title">{t("adminBookings.noBookings")}</h3>
              <p className="im-admin-bookings-empty-description">{t("adminBookings.noBookingsDescription")}</p>
              <Button onClick={handleOpenBookingWizard} variant="primary">
                {t("adminBookings.createBooking")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="im-admin-bookings-table-container">
              <table className="im-admin-bookings-table">
                <thead>
                  <tr>
                    <th>{t("adminBookings.user")}</th>
                    {adminStatus.adminType === "root_admin" && <th>{t("adminBookings.organization")}</th>}
                    {adminStatus.adminType !== "club_admin" && <th>{t("adminBookings.club")}</th>}
                    <th>{t("adminBookings.court")}</th>
                    <th>{t("adminBookings.dateTime")}</th>
                    <th>{t("common.duration")}</th>
                    <th>{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingsData?.bookings.map((booking) => (
                    <tr key={booking.id} onClick={() => handleViewBooking(booking)}>
                      <td className="im-td-user">
                        <div className="im-user-info">
                          <div className="im-user-avatar">
                            {getInitials(booking.userName, booking.userEmail)}
                          </div>
                          <span className="im-user-name">
                            {booking.userName || booking.userEmail}
                          </span>
                        </div>
                      </td>
                      {adminStatus.adminType === "root_admin" && (
                        <td>{booking.organizationName || "—"}</td>
                      )}
                      {adminStatus.adminType !== "club_admin" && (
                        <td>{booking.clubName}</td>
                      )}
                      <td>{booking.courtName}</td>
                      <td>{formatDateTime(booking.start)}</td>
                      <td>{calculateDuration(booking.start, booking.end)} {t("common.minutes")}</td>
                      <td><StatusBadge status={booking.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <PaginationControls
              totalCount={bookingsData.total}
              totalPages={bookingsData.totalPages}
              showPageSize={true}
              pageSizeOptions={[25, 50, 100]}
            />
          </>
        )}

        {/* Booking Detail Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={t("adminBookings.bookingDetails")}
        >
          {isLoadingDetail ? (
            <div className="im-admin-bookings-loading">
              <div className="im-admin-bookings-loading-spinner" />
              <span>{t("common.loading")}</span>
            </div>
          ) : selectedBooking ? (
            <div className="im-booking-detail-modal">
              {/* User Information */}
              <div className="im-booking-detail-section">
                <h4 className="im-booking-detail-section-title">{t("adminBookings.userInfo")}</h4>
                <div className="im-booking-detail-grid">
                  <div className="im-booking-detail-item">
                    <span className="im-booking-detail-label">{t("common.name")}</span>
                    <span className="im-booking-detail-value">{selectedBooking.userName || "—"}</span>
                  </div>
                  <div className="im-booking-detail-item">
                    <span className="im-booking-detail-label">{t("common.email")}</span>
                    <span className="im-booking-detail-value">{selectedBooking.userEmail}</span>
                  </div>
                </div>
              </div>

              {/* Court Information */}
              <div className="im-booking-detail-section">
                <h4 className="im-booking-detail-section-title">{t("adminBookings.courtInfo")}</h4>
                <div className="im-booking-detail-grid">
                  <div className="im-booking-detail-item">
                    <span className="im-booking-detail-label">{t("adminBookings.court")}</span>
                    <span className="im-booking-detail-value">{selectedBooking.courtName}</span>
                  </div>
                  <div className="im-booking-detail-item">
                    <span className="im-booking-detail-label">{t("adminBookings.club")}</span>
                    <span className="im-booking-detail-value">{selectedBooking.clubName}</span>
                  </div>
                  {selectedBooking.courtType && (
                    <div className="im-booking-detail-item">
                      <span className="im-booking-detail-label">{t("admin.courts.type")}</span>
                      <span className="im-booking-detail-value">{selectedBooking.courtType}</span>
                    </div>
                  )}
                  {selectedBooking.courtSurface && (
                    <div className="im-booking-detail-item">
                      <span className="im-booking-detail-label">{t("admin.courts.surface")}</span>
                      <span className="im-booking-detail-value">{selectedBooking.courtSurface}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Details */}
              <div className="im-booking-detail-section">
                <h4 className="im-booking-detail-section-title">{t("adminBookings.bookingInfo")}</h4>
                <div className="im-booking-detail-grid">
                  <div className="im-booking-detail-item">
                    <span className="im-booking-detail-label">{t("adminBookings.dateTime")}</span>
                    <span className="im-booking-detail-value">
                      {formatDateTime(selectedBooking.start)} — {formatDateTime(selectedBooking.end)}
                    </span>
                  </div>
                  <div className="im-booking-detail-item">
                    <span className="im-booking-detail-label">{t("common.duration")}</span>
                    <span className="im-booking-detail-value">
                      {calculateDuration(selectedBooking.start, selectedBooking.end)} {t("common.minutes")}
                    </span>
                  </div>
                  <div className="im-booking-detail-item">
                    <span className="im-booking-detail-label">{t("common.status")}</span>
                    <span className="im-booking-detail-value">
                      <StatusBadge status={selectedBooking.status} />
                    </span>
                  </div>
                  <div className="im-booking-detail-item">
                    <span className="im-booking-detail-label">{t("common.price")}</span>
                    <span className="im-booking-detail-value">{formatPrice(selectedBooking.price)}</span>
                  </div>
                  {selectedBooking.coachName && (
                    <div className="im-booking-detail-item">
                      <span className="im-booking-detail-label">{t("adminBookings.coach")}</span>
                      <span className="im-booking-detail-value">{selectedBooking.coachName}</span>
                    </div>
                  )}
                  <div className="im-booking-detail-item">
                    <span className="im-booking-detail-label">{t("adminBookings.createdAt")}</span>
                    <span className="im-booking-detail-value">{formatDateTime(selectedBooking.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="im-booking-detail-actions">
                <Button variant="outline" onClick={handleCloseModal}>
                  {t("common.close")}
                </Button>
                {selectedBooking.status !== "cancelled" && (
                  <Button
                    variant="danger"
                    onClick={() => handleCancelBooking(selectedBooking.id)}
                    disabled={isCancelling}
                  >
                    {isCancelling ? t("adminBookings.cancelling") : t("adminBookings.cancelBooking")}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </Modal>

        {/* Admin Booking Wizard */}
        {adminStatus?.isAdmin && adminStatus.adminType !== "none" && (
          <AdminQuickBookingWizard
            isOpen={isBookingWizardOpen}
            onClose={handleCloseBookingWizard}
            onBookingComplete={handleBookingComplete}
            adminType={adminStatus.adminType}
            managedIds={adminStatus.managedIds}
          />
        )}
      </main>
    </ListControllerProvider>
  );
}
