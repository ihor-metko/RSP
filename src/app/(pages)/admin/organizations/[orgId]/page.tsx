"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, EntityBanner, MetricCardSkeleton, ClubsPreviewSkeleton, TableSkeleton, BookingsPreviewSkeleton, DangerZone, Modal } from "@/components/ui";
import type { DangerAction } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useUserStore } from "@/stores/useUserStore";
import OrganizationAdminsTable from "@/components/admin/OrganizationAdminsTable";
import { OrganizationEditor } from "@/components/admin/OrganizationEditor.client";
import { parseOrganizationMetadata } from "@/types/organization";
import type { AdminBookingResponse } from "@/app/api/admin/bookings/route";

import "./page.css";
import "@/components/ClubDetailPage.css";
import "@/components/EntityPageLayout.css";

// Basic interfaces for this component
// Note: Defined locally to avoid coupling with full User model from Prisma

interface BookingPreview {
  id: string;
  courtName: string;
  clubName: string;
  userName: string | null;
  userEmail: string;
  start: string;
  end: string;
  status: string;
  sportType: string;
}

interface BookingsPreviewData {
  items: BookingPreview[];
  summary: {
    todayCount: number;
    weekCount: number;
    totalUpcoming: number;
  };
}

export default function OrganizationDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;

  // Use store for auth
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  // Use Zustand store
  const ensureOrganizationById = useOrganizationStore((state) => state.ensureOrganizationById);
  const org = useOrganizationStore((state) => state.getOrganizationDetailById(orgId));
  const updateOrganization = useOrganizationStore((state) => state.updateOrganization);
  const loading = useOrganizationStore((state) => state.loading);
  const storeError = useOrganizationStore((state) => state.error);
  // Note: deleteOrganization and archive functionality removed as per requirement to simplify the page
  // Archive/Delete modals can be re-added later if needed via the Danger Zone section

  const [bookingsPreview, setBookingsPreview] = useState<BookingsPreviewData | null>(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState("");
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Edit modal state
  const [isEditingDetails, setIsEditingDetails] = useState(false);



  // Publication toggle
  const [isTogglingPublication, setIsTogglingPublication] = useState(false);

  // Fetch organization from store (with fetch-if-missing pattern)
  const fetchOrgDetail = useCallback(async (force = false) => {
    try {
      setError("");
      await ensureOrganizationById(orgId, { force });
    } catch (err) {
      setError(t("orgDetail.failedToLoad"));
      console.error("Failed to load organization:", err);
    }
  }, [orgId, ensureOrganizationById, t]);

  const fetchBookingsPreview = useCallback(async () => {
    try {
      setLoadingBookings(true);
      // Constants for booking limits
      const MAX_SUMMARY_BOOKINGS = 100;
      const PREVIEW_BOOKINGS_LIMIT = 10;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get week range
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      // Fetch bookings for the organization
      const [todayResponse, weekResponse, upcomingResponse] = await Promise.all([
        fetch(`/api/admin/bookings?orgId=${orgId}&dateFrom=${today.toISOString()}&dateTo=${tomorrow.toISOString()}&perPage=${MAX_SUMMARY_BOOKINGS}`),
        fetch(`/api/admin/bookings?orgId=${orgId}&dateFrom=${today.toISOString()}&dateTo=${weekFromNow.toISOString()}&perPage=${MAX_SUMMARY_BOOKINGS}`),
        fetch(`/api/admin/bookings?orgId=${orgId}&dateFrom=${today.toISOString()}&perPage=${PREVIEW_BOOKINGS_LIMIT}`)
      ]);

      if (todayResponse.ok && weekResponse.ok && upcomingResponse.ok) {
        const [todayData, weekData, upcomingData] = await Promise.all([
          todayResponse.json(),
          weekResponse.json(),
          upcomingResponse.json()
        ]);

        setBookingsPreview({
          items: upcomingData.bookings.map((b: AdminBookingResponse) => ({
            id: b.id,
            courtName: b.courtName,
            clubName: b.clubName,
            userName: b.userName,
            userEmail: b.userEmail,
            start: b.start,
            end: b.end,
            status: b.bookingStatus,
            sportType: b.sportType,
          })),
          summary: {
            todayCount: todayData.total,
            weekCount: weekData.total,
            totalUpcoming: upcomingData.total,
          },
        });
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingBookings(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!isHydrated || isLoading) return;
    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Fetch organization data from store (will use cache if available)
    fetchOrgDetail();
    fetchBookingsPreview();
  }, [isLoggedIn, isLoading, router, orgId, fetchOrgDetail, fetchBookingsPreview, isHydrated]);

  // Debounced user search
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     if (isReassignModalOpen && reassignMode === "existing") {
  //       fetchUsers(userSearch);
  //     }
  //   }, 300);
  //   return () => clearTimeout(timer);
  // }, [userSearch, isReassignModalOpen, reassignMode, fetchUsers]);

  // Handler for opening edit modal
  const handleOpenDetailsEdit = () => {
    setIsEditingDetails(true);
  };


  // Publication toggle handler
  const handleTogglePublication = async () => {
    if (!org) return;

    setIsTogglingPublication(true);
    try {
      const newPublicStatus = !org.isPublic;
      await updateOrganization(orgId, { isPublic: newPublicStatus });
      showToast(
        newPublicStatus ? t("orgDetail.publishSuccess") : t("orgDetail.unpublishSuccess"),
        "success"
      );
      // Force refresh to get updated publication status
      await fetchOrgDetail(true);
      setIsPublishModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("organizations.errors.updateFailed"), "error");
    } finally {
      setIsTogglingPublication(false);
    }
  };

  const handleOpenPublishModal = () => {
    setIsPublishModalOpen(true);
  };

  // Prepare DangerZone actions
  const dangerActions: DangerAction[] = org ? [
    {
      id: 'publish',
      title: org.isPublic ? t("orgDetail.unpublish") : t("orgDetail.publish"),
      description: org.isPublic
        ? t("dangerZone.unpublishOrgDescription")
        : t("dangerZone.publishOrgDescription"),
      buttonLabel: org.isPublic ? t("orgDetail.unpublish") : t("orgDetail.publish"),
      onAction: handleOpenPublishModal,
      isProcessing: isTogglingPublication,
      variant: org.isPublic ? 'danger' : 'warning',
      show: !org.archivedAt,
    },
  ] : [];



  // Show loading spinner while checking authentication or loading org
  const isLoadingState = !isHydrated || isLoading || loading;

  // Parse organization metadata for logo handling
  const orgMetadata = org ? parseOrganizationMetadata(org.metadata) : undefined;

  return (
    <main className="im-org-detail-page">
      {/* Organization Banner */}
      {isLoadingState ? (
        <div className="im-section-card">
          <div className="im-skeleton h-32 w-full rounded-lg" />
        </div>
      ) : (error || storeError) && !org ? (
        <div className="im-org-detail-error">
          <p>{error || storeError || t("orgDetail.notFound")}</p>
          <Button onClick={() => router.push("/admin/organizations")}>
            {t("common.backToDashboard")}
          </Button>
        </div>
      ) : org && (
        <EntityBanner
          title={org.name}
          subtitle={org.description || null}
          location={org.address}
          imageUrl={org.heroImage}
          bannerAlignment={orgMetadata?.bannerAlignment || 'center'}
          logoUrl={org.logo}
          logoMetadata={orgMetadata}
          imageAlt={`${org.name} banner`}
          logoAlt={`${org.name} logo`}
          isPublished={org.isPublic ?? true}
          isArchived={!!org.archivedAt}
          onEdit={!org.archivedAt ? handleOpenDetailsEdit : undefined}
        />
      )}

      <div className="entity-page-content">
        {/* Toast */}
        {toast && (
          <div className={`im-toast im-toast--${toast.type}`}>{toast.message}</div>
        )}

        {/* Organization Admins Management - People Block */}
        {loading || !org ? (
          <div className="im-section-card im-org-detail-content--full">
            <div className="im-section-header">
              <div className="im-skeleton im-skeleton-icon--round w-10 h-10" />
              <div className="im-skeleton h-6 w-48 rounded" />
            </div>
            <TableSkeleton rows={3} columns={4} showHeader={true} />
          </div>
        ) : (
          <div className="im-section-card im-org-detail-content--full">
            <OrganizationAdminsTable
              orgId={orgId}
              admins={(org.superAdmins || []).map(admin => ({
                id: admin.membershipId,
                type: "superadmin" as const,
                userId: admin.id,
                userName: admin.name,
                userEmail: admin.email,
                isPrimaryOwner: admin.isPrimaryOwner,
                // Note: lastLoginAt is not available from organization detail endpoint
                // Consider enhancing the store to fetch this data separately if needed
                lastLoginAt: null,
                createdAt: new Date(), // Placeholder, not displayed in UI
              }))}
              onRefresh={() => fetchOrgDetail(true)}
            />
          </div>
        )}

        {/* Key Metrics */}
        {isLoadingState ? (
          <div className="im-section-card im-org-detail-content--full">
            <div className="im-section-header">
              <div className="im-skeleton im-skeleton-icon--round w-10 h-10" />
              <div className="im-skeleton h-6 w-48 rounded" />
            </div>
            <div className="im-metrics-grid">
              <MetricCardSkeleton size="md" />
              <MetricCardSkeleton size="md" />
              <MetricCardSkeleton size="md" />
            </div>
          </div>
        ) : org && (
          <div className="im-section-card im-org-detail-content--full">
            <div className="im-section-header">
              <div className="im-section-icon im-section-icon--metrics">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                  <path d="M22 12A10 10 0 0 0 12 2v10z" />
                </svg>
              </div>
              <h2 className="im-section-title">{t("orgDetail.keyMetrics")}</h2>
            </div>
            <div className="im-metrics-grid">
              <div className="im-metric-card im-metric-card--clubs">
                <div className="im-metric-value">{org.metrics?.totalClubs ?? 0}</div>
                <div className="im-metric-label">{t("orgDetail.totalClubs")}</div>
              </div>
              <div className="im-metric-card im-metric-card--courts">
                <div className="im-metric-value">{org.metrics?.totalCourts ?? 0}</div>
                <div className="im-metric-label">{t("orgDetail.totalCourts")}</div>
              </div>
              <div className="im-metric-card im-metric-card--bookings">
                <div className="im-metric-value">{org.metrics?.activeBookings ?? 0}</div>
                <div className="im-metric-label">{t("orgDetail.activeBookings")}</div>
              </div>
            </div>
          </div>
        )}

        {/* Clubs Preview */}
        {isLoadingState ? (
          <ClubsPreviewSkeleton count={3} />
        ) : org && (
          <div className="im-section-card">
            <div className="im-section-header">
              <div className="im-section-icon im-section-icon--clubs">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h2 className="im-section-title">{t("orgDetail.clubs")}</h2>
              {!org.archivedAt && (
                <div className="im-section-actions">
                  <Button
                    variant="primary"
                    onClick={() => router.push(`/admin/clubs/new?organizationId=${orgId}`)}
                  >
                    {t("orgDetail.createNewClub")}
                  </Button>
                </div>
              )}
            </div>
            {(org.clubsPreview ?? []).length === 0 ? (
              <div className="im-preview-empty-state">
                <p className="im-preview-empty">{t("orgDetail.noClubs")}</p>
                {!org.archivedAt && (
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => router.push(`/admin/clubs/new?organizationId=${orgId}`)}
                  >
                    {t("orgDetail.createFirstClub")}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="im-clubs-preview-list">
                  {(org.clubsPreview ?? []).map((club) => (
                    <div
                      key={club.id}
                      className="im-club-preview-item im-club-preview-item--clickable"
                      onClick={() => router.push(`/admin/clubs/${club.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/admin/clubs/${club.id}`);
                        }
                      }}
                    >
                      <div className="im-club-preview-info">
                        <span className="im-club-preview-name">{club.name}</span>
                        <span className="im-club-preview-meta">
                          {club.city || club.slug} · {club.courtCount} {t("orgDetail.courts")}
                        </span>
                      </div>
                      <div className="im-club-preview-status">
                        <span
                          className={`im-status-badge ${club.isPublic ? "im-status-badge--active" : "im-status-badge--draft"}`}
                        >
                          {club.isPublic ? t("common.published") : t("common.unpublished")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {(org.metrics?.totalClubs ?? 0) > (org.clubsPreview ?? []).length && (
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => router.push(`/admin/organizations/${orgId}/clubs`)}
                    className="im-view-all-btn"
                  >
                    {t("orgDetail.viewAllClubs")} ({org.metrics?.totalClubs})
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* Bookings Summary */}
        {loadingBookings ? (
          <BookingsPreviewSkeleton count={5} className="im-org-detail-content--full" />
        ) : bookingsPreview && (
          <div className="im-section-card im-org-detail-content--full">
            <div className="im-section-header">
              <div className="im-section-icon im-section-icon--bookings">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h2 className="im-section-title">{t("orgDetail.bookingsOverview")}</h2>
              <div className="im-section-actions">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/admin/bookings?orgId=${orgId}`)}
                >
                  {t("orgDetail.viewAllBookings")}
                </Button>
              </div>
            </div>
            <div className="im-bookings-summary">
              <div className="im-bookings-summary-item">
                <span className="im-bookings-summary-value">{bookingsPreview.summary.todayCount}</span>
                <span className="im-bookings-summary-label">{t("orgDetail.bookingsToday")}</span>
              </div>
              <div className="im-bookings-summary-item">
                <span className="im-bookings-summary-value">{bookingsPreview.summary.weekCount}</span>
                <span className="im-bookings-summary-label">{t("orgDetail.bookingsThisWeek")}</span>
              </div>
              <div className="im-bookings-summary-item">
                <span className="im-bookings-summary-value">{bookingsPreview.summary.totalUpcoming}</span>
                <span className="im-bookings-summary-label">{t("orgDetail.totalUpcoming")}</span>
              </div>
            </div>
            {bookingsPreview.items.length === 0 ? (
              <p className="im-preview-empty">{t("orgDetail.noBookings")}</p>
            ) : (
              <div className="im-bookings-preview-list">
                <h4 className="im-bookings-preview-title">{t("orgDetail.upcomingBookings")}</h4>
                {bookingsPreview.items.map((booking) => {
                  const startDate = new Date(booking.start);
                  const endDate = new Date(booking.end);

                  return (
                    <div key={booking.id} className="im-booking-preview-item">
                      <div className="im-booking-preview-info">
                        <span className="im-booking-preview-court">{booking.clubName} - {booking.courtName}</span>
                        <span className="im-booking-preview-meta">
                          {booking.userName || booking.userEmail} · {booking.sportType}
                        </span>
                      </div>
                      <div className="im-booking-preview-time">
                        <span className="im-booking-preview-date">
                          {startDate.toLocaleDateString()}
                        </span>
                        <span className="im-booking-preview-hours">
                          {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className={`im-status-badge im-status-badge--${booking.status.toLowerCase()}`}>
                        {booking.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Danger Zone Section - At the very bottom */}
        {org && !org.archivedAt && (
          <section className="im-org-detail-danger-zone-section" style={{ gridColumn: '1 / -1' }}>
            <DangerZone actions={dangerActions} />
          </section>
        )}

        {/* Organization Editor Modal */}
        {org && (
          <OrganizationEditor
            isOpen={isEditingDetails}
            onClose={() => setIsEditingDetails(false)}
            organization={org}
            onUpdate={updateOrganization}
            onRefresh={() => fetchOrgDetail(true)}
          />
        )}

        {/* Publish/Unpublish Confirmation Modal */}
        {org && (
          <Modal
            isOpen={isPublishModalOpen}
            onClose={() => setIsPublishModalOpen(false)}
            title={org.isPublic ? t("orgDetail.unpublish") : t("orgDetail.publish")}
          >
            <p className="mb-4">
              {org.isPublic
                ? t("dangerZone.unpublishOrgConfirm", { name: org.name })
                : t("dangerZone.publishOrgConfirm", { name: org.name })
              }
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPublishModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleTogglePublication}
                disabled={isTogglingPublication}
                className={org.isPublic ? "bg-red-500 hover:bg-red-600" : ""}
              >
                {isTogglingPublication ? t("common.processing") : (org.isPublic ? t("orgDetail.unpublish") : t("orgDetail.publish"))}
              </Button>
            </div>
          </Modal>
        )}

        {/* Archive Modal */}
        {/* <Modal
          isOpen={isArchiveModalOpen}
          onClose={() => setIsArchiveModalOpen(false)}
          title={t("orgDetail.archiveOrg")}
        >
          <div className="space-y-4">
            {archiveError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {archiveError}
              </div>
            )}
            <p>{t("orgDetail.archiveConfirm", { name: org.name })}</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsArchiveModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="danger" onClick={handleArchive} disabled={archiving}>
                {archiving ? t("common.processing") : t("orgDetail.archive")}
              </Button>
            </div>
          </div>
        </Modal> */}

        {/* Delete Modal */}
        {/* <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title={t("orgDetail.deleteOrg")}
        >
          <div className="space-y-4">
            {deleteError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {deleteError}
              </div>
            )}
            <p className="im-delete-warning">{t("orgDetail.deleteConfirm", { name: org.name })}</p>
            {org.metrics.totalClubs > 0 && (
              <div className="rsp-warning bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-sm">
                {t("orgDetail.deleteWithClubsWarning", { count: org.metrics.totalClubs })}
              </div>
            )}
            <p className="im-delete-confirm-hint">{t("orgDetail.typeSlugToConfirm")}</p>
            <Input
              label={t("orgDetail.confirmSlug")}
              value={deleteConfirmSlug}
              onChange={(e) => setDeleteConfirmSlug(e.target.value)}
              placeholder={org.slug}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmSlug.toLowerCase() !== org.slug.toLowerCase()}
              >
                {deleting ? t("common.processing") : t("common.delete")}
              </Button>
            </div>
          </div>
        </Modal> */}
      </div>
    </main>
  );
}
