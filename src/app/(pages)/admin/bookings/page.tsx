"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader, Button, Modal, Select, Input } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useClubStore } from "@/stores/useClubStore";
import { AdminQuickBookingWizard } from "@/components/AdminQuickBookingWizard";
import type { AdminBookingsListResponse, AdminBookingResponse } from "@/app/api/admin/bookings/route";
import type { AdminBookingDetailResponse } from "@/app/api/admin/bookings/[id]/route";
import type { AdminStatusResponse } from "@/app/api/me/admin-status/route";
import "./AdminBookings.css";

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
 * Calculate duration in minutes
 */
function calculateDuration(start: string, end: string): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.round((endTime - startTime) / (1000 * 60));
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  const statusClass = `im-booking-status im-booking-status--${status}`;
  return <span className={statusClass}>{status}</span>;
}

/**
 * Organization/Club filter options
 */
interface FilterOption {
  value: string;
  label: string;
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
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // Admin status
  const [adminStatus, setAdminStatus] = useState<AdminStatusResponse | null>(null);
  const [isLoadingAdminStatus, setIsLoadingAdminStatus] = useState(true);

  // Bookings data
  const [bookingsData, setBookingsData] = useState<AdminBookingsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Filter options
  const storeOrganizations = useOrganizationStore((state) => state.organizations);
  const fetchOrganizations = useOrganizationStore((state) => state.fetchOrganizations);
  const [organizations, setOrganizations] = useState<FilterOption[]>([]);
  const [clubs, setClubs] = useState<FilterOption[]>([]);

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingDetailResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Action states
  const [isCancelling, setIsCancelling] = useState(false);

  // Admin Booking Wizard state
  const [isBookingWizardOpen, setIsBookingWizardOpen] = useState(false);

  // Fetch admin status
  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (sessionStatus === "loading") return;

      if (!session?.user) {
        setAdminStatus(null);
        setIsLoadingAdminStatus(false);
        return;
      }

      if (session.user.isRoot) {
        setAdminStatus({
          isAdmin: true,
          adminType: "root_admin",
          isRoot: true,
          managedIds: [],
        });
        setIsLoadingAdminStatus(false);
        return;
      }

      try {
        const response = await fetch("/api/me/admin-status");
        if (response.ok) {
          const data: AdminStatusResponse = await response.json();
          setAdminStatus(data);
        } else {
          setAdminStatus(null);
        }
      } catch {
        setAdminStatus(null);
      } finally {
        setIsLoadingAdminStatus(false);
      }
    };

    fetchAdminStatus();
  }, [session, sessionStatus]);

  // Fetch filter options (organizations and clubs)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!adminStatus?.isAdmin) return;

      try {
        // Fetch organizations from store (for root admin)
        if (adminStatus.adminType === "root_admin") {
          await fetchOrganizations();
          // Don't map here - let separate useEffect handle it when store updates
        }

        // Fetch clubs using store with inflight guard
        await useClubStore.getState().fetchClubsIfNeeded();
        const clubsData = useClubStore.getState().clubs;
        setClubs(clubsData.map((club) => ({
          value: club.id,
          label: club.name,
        })));
      } catch {
        // Silently fail - filter options are optional
      }
    };

    fetchFilterOptions();
  }, [adminStatus, fetchOrganizations]);

  // Update local organizations when store organizations change
  useEffect(() => {
    if (storeOrganizations.length > 0 && adminStatus?.adminType === "root_admin") {
      setOrganizations(storeOrganizations.map((org) => ({
        value: org.id,
        label: org.name,
      })));
    }
  }, [storeOrganizations, adminStatus]);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!adminStatus?.isAdmin) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("perPage", String(perPage));

      if (selectedOrg) params.set("orgId", selectedOrg);
      if (selectedClub) params.set("clubId", selectedClub);
      if (selectedStatus) params.set("status", selectedStatus);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

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
      setLoading(false);
    }
  }, [adminStatus, page, selectedOrg, selectedClub, selectedStatus, dateFrom, dateTo, router, t]);

  // Fetch bookings when filters change
  useEffect(() => {
    if (adminStatus?.isAdmin) {
      fetchBookings();
    }
  }, [adminStatus, fetchBookings]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedOrg, selectedClub, selectedStatus, dateFrom, dateTo]);

  // Clear filters
  const handleClearFilters = () => {
    setSelectedOrg("");
    setSelectedClub("");
    setSelectedStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

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

  // Status options
  const statusOptions = [
    { value: "", label: t("common.allStatuses") || "All Statuses" },
    { value: "pending", label: t("common.pending") },
    { value: "paid", label: t("adminBookings.statusPaid") },
    { value: "reserved", label: t("adminBookings.statusReserved") },
    { value: "cancelled", label: t("common.cancelled") },
  ];

  // Redirect if not authenticated
  if (sessionStatus === "loading" || isLoadingAdminStatus) {
    return (
      <main className="im-admin-bookings-page">
        <div className="im-admin-bookings-loading">
          <div className="im-admin-bookings-loading-spinner" />
          <span>{t("common.loading")}</span>
        </div>
      </main>
    );
  }

  if (!session?.user || !adminStatus?.isAdmin) {
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

  return (
    <main className="im-admin-bookings-page">
      <PageHeader
        title={t("adminBookings.title")}
        description={t("adminBookings.subtitle")}
        actions={
          <Button onClick={handleOpenBookingWizard} variant="primary">
            {t("adminWizard.title")}
          </Button>
        }
      />

      {/* Filters */}
      <div className="im-admin-bookings-filters">
        {/* Organization filter - Root admin only */}
        {adminStatus.adminType === "root_admin" && (
          <div className="im-admin-bookings-filter-group">
            <label>{t("adminBookings.organization")}</label>
            <Select
              options={[
                { value: "", label: t("adminBookings.allOrganizations") },
                ...organizations,
              ]}
              value={selectedOrg}
              onChange={setSelectedOrg}
              placeholder={t("adminBookings.selectOrganization")}
            />
          </div>
        )}

        {/* Club filter - Root and Org admins */}
        {adminStatus.adminType !== "club_admin" && (
          <div className="im-admin-bookings-filter-group">
            <label>{t("adminBookings.club")}</label>
            <Select
              options={[
                { value: "", label: t("adminBookings.allClubs") },
                ...clubs,
              ]}
              value={selectedClub}
              onChange={setSelectedClub}
              placeholder={t("adminBookings.selectClub")}
            />
          </div>
        )}

        {/* Date range filter */}
        <div className="im-admin-bookings-filter-group">
          <label>{t("adminBookings.dateRange")}</label>
          <div className="im-admin-bookings-date-range">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || undefined}
            />
            <span>—</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
            />
          </div>
        </div>

        {/* Status filter */}
        <div className="im-admin-bookings-filter-group">
          <label>{t("common.status")}</label>
          <Select
            options={statusOptions}
            value={selectedStatus}
            onChange={setSelectedStatus}
          />
        </div>

        {/* Clear filters button */}
        <div className="im-admin-bookings-filter-actions">
          <Button variant="outline" size="small" onClick={handleClearFilters}>
            {t("common.clearFilters")}
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="im-admin-bookings-error" role="alert">
          {error}
        </div>
      )}

      {/* Bookings table */}
      {loading ? (
        <div className="im-admin-bookings-loading">
          <div className="im-admin-bookings-loading-spinner" />
          <span>{t("common.loading")}</span>
        </div>
      ) : bookingsData?.bookings.length === 0 ? (
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
        <div className="im-admin-bookings-table-container">
          <table className="im-admin-bookings-table">
            <thead>
              <tr>
                <th>{t("adminBookings.bookingId")}</th>
                <th>{t("adminBookings.user")}</th>
                {adminStatus.adminType === "root_admin" && <th>{t("adminBookings.organization")}</th>}
                {adminStatus.adminType !== "club_admin" && <th>{t("adminBookings.club")}</th>}
                <th>{t("adminBookings.dateTime")}</th>
                <th>{t("adminBookings.court")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.duration")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {bookingsData?.bookings.map((booking) => (
                <tr key={booking.id} onClick={() => handleViewBooking(booking)}>
                  <td>{booking.id.slice(0, 8)}...</td>
                  <td>{booking.userName || booking.userEmail}</td>
                  {adminStatus.adminType === "root_admin" && (
                    <td>{booking.organizationName || "—"}</td>
                  )}
                  {adminStatus.adminType !== "club_admin" && (
                    <td>{booking.clubName}</td>
                  )}
                  <td>{formatDateTime(booking.start)}</td>
                  <td>{booking.courtName}</td>
                  <td><StatusBadge status={booking.status} /></td>
                  <td>{calculateDuration(booking.start, booking.end)} {t("common.minutes")}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="im-admin-bookings-actions">
                      <button
                        className="im-admin-bookings-action-btn im-admin-bookings-action-btn--view"
                        onClick={() => handleViewBooking(booking)}
                      >
                        {t("common.view")}
                      </button>
                      {booking.status !== "cancelled" && (
                        <button
                          className="im-admin-bookings-action-btn im-admin-bookings-action-btn--cancel"
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={isCancelling}
                        >
                          {t("common.cancel")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {bookingsData && bookingsData.totalPages > 1 && (
            <div className="im-admin-bookings-pagination">
              <span className="im-admin-bookings-pagination-info">
                {t("adminBookings.showing", {
                  start: (page - 1) * perPage + 1,
                  end: Math.min(page * perPage, bookingsData.total),
                  total: bookingsData.total,
                })}
              </span>
              <div className="im-admin-bookings-pagination-controls">
                <Button
                  variant="outline"
                  size="small"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t("organizations.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="small"
                  disabled={page >= bookingsData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("organizations.next")}
                </Button>
              </div>
            </div>
          )}
        </div>
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
  );
}
