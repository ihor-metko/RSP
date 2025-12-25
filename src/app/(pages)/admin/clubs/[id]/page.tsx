"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, Modal, IMLink, Breadcrumbs, ImageCarousel, EntityBanner } from "@/components/ui";
import { ClubHeaderView } from "@/components/admin/club/ClubHeaderView";
import { ClubContactsView } from "@/components/admin/club/ClubContactsView";
import { ClubHoursView } from "@/components/admin/club/ClubHoursView";
import { ClubCourtsQuickList } from "@/components/admin/club/ClubCourtsQuickList";
import { ClubGalleryView } from "@/components/admin/club/ClubGalleryView";
import { ClubCoachesView } from "@/components/admin/club/ClubCoachesView";
import { ClubAdminsSection } from "@/components/admin/club/ClubAdminsSection";
import { WeeklyAvailabilityTimeline } from "@/components/WeeklyAvailabilityTimeline";
import { GalleryModal } from "@/components/GalleryModal";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { isValidImageUrl, getImageUrl } from "@/utils/image";
import { formatPrice } from "@/utils/price";
import { parseTags, getPriceRange, getCourtCounts, getGoogleMapsEmbedUrl } from "@/utils/club";
import { EntityEditStepper } from "@/components/admin/EntityEditStepper.client";
import { BasicInfoStep, AddressStep } from "@/components/admin/ClubSteps";
import { LogoStep, BannerStep } from "@/components/admin/SharedSteps";

import { useUserStore } from "@/stores/useUserStore";
import "./page.css";

export default function AdminClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const t = useTranslations();
  const [clubId, setClubId] = useState<string | null>(null);

  // Use centralized admin club store
  const currentClub = useAdminClubStore((state) => state.currentClub);
  const loading = useAdminClubStore((state) => state.loading);
  const fetchClubById = useAdminClubStore((state) => state.fetchClubById);
  const deleteClub = useAdminClubStore((state) => state.deleteClub);

  const [error, setError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingStore = useUserStore((state) => state.isLoading);

  // Get club from store (currentClub is set by fetchClubById)
  const club = currentClub;

  useEffect(() => {
    params.then((resolvedParams) => {
      setClubId(resolvedParams.id);
    });
  }, [params]);

  // Admin status is loaded from store via UserStoreInitializer
  const fetchClub = useCallback(async () => {
    if (!clubId) return;

    try {
      await fetchClubById(clubId);
      setError("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load club";
      if (errorMessage.includes("404") || errorMessage.includes("not found")) {
        setError("Club not found");
      } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
        router.push("/auth/sign-in");
      } else {
        setError(errorMessage);
      }
    }
  }, [clubId, fetchClubById, router]);

  useEffect(() => {
    if (isLoadingStore) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Check admin status and fetch data
    if (adminStatus?.isAdmin) {
      // User is an admin (root, organization, or club admin)
      if (clubId) {
        fetchClub();
      }
    } else if (!isLoadingStore) {
      // User is not an admin, redirect
      router.push("/auth/sign-in");
    }
  }, [isLoggedIn, isLoadingStore, adminStatus, router, clubId, fetchClub]);

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
      await fetchClubById(clubId);
      showToast("success", "Changes saved successfully");
      return updatedClub;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save changes";
      showToast("error", message);
      throw err;
    }
  }, [clubId, fetchClubById, showToast]);

  const handleDelete = async () => {
    if (!clubId) return;

    setSubmitting(true);
    try {
      await deleteClub(clubId);
      router.push("/admin/clubs");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to delete club");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!club) return;

    try {
      await handleSectionUpdate("header", {
        name: club.name,
        slug: club.slug,
        shortDescription: club.shortDescription,
        isPublic: !club.isPublic,
      });
    } catch {
      // Error already handled in handleSectionUpdate
    }
  };

  // Handler for opening edit modal
  const handleOpenDetailsEdit = () => {
    setIsEditingDetails(true);
  };

  // Stepper save handler for editing club details with images
  const handleStepperSave = async (data: {
    name: string;
    slug: string;
    description: string | null;
    location?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    logo?: File | null;
    heroImage?: File | null;
  }) => {
    if (!clubId) return;

    try {
      // Update club basic info and location
      await handleSectionUpdate("header", {
        name: data.name,
        slug: data.slug,
        shortDescription: data.description,
        location: data.location || club?.location || "",
        city: data.city || "",
        country: data.country || "",
        latitude: data.latitude,
        longitude: data.longitude,
      });

      // Upload images if new files were provided
      if (data.logo) {
        const logoFormData = new FormData();
        logoFormData.append("file", data.logo);
        logoFormData.append("type", "logo");

        const logoResponse = await fetch(`/api/images/clubs/${clubId}/upload`, {
          method: "POST",
          body: logoFormData,
        });

        if (!logoResponse.ok) {
          const errorData = await logoResponse.json();
          throw new Error(errorData.error || t("clubs.errors.imageUploadFailed"));
        }
      }

      if (data.heroImage) {
        const heroFormData = new FormData();
        heroFormData.append("file", data.heroImage);
        heroFormData.append("type", "heroImage");

        const heroResponse = await fetch(`/api/images/clubs/${clubId}/upload`, {
          method: "POST",
          body: heroFormData,
        });

        if (!heroResponse.ok) {
          const errorData = await heroResponse.json();
          throw new Error(errorData.error || t("clubs.errors.imageUploadFailed"));
        }
      }

      showToast("success", t("clubs.updateSuccess"));
      // Force refresh to get updated data including images
      await fetchClubById(clubId);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("clubs.errors.updateFailed");
      showToast("error", message);
      throw err; // Re-throw to let the stepper handle the error
    }
  };

  // Determine if user can delete clubs (only root admin)
  const canDelete = adminStatus?.adminType === "root_admin";

  // Loading skeleton
  if (loading || isLoadingStore) {
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
          <IMLink href="/admin/clubs">← Back to Clubs</IMLink>
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
  const mapsEmbedUrl = hasValidCoordinates
    ? getGoogleMapsEmbedUrl(club.latitude as number, club.longitude as number, process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
    : null;
  const hasMap = mapsEmbedUrl !== null;

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
        imageUrl={club.heroImage}
        logoUrl={club.logo}
        imageAlt={`${club.name} hero image`}
        logoAlt={`${club.name} logo`}
        isPublished={club.isPublic}
        onTogglePublish={handleTogglePublish}
        onEdit={handleOpenDetailsEdit}
      />

      {/* Main Content */}
      <div className="im-admin-club-content">
        {/* Actions Bar */}
        <div className="im-admin-club-actions-bar">
          <div className="im-admin-club-breadcrumb">
            {/* Breadcrumbs */}
            <Breadcrumbs
              items={[
                { label: t("breadcrumbs.clubs"), href: "/admin/clubs" },
                { label: club.name },
              ]}
              ariaLabel={t("breadcrumbs.navigation")}
            />
          </div>
          <div className="im-admin-club-actions">
            {canDelete && (
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(true)}
                className="im-admin-club-delete-btn"
              >
                Delete Club
              </Button>
            )}
          </div>
        </div>

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
            {/* Description Card with Edit */}
            <Card className="im-admin-club-info-card">
              <ClubHeaderView
                club={club}
                onUpdate={(payload) => handleSectionUpdate("header", payload)}
              />
            </Card>

            {/* Courts Summary with Edit */}
            <Card className="im-admin-club-info-card">
              <ClubCourtsQuickList club={club} />

              {/* Court type badges */}
              <div className="im-admin-club-courts-summary">
                {courtCounts.indoor > 0 && (
                  <span className="im-admin-club-badge im-admin-club-badge-indoor">
                    <span className="im-admin-club-court-type-count">{courtCounts.indoor}</span> Indoor
                  </span>
                )}
                {courtCounts.outdoor > 0 && (
                  <span className="im-admin-club-badge im-admin-club-badge-outdoor">
                    <span className="im-admin-club-court-type-count">{courtCounts.outdoor}</span> Outdoor
                  </span>
                )}
              </div>

              {/* Price range */}
              {priceRange && (
                <div className="im-admin-club-price-range">
                  <span className="im-admin-club-price-label">Price Range:</span>
                  <span className="im-admin-club-price-value">
                    {priceRange.min === priceRange.max
                      ? formatPrice(priceRange.min)
                      : `${formatPrice(priceRange.min)} - ${formatPrice(priceRange.max)}`}
                  </span>
                  <span className="im-admin-club-price-label">per hour</span>
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
            {hasMap && (
              <Card className="im-admin-club-info-card">
                <div className="im-admin-club-section-header">
                  <h2 className="im-admin-club-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6" />
                      <line x1="8" y1="2" x2="8" y2="18" />
                      <line x1="16" y1="6" x2="16" y2="22" />
                    </svg>
                    Location
                  </h2>
                </div>
                <div className="im-admin-club-map-container">
                  <iframe
                    title={`${club.name} location map`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapsEmbedUrl as string}
                  />
                </div>
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
              />
            </Card>

            {/* Business Hours Card with Edit */}
            <Card className="im-admin-club-info-card">
              <ClubHoursView
                club={club}
                onUpdate={(payload) => handleSectionUpdate("hours", payload)}
              />
            </Card>

            {/* Coaches Card with Edit */}
            <Card className="im-admin-club-info-card">
              <ClubCoachesView
                club={club}
                onUpdate={(payload) => handleSectionUpdate("coaches", payload)}
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

        {/* Club Admins Section */}
        <section className="im-admin-club-admins-section">
          <ClubAdminsSection
            clubId={club.id}
            onRefresh={fetchClub}
          />
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Club"
      >
        <p className="mb-4">
          Are you sure you want to delete &quot;{club.name}&quot;? This action
          cannot be undone and will also delete all associated courts, gallery
          images, and business hours.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={submitting}
            className="bg-red-500 hover:bg-red-600"
          >
            {submitting ? "Deleting..." : "Delete"}
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

      {/* Entity Edit Stepper Modal */}
      {club && (
        <EntityEditStepper
          isOpen={isEditingDetails}
          onClose={() => setIsEditingDetails(false)}
          entityData={{
            id: club.id,
            name: club.name,
            slug: club.slug || "",
            shortDescription: club.shortDescription,
            location: club.location,
            city: club.city,
            country: club.country,
            latitude: club.latitude,
            longitude: club.longitude,
            logo: club.logo,
            heroImage: club.heroImage,
          }}
          steps={[
            { id: 1, label: t("clubs.stepper.stepBasicInfo") },
            { id: 2, label: t("clubs.stepper.stepAddress") },
            { id: 3, label: t("clubs.stepper.stepLogo") },
            { id: 4, label: t("clubs.stepper.stepBanner") },
          ]}
          stepComponents={[BasicInfoStep, AddressStep, LogoStep, BannerStep]}
          translationNamespace="clubs.stepper"
          onSave={handleStepperSave}
        />
      )}
    </main>
  );
}
