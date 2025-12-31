"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Button, Card, Modal, IMLink, ImageCarousel, EntityBanner, DangerZone, BookingsPreviewSkeleton } from "@/components/ui";
import type { DangerAction } from "@/components/ui";
import { ClubContactsView } from "@/components/admin/club/ClubContactsView";
import { ClubHoursView } from "@/components/admin/club/ClubHoursView";
import { ClubCourtsQuickList } from "@/components/admin/club/ClubCourtsQuickList";
import { ClubGalleryView } from "@/components/admin/club/ClubGalleryView";
import AdminManagementSection from "@/components/admin/AdminManagementSection";
import { ClubEditor } from "@/components/admin/ClubEditor.client";
import { WeeklyAvailabilityTimeline } from "@/components/WeeklyAvailabilityTimeline";
import { GalleryModal } from "@/components/GalleryModal";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { useClubPageData } from "@/hooks/useClubPageData";
import { useCanEditClub } from "@/hooks/useCanEditClub";
import { isValidImageUrl, getImageUrl } from "@/utils/image";
import { formatPrice } from "@/utils/price";
import { parseTags, getPriceRange, getCourtCounts } from "@/utils/club";
import { parseClubMetadata } from "@/types/club";
import { useUserStore } from "@/stores/useUserStore";
import "./page.css";
import "@/components/ClubDetailPage.css";
import "@/components/EntityPageLayout.css";

// Create a loading component wrapper for map
function MapLoadingPlaceholder({ message }: { message: string }) {
  return (
    <div className="rsp-club-map-placeholder">
      <span className="rsp-club-map-placeholder-text">{message}</span>
    </div>
  );
}

// Lazy load the ClubMap component for performance optimization
const ClubMap = dynamic(() => import("@/components/ClubMap").then((mod) => mod.ClubMap), {
  ssr: false,
});

export default function AdminClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const t = useTranslations();
  const [clubId, setClubId] = useState<string | null>(null);

  // Use orchestration hook for all club data
  // Note: loadAdmins is false because AdminManagementSection fetches independently
  const {
    club,
    bookingsPreview,
    isClubLoading,
    bookingsLoading,
    error: dataError,
    refetchClub,
  } = useClubPageData(clubId, { loadAdmins: false });

  // Store actions for mutations
  const deleteClub = useAdminClubStore((state) => state.deleteClub);

  // UI-only state
  const [error, setError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingStore = useUserStore((state) => state.isLoading);

  // Check if user can edit this club (Club Owner or Club Admin only)
  const canEdit = useCanEditClub(clubId);
  const editDisabledTooltip = t("clubDetail.onlyClubAdminCanEdit");

  // Unwrap params early to enable immediate loading state
  useEffect(() => {
    params.then((resolvedParams) => {
      setClubId(resolvedParams.id);
    });
  }, [params]);

  // Handle errors from data fetching
  useEffect(() => {
    if (dataError) {
      if (dataError.includes("404") || dataError.includes("not found")) {
        setError(t("clubDetail.clubNotFoundError"));
      } else if (dataError.includes("401") || dataError.includes("403")) {
        router.push("/auth/sign-in");
      } else {
        setError(dataError);
      }
    } else {
      setError("");
    }
  }, [dataError, router, t]);

  // Admin status is loaded from store via UserStoreInitializer
  useEffect(() => {
    if (isLoadingStore) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Check admin status
    if (!adminStatus?.isAdmin && !isLoadingStore) {
      // User is not an admin, redirect
      router.push("/auth/sign-in");
    }
  }, [isLoggedIn, isLoadingStore, adminStatus, router]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleSectionUpdate = useCallback(async (section: string, payload: Record<string, unknown>) => {
    if (!clubId) return;

    try {
      // Section updates still use direct API call as they're not part of the basic store
      // This is a specialized admin endpoint for partial updates
      const response = await fetch(`/api/admin/clubs/${clubId}/section`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, payload }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update section");
      }

      const updatedClub = await response.json();
      // Refresh club data from store to keep it in sync
      await refetchClub();
      showToast("success", t("clubDetail.changesSavedSuccess"));
      return updatedClub;
    } catch (err) {
      const message = err instanceof Error ? err.message : t("clubDetail.failedToSaveChanges");
      showToast("error", message);
      throw err;
    }
  }, [clubId, refetchClub, showToast, t]);

  const handleDelete = async () => {
    if (!clubId) return;

    setSubmitting(true);
    try {
      await deleteClub(clubId);
      router.push("/admin/clubs");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : t("clubDetail.failedToDeleteClub"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!club) return;

    setIsTogglingPublish(true);
    try {
      await handleSectionUpdate("header", {
        name: club.name,
        slug: club.slug,
        shortDescription: club.shortDescription,
        isPublic: !club.isPublic,
      });
      setIsPublishModalOpen(false);
      showToast("success", club.isPublic ? t("clubDetail.clubUnpublishedSuccess") : t("clubDetail.clubPublishedSuccess"));
    } catch {
      // Error already handled in handleSectionUpdate
    } finally {
      setIsTogglingPublish(false);
    }
  };

  const handleOpenPublishModal = () => {
    setIsPublishModalOpen(true);
  };

  const handleOpenDetailsEdit = () => {
    setIsEditingDetails(true);
  };

  // Determine if user can delete clubs (only root admin)
  const canDelete = adminStatus?.adminType === "root_admin";

  // Prepare DangerZone actions
  const dangerActions: DangerAction[] = [
    {
      id: 'publish',
      title: club?.isPublic ? t("entityBanner.unpublish") : t("entityBanner.publish"),
      description: club?.isPublic
        ? t("dangerZone.unpublishClubDescription")
        : t("dangerZone.publishClubDescription"),
      buttonLabel: club?.isPublic ? t("entityBanner.unpublish") : t("entityBanner.publish"),
      onAction: handleOpenPublishModal,
      isProcessing: isTogglingPublish,
      variant: club?.isPublic ? 'danger' : 'warning',
      show: true,
    },
    {
      id: 'delete',
      title: t("clubs.deleteClub"),
      description: t("dangerZone.deleteClubDescription"),
      buttonLabel: t("common.delete"),
      onAction: () => setIsDeleteModalOpen(true),
      isProcessing: submitting,
      variant: 'danger',
      show: canDelete,
    },
  ];

  // Loading skeleton - Show while params are being resolved OR while club data is loading
  if (!clubId || isClubLoading || isLoadingStore) {
    return (
      <main className="im-admin-club-detail-page">
        <div className="im-admin-club-skeleton-hero" />
        <div className="im-admin-club-skeleton-content">
          <div className="im-admin-club-skeleton-title" />
          <div className="im-admin-club-skeleton-text" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="im-admin-club-detail-page p-8">
        <div className="tm-error-banner text-center p-6 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl">
          {error}
        </div>
        <div className="mt-4 text-center">
          <IMLink href="/admin/clubs">{t("clubs.backToClubs")}</IMLink>
        </div>
      </main>
    );
  }

  if (!club) {
    return null;
  }

  // Prepare derived data
  const clubTags = parseTags(club.tags);
  const priceRange = getPriceRange(club.courts);
  const courtCounts = getCourtCounts(club.courts);
  const hasValidCoordinates = club.latitude != null && club.longitude != null;

  // Format location display
  const locationDisplay = [club.city, club.country].filter(Boolean).join(", ") || club.location;

  // Prepare gallery images for carousel and modal
  const galleryImages = (club.gallery || [])
    .map((image) => {
      const imageUrl = getImageUrl(image.imageUrl);
      return isValidImageUrl(imageUrl)
        ? { url: imageUrl as string, alt: image.altText || `${club.name} gallery image` }
        : null;
    })
    .filter((img): img is { url: string; alt: string } => img !== null);

  // Gallery modal handlers
  const handleGalleryOpen = (index: number) => {
    setGalleryIndex(index);
    setIsGalleryOpen(true);
  };

  const handleGalleryClose = () => {
    setIsGalleryOpen(false);
  };

  const handleGalleryNavigate = (index: number) => {
    setGalleryIndex(index);
  };

  // Parse club metadata for logo and banner settings
  const clubMetadata = parseClubMetadata(club.metadata);

  return (
    <main className="im-admin-club-detail-page">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`im-toast ${toast.type === "success" ? "im-toast--success" : "im-toast--error"}`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      {/* Hero Banner Section */}
      <EntityBanner
        title={club.name}
        subtitle={club.shortDescription}
        location={locationDisplay}
        imageUrl={club.bannerData?.url}
        bannerAlignment={clubMetadata?.bannerAlignment || 'center'}
        logoUrl={club.logoData?.url}
        logoMetadata={clubMetadata}
        imageAlt={`${club.name} hero image`}
        logoAlt={`${club.name} logo`}
        isPublished={club.isPublic}
        onEdit={handleOpenDetailsEdit}
        editDisabled={!canEdit}
        editDisabledTooltip={editDisabledTooltip}
      />

      {/* Main Content */}
      <div className="entity-page-content">
        {/* Club Admins Section */}
        <section className="im-admin-club-admins-section">
          <AdminManagementSection
            context="club"
            contextId={club.id}
            clubData={{
              id: club.id,
              name: club.name,
              organizationId: club.organizationId,
            }}
          />
        </section>

        {/* Court Availability Section */}
        {club.courts.length > 0 && (
          <section className="im-admin-club-availability-section">
            <WeeklyAvailabilityTimeline clubId={club.id} />
          </section>
        )}

        {/* Info Grid - matching player page layout */}
        <div className="im-admin-club-info-grid">
          {/* Left Column - Description & Details */}
          <div className="im-admin-club-info-column">
            {/* Courts Summary with Edit */}
            <Card className="im-admin-club-info-card">
              <ClubCourtsQuickList 
                club={club} 
                disabled={!canEdit}
                disabledTooltip={editDisabledTooltip}
              />

              {/* Court type badges */}
              <div className="im-admin-club-courts-summary">
                {courtCounts.indoor > 0 && (
                  <span className="im-admin-club-badge im-admin-club-badge-indoor">
                    <span className="im-admin-club-court-type-count">{courtCounts.indoor}</span> {t("clubs.indoor")}
                  </span>
                )}
                {courtCounts.outdoor > 0 && (
                  <span className="im-admin-club-badge im-admin-club-badge-outdoor">
                    <span className="im-admin-club-court-type-count">{courtCounts.outdoor}</span> {t("clubs.outdoor")}
                  </span>
                )}
              </div>

              {/* Price range */}
              {priceRange && (
                <div className="im-admin-club-price-range">
                  <span className="im-admin-club-price-label">{t("clubs.priceRangeLabel")}</span>
                  <span className="im-admin-club-price-value">
                    {priceRange.min === priceRange.max
                      ? formatPrice(priceRange.min)
                      : `${formatPrice(priceRange.min)} - ${formatPrice(priceRange.max)}`}
                  </span>
                  <span className="im-admin-club-price-label">{t("clubs.perHour")}</span>
                </div>
              )}

              {/* Tags */}
              {clubTags.length > 0 && (
                <div className="im-admin-club-tags-list">
                  {clubTags.map((tag, index) => (
                    <span key={index} className="im-admin-club-tag">{tag}</span>
                  ))}
                </div>
              )}
            </Card>

            {/* Map Section */}
            {hasValidCoordinates && (
              <Card className="im-admin-club-info-card">
                <div className="im-admin-club-section-header">
                  <h2 className="im-admin-club-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6" />
                      <line x1="8" y1="2" x2="8" y2="18" />
                      <line x1="16" y1="6" x2="16" y2="22" />
                    </svg>
                    {t("clubs.location")}
                  </h2>
                </div>
                {process.env.NODE_ENV === "production" ? (
                  <Suspense fallback={<MapLoadingPlaceholder message={t("common.loadingMap")} />}>
                    <ClubMap
                      latitude={club.latitude!}
                      longitude={club.longitude!}
                      clubName={club.name}
                    />
                  </Suspense>
                ) : (
                  <div>{t("common.mapHiddenInDev")}</div>
                )}
                <p className="im-admin-club-map-address">{club.location}</p>
              </Card>
            )}
          </div>

          {/* Right Column - Contact & Hours */}
          <div className="im-admin-club-info-column">
            {/* Contact Info Card with Edit */}
            <Card className="im-admin-club-info-card">
              <ClubContactsView
                club={club}
                onUpdate={(payload) => handleSectionUpdate("contacts", payload)}
                disabled={!canEdit}
                disabledTooltip={editDisabledTooltip}
              />
            </Card>

            {/* Business Hours Card with Edit */}
            <Card className="im-admin-club-info-card">
              <ClubHoursView
                club={club}
                onUpdate={(payload) => handleSectionUpdate("hours", payload)}
                disabled={!canEdit}
                disabledTooltip={editDisabledTooltip}
              />
            </Card>
          </div>
        </div>

        {/* Gallery Section */}
        <section className="im-admin-club-gallery-section">
          <Card className="im-admin-club-info-card">
            <ClubGalleryView
              club={club}
              onUpdate={(payload) => handleSectionUpdate("gallery", payload)}
              disabled={!canEdit}
              disabledTooltip={editDisabledTooltip}
            />
          </Card>

          {/* Gallery Carousel with Modal */}
          {galleryImages.length > 0 && (
            <div className="im-admin-club-gallery-carousel">
              <ImageCarousel
                images={galleryImages}
                onImageClick={handleGalleryOpen}
                showIndicators={true}
                loop={true}
              />
            </div>
          )}
        </section>

        {/* Bookings Summary */}
        {bookingsLoading ? (
          <BookingsPreviewSkeleton count={5} className="im-admin-club-bookings-section" />
        ) : bookingsPreview && club && (
          <section className="im-admin-club-bookings-section">
            <div className="im-section-card">
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
                    onClick={() => router.push(`/admin/bookings?clubId=${club.id}`)}
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
                          <span className="im-booking-preview-court">{booking.courtName}</span>
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
          </section>
        )}

        {/* Danger Zone Section - At the very bottom */}
        <section className="im-admin-club-danger-zone-section">
          <DangerZone actions={dangerActions} />
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t("clubs.deleteClub")}
      >
        <p className="mb-4">
          {t("clubs.deleteConfirm", { name: club.name })}
        </p>
        <p className="mb-4 text-sm opacity-70">
          {t("clubs.deleteWarningDetails")}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleDelete}
            disabled={submitting}
            className="bg-red-500 hover:bg-red-600"
          >
            {submitting ? t("common.processing") : t("common.delete")}
          </Button>
        </div>
      </Modal>

      {/* Publish/Unpublish Confirmation Modal */}
      <Modal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title={club.isPublic ? t("entityBanner.unpublish") : t("entityBanner.publish")}
      >
        <p className="mb-4">
          {club.isPublic
            ? t("dangerZone.unpublishClubConfirm", { name: club.name })
            : t("dangerZone.publishClubConfirm", { name: club.name })
          }
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsPublishModalOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleTogglePublish}
            disabled={isTogglingPublish}
            className={club.isPublic ? "bg-red-500 hover:bg-red-600" : ""}
          >
            {isTogglingPublish ? t("common.processing") : (club.isPublic ? t("entityBanner.unpublish") : t("entityBanner.publish"))}
          </Button>
        </div>
      </Modal>

      {/* Gallery Modal */}
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={handleGalleryClose}
        images={galleryImages}
        currentIndex={galleryIndex}
        onNavigate={handleGalleryNavigate}
      />

      {/* Club Editor Modal */}
      {club && (
        <ClubEditor
          isOpen={isEditingDetails}
          onClose={() => setIsEditingDetails(false)}
          club={club}
          onUpdate={handleSectionUpdate}
          onRefresh={refetchClub}
        />
      )}
    </main>
  );
}
