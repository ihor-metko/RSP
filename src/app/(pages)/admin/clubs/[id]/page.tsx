"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, Modal, IMLink, Breadcrumbs, ImageCarousel } from "@/components/ui";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { ClubHeaderView } from "@/components/admin/club/ClubHeaderView";
import { ClubContactsView } from "@/components/admin/club/ClubContactsView";
import { ClubHoursView } from "@/components/admin/club/ClubHoursView";
import { ClubCourtsQuickList } from "@/components/admin/club/ClubCourtsQuickList";
import { ClubGalleryView } from "@/components/admin/club/ClubGalleryView";
import { ClubCoachesView } from "@/components/admin/club/ClubCoachesView";
import { WeeklyAvailabilityTimeline } from "@/components/WeeklyAvailabilityTimeline";
import { GalleryModal } from "@/components/GalleryModal";
import { isValidImageUrl, getSupabaseStorageUrl } from "@/utils/image";
import { formatPrice } from "@/utils/price";
import { parseTags, getPriceRange, getCourtCounts, getGoogleMapsEmbedUrl } from "@/utils/club";
import { Roles } from "@/constants/roles";
import type { ClubDetail } from "@/types/club";
import "./page.css";

export default function AdminClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations();
  const [clubId, setClubId] = useState<string | null>(null);
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    params.then((resolvedParams) => {
      setClubId(resolvedParams.id);
    });
  }, [params]);

  const fetchClub = useCallback(async () => {
    if (!clubId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clubs/${clubId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Club not found");
          return;
        }
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch club");
      }
      const data = await response.json();
      setClub(data);
      setError("");
    } catch {
      setError("Failed to load club");
    } finally {
      setLoading(false);
    }
  }, [clubId, router]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== Roles.SuperAdmin) {
      router.push("/auth/sign-in");
      return;
    }

    if (clubId) {
      fetchClub();
    }
  }, [session, status, router, clubId, fetchClub]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleSectionUpdate = useCallback(async (section: string, payload: Record<string, unknown>) => {
    if (!clubId) return;

    try {
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
      setClub(updatedClub);
      showToast("success", "Changes saved successfully");
      return updatedClub;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save changes";
      showToast("error", message);
      throw err;
    }
  }, [clubId, showToast]);

  const handleDelete = async () => {
    if (!clubId) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete club");
      }

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

  // Loading skeleton
  if (status === "loading" || loading) {
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
  const heroImageUrl = getSupabaseStorageUrl(club.heroImage);
  const logoUrl = getSupabaseStorageUrl(club.logo);
  const hasHeroImage = isValidImageUrl(heroImageUrl);
  const hasLogo = isValidImageUrl(logoUrl);
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
      const imageUrl = getSupabaseStorageUrl(image.imageUrl);
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

      {/* Hero Section - matching player page design */}
      <section className="im-admin-club-hero">
        {hasHeroImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl as string}
              alt={`${club.name} hero image`}
              className="im-admin-club-hero-image"
            />
            <div className="im-admin-club-hero-overlay" />
          </>
        ) : (
          <div className="im-admin-club-hero-placeholder">
            <span className="im-admin-club-hero-placeholder-text">
              {club.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="im-admin-club-hero-content">
          {hasLogo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoUrl as string}
              alt={`${club.name} logo`}
              className="im-admin-club-hero-logo"
            />
          )}
          <h1 className="im-admin-club-hero-name">{club.name}</h1>
          {club.shortDescription && (
            <p className="im-admin-club-hero-description">{club.shortDescription}</p>
          )}
          <p className="im-admin-club-hero-location">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {locationDisplay}
          </p>
          {/* Status badge */}
          <span
            className={`im-admin-club-status-badge ${club.isPublic
              ? "im-admin-club-status-badge--published"
              : "im-admin-club-status-badge--unpublished"
              }`}
          >
            {club.isPublic ? "Published" : "Unpublished"}
          </span>
        </div>
        {/* Admin controls on hero */}
        <div className="im-admin-club-hero-controls">
          <NotificationBell />
        </div>
      </section>

      {/* Main Content */}
      <div className="im-admin-club-content">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: t("breadcrumbs.home"), href: "/" },
            { label: t("breadcrumbs.admin"), href: "/admin/clubs" },
            { label: t("breadcrumbs.clubs"), href: "/admin/clubs" },
            { label: club.name },
          ]}
          className="mb-6"
          ariaLabel={t("breadcrumbs.navigation")}
        />

        {/* Actions Bar */}
        <div className="im-admin-club-actions-bar">
          <div className="im-admin-club-breadcrumb">
            <IMLink href="/admin/clubs" className="im-admin-club-breadcrumb-link">
              ← Back to Clubs
            </IMLink>
          </div>
          <div className="im-admin-club-actions">
            <Button
              variant="outline"
              onClick={handleTogglePublish}
            >
              {club.isPublic ? "Unpublish" : "Publish"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(true)}
              className="im-admin-club-delete-btn"
            >
              Delete Club
            </Button>
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
    </main>
  );
}
