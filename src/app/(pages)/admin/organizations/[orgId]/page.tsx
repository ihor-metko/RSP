"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, EntityBanner, MetricCardSkeleton, ClubsPreviewSkeleton, TableSkeleton, DangerZone, Modal } from "@/components/ui";
import type { DangerAction } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useUserStore } from "@/stores/useUserStore";
import { useClubStatisticsStore } from "@/stores/useClubStatisticsStore";
import AdminManagementSection from "@/components/admin/AdminManagementSection";
import { OrganizationEditor } from "@/components/admin/OrganizationEditor.client";
import { parseOrganizationMetadata } from "@/types/organization";

import "./page.css";
import "@/components/ClubDetailPage.css";
import "@/components/EntityPageLayout.css";

// Constants
const CLUBS_PREVIEW_LIMIT = 5;

/**
 * Helper function to get trend information based on occupancy change percentage
 */
function getTrendInfo(changePercent: number | null): {
  className: string;
  arrow: string;
} {
  if (changePercent === null) {
    return { className: 'im-club-preview-trend--neutral', arrow: '→' };
  }
  if (changePercent > 0) {
    return { className: 'im-club-preview-trend--up', arrow: '↑' };
  }
  if (changePercent < 0) {
    return { className: 'im-club-preview-trend--down', arrow: '↓' };
  }
  return { className: 'im-club-preview-trend--neutral', arrow: '→' };
}

/**
 * Helper function to check if organization has reached club creation limit
 */
function isClubLimitReached(currentClubCount: number, maxClubs?: number): boolean {
  return currentClubCount >= (maxClubs ?? 3);
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
  const hasRole = useUserStore((state) => state.hasRole);

  // Use Zustand store for organization
  const ensureOrganizationById = useOrganizationStore((state) => state.ensureOrganizationById);
  const org = useOrganizationStore((state) => state.getOrganizationDetailById(orgId));
  const updateOrganization = useOrganizationStore((state) => state.updateOrganization);
  const loading = useOrganizationStore((state) => state.loading);
  const storeError = useOrganizationStore((state) => state.error);
  
  // Use Zustand store for organization clubs
  const ensureOrganizationClubs = useOrganizationStore((state) => state.ensureOrganizationClubs);
  const clubsData = useOrganizationStore((state) => state.getOrganizationClubsById(orgId));

  // Statistics store
  const monthlyStatistics = useClubStatisticsStore((state) => state.monthlyStatistics);
  const setMonthlyStatistics = useClubStatisticsStore((state) => state.setMonthlyStatistics);

  // Local state
  const [clubsLoading, setClubsLoading] = useState(false);
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

  // Fetch clubs from store
  const fetchClubs = useCallback(async (force = false) => {
    try {
      setClubsLoading(true);
      await ensureOrganizationClubs(orgId, { force, limit: CLUBS_PREVIEW_LIMIT });
    } catch (err) {
      console.error("Failed to load clubs:", err);
    } finally {
      setClubsLoading(false);
    }
  }, [orgId, ensureOrganizationClubs]);

  useEffect(() => {
    if (!isHydrated || isLoading) return;
    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Fetch organization data from store (will use cache if available)
    fetchOrgDetail();
  }, [isLoggedIn, isLoading, router, orgId, fetchOrgDetail, isHydrated]);

  // Fetch clubs when organization is loaded
  useEffect(() => {
    if (!org) return;
    
    // Fetch clubs separately from the new endpoint
    fetchClubs();
  }, [org, fetchClubs]);

  // Fetch monthly statistics for organization's clubs (current month with lazy calculation)
  useEffect(() => {
    if (!org || !orgId) return;

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Fetch with lazy calculation enabled for current month
    const fetchStats = async () => {
      try {
        // Build query params for organization-level stats with lazy calculation
        const params = new URLSearchParams({
          organizationId: orgId,
          month: currentMonth.toString(),
          year: currentYear.toString(),
          lazyCalculate: "true",
        });

        const response = await fetch(`/api/admin/statistics/monthly?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          // Data is an array of { clubId, clubName, statistics }
          // Extract statistics and update store
          interface OrganizationStatisticsResponse {
            clubId: string;
            clubName: string;
            statistics: {
              id: string;
              clubId: string;
              month: number;
              year: number;
              averageOccupancy: number;
              previousMonthOccupancy: number | null;
              occupancyChangePercent: number | null;
              createdAt: string;
              updatedAt: string;
            } | null;
          }
          const stats = (data as OrganizationStatisticsResponse[])
            .filter((item) => item.statistics !== null)
            .map((item) => item.statistics!);

          setMonthlyStatistics(stats);
        }
      } catch (err) {
        console.error("Failed to fetch organization statistics:", err);
      }
    };

    fetchStats();
  }, [org, orgId, setMonthlyStatistics]);

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

  // Determine if user can publish/unpublish this organization (only root admin)
  const canPublish = hasRole("ROOT_ADMIN");

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
      show: !org.archivedAt && canPublish,
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
          imageUrl={org.bannerData?.url}
          bannerAlignment={orgMetadata?.bannerAlignment || 'center'}
          logoUrl={org.logoData?.url}
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
          <div className="im-org-detail-content--full">
            <AdminManagementSection
              context="organization"
              contextId={orgId}
              organizationData={{
                id: org.id,
                name: org.name,
                slug: org.slug,
              }}
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
        {clubsLoading || isLoadingState ? (
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
                  {(() => {
                    const currentClubCount = clubsData?.pagination?.totalCount ?? 0;
                    const maxClubs = org.maxClubs ?? 3;
                    const limitReached = isClubLimitReached(currentClubCount, org.maxClubs);
                    
                    return (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <Button
                          variant="primary"
                          onClick={() => router.push(`/admin/clubs/new?organizationId=${orgId}`)}
                          disabled={limitReached}
                          title={limitReached ? t("orgDetail.clubLimitReached", { maxClubs }) : undefined}
                        >
                          {t("orgDetail.createNewClub")}
                        </Button>
                        {limitReached && (
                          <div style={{ 
                            marginTop: '0.5rem', 
                            fontSize: '0.875rem', 
                            color: 'var(--color-text-secondary)' 
                          }}>
                            {t("orgDetail.clubLimitReachedMessage", { current: currentClubCount, max: maxClubs })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            {!clubsData || clubsData.clubs.length === 0 ? (
              <div className="im-preview-empty-state">
                <p className="im-preview-empty">{t("orgDetail.noClubs")}</p>
                {!org.archivedAt && (() => {
                  const currentClubCount = clubsData?.pagination?.totalCount ?? 0;
                  const maxClubs = org.maxClubs ?? 3;
                  const limitReached = isClubLimitReached(currentClubCount, org.maxClubs);
                  
                  return (
                    <>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => router.push(`/admin/clubs/new?organizationId=${orgId}`)}
                        disabled={limitReached}
                        title={limitReached ? t("orgDetail.clubLimitReached", { maxClubs }) : undefined}
                      >
                        {t("orgDetail.createFirstClub")}
                      </Button>
                      {limitReached && (
                        <div style={{ 
                          marginTop: '0.5rem', 
                          fontSize: '0.875rem', 
                          color: 'var(--color-text-secondary)' 
                        }}>
                          {t("orgDetail.clubLimitReachedMessage", { current: currentClubCount, max: maxClubs })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <>
                <div className="im-clubs-preview-list">
                  {clubsData.clubs.map((club) => {
                    // Find statistics for this club
                    const clubStats = monthlyStatistics.find(stat => stat.clubId === club.id);
                    // Get trend info if statistics are available
                    const trendInfo = clubStats?.occupancyChangePercent !== null && clubStats
                      ? getTrendInfo(clubStats.occupancyChangePercent)
                      : null;

                    // Format address display - prioritize location (full address), fall back to city
                    const addressDisplay = club.location || club.city || club.slug || "";

                    return (
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
                            {addressDisplay} · {club.statistics.courtCount} {t("orgDetail.courts")}
                          </span>
                        </div>

                        {/* Inline Statistics */}
                        {(
                          <div className="im-club-preview-stats">
                            <div className="im-club-preview-occupancy">
                              <span className="im-club-preview-occupancy-value">
                                {clubStats ? clubStats.averageOccupancy.toFixed(1) : "0"}%
                              </span>
                              <span className="im-club-preview-occupancy-label">
                                {t("orgDetail.occupancy")}
                              </span>
                            </div>
                            {trendInfo && (
                              <div className={`im-club-preview-trend ${trendInfo.className}`}>
                                <span className="im-club-preview-trend-arrow" aria-hidden="true">
                                  {trendInfo.arrow}
                                </span>
                                <span className="im-club-preview-trend-value">
                                  {clubStats ? Math.abs(clubStats.occupancyChangePercent!).toFixed(1) : "0"}%
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="im-club-preview-status">
                          <span
                            className={`im-status-badge ${club.isPublic ? "im-status-badge--active" : "im-status-badge--draft"}`}
                          >
                            {club.isPublic ? t("common.published") : t("common.unpublished")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(org.metrics?.totalClubs ?? 0) > clubsData.clubs.length && (
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
