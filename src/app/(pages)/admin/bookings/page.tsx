"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader, Button, type TableColumn, BookingStatusBadge, PaymentStatusBadge } from "@/components/ui";
import { TableSkeleton } from "@/components/ui/skeletons";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { useUserStore } from "@/stores/useUserStore";
import { AdminQuickBookingWizard } from "@/components/AdminQuickBookingWizard";
import { BookingDetailsModal } from "@/components/admin/BookingDetailsModal";
import { formatDateTime, calculateDuration, getInitials } from "@/utils/bookingFormatters";
import { useListController, useDeferredLoading } from "@/hooks";
import { useCurrentLocale } from "@/hooks/useCurrentLocale";
import { getTodayInTimezone, getDateString } from "@/utils/dateTime";
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
import type { PredefinedData } from "@/components/AdminQuickBookingWizard/types";
import "./AdminBookings.css";

// Define filters interface
interface BookingFilters extends Record<string, unknown> {
  searchQuery: string;
  organizationFilter: string;
  clubFilter: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
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
  const locale = useCurrentLocale();

  // Get admin status from user store
  const adminStatus = useUserStore((state) => state.adminStatus);

  // Bookings data
  const [bookingsData, setBookingsData] = useState<AdminBookingsListResponse | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [error, setError] = useState("");

  // Use deferred loading to prevent flicker on fast responses
  const deferredLoadingBookings = useDeferredLoading(isLoadingBookings);

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
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Admin Booking Wizard state
  const [isBookingWizardOpen, setIsBookingWizardOpen] = useState(false);
  const [wizardPredefinedData, setWizardPredefinedData] = useState<PredefinedData | undefined>(undefined);

  // Club store to fetch club details when needed
  const { clubs, fetchClubsIfNeeded } = useAdminClubStore();

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
  const handleViewBooking = (booking: AdminBookingResponse) => {
    setSelectedBookingId(booking.id);
    setIsModalOpen(true);
  };

  // Handle booking cancelled
  const handleBookingCancelled = async () => {
    // Refresh bookings list
    await fetchBookings();
    setIsModalOpen(false);
    setSelectedBookingId(null);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBookingId(null);
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
    const today = getTodayInTimezone();
    const todayStr = getDateString(today);

    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = getDateString(next7Days);

    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekStr = getDateString(startOfWeek);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    const endOfWeekStr = getDateString(endOfWeek);

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

  // AdminGuard handles all loading states at layout level
  const shouldShowContent = !!adminStatus?.isAdmin;

  const handleOpenBookingWizard = async () => {
    // Determine predefined data based on admin context
    let predefinedData: PredefinedData | undefined = undefined;

    if (adminStatus) {
      try {
        // Fetch clubs once at the beginning if needed
        if (adminStatus.adminType === "club_admin" || adminStatus.adminType === "club_owner" || adminStatus.adminType === "organization_admin") {
          await fetchClubsIfNeeded();
        }

        if ((adminStatus.adminType === "club_admin" || adminStatus.adminType === "club_owner") && adminStatus.managedIds.length > 0) {
          // For Club Admin/Owner: Preselect the first managed club and fetch its organization
          const clubId = adminStatus.managedIds[0];
          
          // Find the club in the clubs array
          const club = clubs.find(c => c.id === clubId);
          
          if (club) {
            predefinedData = {
              organizationId: club.organizationId,
              clubId: club.id,
            };
          } else {
            console.warn(`Club with id ${clubId} not found in clubs list`);
          }
        } else if (adminStatus.adminType === "organization_admin" && adminStatus.managedIds.length > 0) {
          // For Organization Admin: Preselect the organization
          const organizationId = adminStatus.managedIds[0];
          predefinedData = {
            organizationId,
          };
          
          // If they manage only one club in this organization, preselect it too
          const managedClubs = clubs.filter(c => c.organizationId === organizationId);
          
          if (managedClubs.length === 1) {
            predefinedData.clubId = managedClubs[0].id;
          }
        }
        // For root_admin, don't preselect anything (current behavior)
      } catch (error) {
        console.error("Error fetching clubs for wizard preselection:", error);
        // Continue with no predefined data if fetch fails
      }
    }

    setWizardPredefinedData(predefinedData);
    setIsBookingWizardOpen(true);
  };

  const handleCloseBookingWizard = () => {
    setIsBookingWizardOpen(false);
    setWizardPredefinedData(undefined);
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
      render: (booking) => formatDateTime(booking.start, locale),
    },
    {
      key: "duration",
      header: t("common.duration"),
      render: (booking) => `${calculateDuration(booking.start, booking.end)} ${t("common.minutes")}`,
    },
    {
      key: "bookingStatus",
      header: t("adminBookings.bookingStatus"),
      render: (booking) => <BookingStatusBadge status={booking.bookingStatus} />,
    },
    {
      key: "paymentStatus",
      header: t("adminBookings.paymentStatus"),
      render: (booking) => <PaymentStatusBadge status={booking.paymentStatus} />,
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

        {/* AdminGuard handles loading state, show content if admin */}
        {!shouldShowContent ? null : (
          <>
        {/* List Controls Toolbar with consolidated filters */}
        <ListToolbar
          showReset
          actionButton={
            <Button onClick={handleOpenBookingWizard} variant="primary" aria-label={t("adminWizard.title")}>
              {t("adminWizard.title")}
            </Button>
          }
        >
          <div className="full-row flex w-full gap-4">
            <ListSearch
              className="flex-1"
              placeholder={t("adminBookings.searchPlaceholder")}
              filterKey="searchQuery"
            />

            <QuickPresets
              className="flex-1"
              presets={getQuickPresets()} />
          </div>

          <div className="full-row flex w-full gap-4">
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
          </div>

          <div className="full-row flex w-full gap-4 items-end">
            <SortSelect
              className="flex-1"
              options={sortOptions}
              label={t("adminBookings.sortBy")}
            />

            <DateRangeFilter
              className="flex-1"
              field="startAt"
              label={t("adminBookings.dateRange")}
              fromKey="dateFrom"
              toKey="dateTo"
              fromLabel={t("adminBookings.from")}
              toLabel={t("adminBookings.to")}
            />
          </div>
        </ListToolbar>

        {/* Error message */}
        {error && (
          <div className="im-admin-bookings-error" role="alert">
            {error}
          </div>
        )}

        {/* Bookings table with loading and empty states */}
        {deferredLoadingBookings ? (
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
                    <th>{t("adminBookings.bookingStatus")}</th>
                    <th>{t("adminBookings.paymentStatus")}</th>
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
                      <td>{formatDateTime(booking.start, locale)}</td>
                      <td>{calculateDuration(booking.start, booking.end)} {t("common.minutes")}</td>
                      <td><BookingStatusBadge status={booking.bookingStatus} /></td>
                      <td><PaymentStatusBadge status={booking.paymentStatus} /></td>
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
        {shouldShowContent && (
          <>
            <BookingDetailsModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              bookingId={selectedBookingId}
              onBookingCancelled={handleBookingCancelled}
            />

            {/* Admin Booking Wizard */}
            {adminStatus?.isAdmin && adminStatus.adminType !== "none" && (
              <AdminQuickBookingWizard
                isOpen={isBookingWizardOpen}
                onClose={handleCloseBookingWizard}
                onBookingComplete={handleBookingComplete}
                predefinedData={wizardPredefinedData}
                adminType={adminStatus.adminType === "club_owner" ? "club_admin" : adminStatus.adminType}
                managedIds={adminStatus.managedIds}
              />
            )}
          </>
        )}
          </>
        )}
      </main>
    </ListControllerProvider>
  );
}
