"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { BookingModal } from "@/components/booking/BookingModal";
import { QuickBookingWizard } from "@/components/QuickBookingWizard";
import { RequestTrainingModal } from "../../../../../../archived_features/components/training/RequestTrainingModal";
import { CourtCard } from "@/components/CourtCard";
import { CourtSlotsToday } from "@/components/CourtSlotsToday";
import { WeeklyAvailabilityTimeline } from "@/components/WeeklyAvailabilityTimeline";
import { CourtAvailabilityModal } from "@/components/CourtAvailabilityModal";
import { AuthPromptModal } from "@/components/AuthPromptModal";
import { GalleryModal } from "@/components/GalleryModal";
import { Button, IMLink, Breadcrumbs } from "@/components/ui";
import { isValidImageUrl, getSupabaseStorageUrl } from "@/utils/image";
import { formatPrice } from "@/utils/price";
import { parseTags, getPriceRange, getCourtCounts } from "@/utils/club";
import type { Court, AvailabilitySlot, AvailabilityResponse, CourtAvailabilityStatus } from "@/types/court";
import "@/components/ClubDetailPage.css";

// Lazy load the ClubMap component for performance optimization
const ClubMap = dynamic(() => import("@/components/ClubMap").then((mod) => mod.ClubMap), {
  ssr: false,
  loading: () => <div className="rsp-club-map-placeholder"><span className="rsp-club-map-placeholder-text">Loading map...</span></div>,
});

interface Coach {
  id: string;
  name: string;
}

interface BusinessHours {
  id: string;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

interface GalleryImage {
  id: string;
  imageUrl: string;
  altText: string | null;
}

interface ClubWithDetails {
  id: string;
  name: string;
  slug?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  location: string;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  socialLinks?: string | null;
  contactInfo?: string | null;
  openingHours?: string | null;
  logo?: string | null;
  heroImage?: string | null;
  defaultCurrency?: string | null;
  timezone?: string | null;
  tags?: string | null;
  courts: Court[];
  coaches: Coach[];
  businessHours?: BusinessHours[];
  gallery?: GalleryImage[];
}

interface Slot {
  startTime: string;
  endTime: string;
}

// Day names for business hours
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper to get today's date in YYYY-MM-DD format
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export default function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const [club, setClub] = useState<ClubWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [courtAvailability, setCourtAvailability] = useState<Record<string, AvailabilitySlot[]>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [isRequestTrainingOpen, setIsRequestTrainingOpen] = useState(false);
  const [preselectedSlot, setPreselectedSlot] = useState<Slot | null>(null);
  const [isCourtAvailabilityOpen, setIsCourtAvailabilityOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    date: string;
    hour: number;
    courts: CourtAvailabilityStatus[];
  } | null>(null);
  const [timelineKey, setTimelineKey] = useState(0);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Get user ID from session, or use a placeholder for unauthenticated users
  const userId = session?.user?.id || "guest";
  const isAuthenticated = authStatus === "authenticated" && session?.user;

  // Fetch availability for all courts
  const fetchAvailability = useCallback(async (courts: Court[]) => {
    const today = getTodayDateString();
    setAvailabilityLoading(true);

    try {
      const results = await Promise.all(
        courts.map(async (court) => {
          try {
            const response = await fetch(`/api/courts/${court.id}/availability?date=${today}`);
            if (response.ok) {
              const data: AvailabilityResponse = await response.json();
              return { courtId: court.id, slots: data.slots };
            }
          } catch {
            // Ignore individual court availability errors
          }
          return { courtId: court.id, slots: [] };
        })
      );

      const availabilityMap: Record<string, AvailabilitySlot[]> = {};
      results.forEach(({ courtId, slots }) => {
        availabilityMap[courtId] = slots;
      });
      setCourtAvailability(availabilityMap);
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchClubData() {
      try {
        const resolvedParams = await params;
        const response = await fetch(`/api/clubs/${resolvedParams.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError(t("clubs.clubNotFound"));
          } else {
            setError(t("clubs.failedToLoadClub"));
          }
          return;
        }
        const data = await response.json();
        setClub(data);
        // Fetch availability for all courts
        if (data.courts && data.courts.length > 0) {
          fetchAvailability(data.courts);
        } else {
          setAvailabilityLoading(false);
        }
      } catch {
        setError(t("clubs.failedToLoadClub"));
      } finally {
        setIsLoading(false);
      }
    }
    fetchClubData();
  }, [params, fetchAvailability, t]);

  const handleBookClick = (courtId: string) => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }
    setSelectedCourtId(courtId);
    setIsModalOpen(true);
  };

  const handleViewSchedule = (courtId: string) => {
    router.push(`/courts/${courtId}`);
  };

  const handleBookingSuccess = () => {
    if (club?.courts) {
      fetchAvailability(club.courts);
    }
    setPreselectedSlot(null);
    setTimelineKey((prev) => prev + 1);
  };

  const getAvailableSlotsForCourt = (courtId: string): Slot[] => {
    const slots = courtAvailability[courtId] || [];
    return slots
      .filter((slot) => slot.status === "available")
      .map((slot) => ({
        startTime: slot.start,
        endTime: slot.end,
      }));
  };

  const handleQuickBookingClick = () => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }
    setIsQuickBookingOpen(true);
  };

  const handleQuickBookingComplete = () => {
    // Refresh availability data after successful booking
    if (club?.courts) {
      fetchAvailability(club.courts);
    }
    setTimelineKey((prev) => prev + 1);
  };

  const handleQuickBookingClose = () => {
    setIsQuickBookingOpen(false);
  };

  const handleRequestTrainingClick = () => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }
    setIsRequestTrainingOpen(true);
  };

  const handleRequestTrainingClose = () => {
    setIsRequestTrainingOpen(false);
  };

  const handleCloseBookingModal = () => {
    setIsModalOpen(false);
    setSelectedCourtId(null);
    setPreselectedSlot(null);
  };

  const handleTimelineSlotClick = (
    date: string,
    hour: number,
    courts: CourtAvailabilityStatus[]
  ) => {
    setSelectedTimeSlot({ date, hour, courts });
    setIsCourtAvailabilityOpen(true);
  };

  const handleCloseCourtAvailability = () => {
    setIsCourtAvailabilityOpen(false);
    setSelectedTimeSlot(null);
  };

  const handleSelectCourtFromTimeline = (
    courtId: string,
    date: string,
    startTime: string,
    endTime: string
  ) => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }
    const startDateTime = `${date}T${startTime}:00.000Z`;
    const endDateTime = `${date}T${endTime}:00.000Z`;
    setPreselectedSlot({ startTime: startDateTime, endTime: endDateTime });
    setSelectedCourtId(courtId);
    setIsCourtAvailabilityOpen(false);
    setSelectedTimeSlot(null);
    setIsModalOpen(true);
  };

  const getSlotsForBookingModal = (courtId: string): Slot[] => {
    if (preselectedSlot) {
      return [preselectedSlot];
    }
    return getAvailableSlotsForCourt(courtId);
  };

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

  // Loading skeleton
  if (isLoading) {
    return (
      <main className="rsp-club-detail-page">
        <div className="rsp-club-skeleton-hero" />
        <div className="rsp-club-skeleton-content">
          <div className="rsp-club-skeleton-title" />
          <div className="rsp-club-skeleton-text" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !club) {
    return (
      <main className="rsp-club-detail-page p-8">
        <div className="tm-error-banner text-center p-6 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl">
          {error || t("clubs.clubNotFound")}
        </div>
        <div className="mt-4 text-center">
          <IMLink href="/clubs">{t("common.backToClubs")}</IMLink>
        </div>
      </main>
    );
  }

  // Prepare derived data
  const heroImageUrl = getSupabaseStorageUrl(club.heroImage);
  const logoUrl = getSupabaseStorageUrl(club.logo);
  const hasHeroImage = isValidImageUrl(heroImageUrl);
  const hasLogo = isValidImageUrl(logoUrl);
  const clubTags = parseTags(club.tags);
  const priceRange = getPriceRange(club.courts);
  const courtCounts = getCourtCounts(club.courts);
  const hasValidCoordinates = club.latitude !== null && club.longitude !== null && club.latitude !== undefined && club.longitude !== undefined;

  // Format location display
  const locationDisplay = [club.city, club.country].filter(Boolean).join(", ") || club.location;

  // Prepare gallery images for modal
  const galleryImages = (club.gallery || [])
    .map((image) => {
      const imageUrl = getSupabaseStorageUrl(image.imageUrl);
      return isValidImageUrl(imageUrl)
        ? { url: imageUrl as string, alt: image.altText || `${club.name} gallery image` }
        : null;
    })
    .filter((img): img is { url: string; alt: string } => img !== null);

  return (
    <main className="rsp-club-detail-page">
      {/* Hero Section with Club Name & Short Description */}
      <section className="rsp-club-hero">
        {hasHeroImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl as string}
              alt={`${club.name} hero image`}
              className="rsp-club-hero-image"
            />
            <div className="rsp-club-hero-overlay" />
          </>
        ) : (
          <div className="rsp-club-hero-placeholder">
            <span className="rsp-club-hero-placeholder-text">
              {club.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="rsp-club-hero-content">
          {hasLogo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoUrl as string}
              alt={`${club.name} logo`}
              className="rsp-club-hero-logo"
            />
          )}
          <h1 className="rsp-club-hero-name">{club.name}</h1>
          {club.shortDescription && (
            <p className="rsp-club-hero-short-desc">{club.shortDescription}</p>
          )}
          <p className="rsp-club-hero-location">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {locationDisplay}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="rsp-club-content">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: t("breadcrumbs.home"), href: "/" },
            { label: t("breadcrumbs.clubs"), href: "/clubs" },
            { label: club.name },
          ]}
          className="mb-6"
          ariaLabel={t("breadcrumbs.navigation")}
        />

        {/* Admin Link */}
        {session?.user?.role === "admin" && (
          <div className="mb-4 text-right">
            <IMLink href={`/admin/clubs/${club.id}/courts`}>{t("clubs.adminCourts")}</IMLink>
          </div>
        )}

        {/* Auth CTA for unauthenticated users */}
        {!isAuthenticated && (
          <div className="rsp-club-auth-cta">
            <p className="rsp-club-auth-cta-text">
              <IMLink href={`/auth/sign-in?redirectTo=${encodeURIComponent(pathname)}`} className="rsp-club-auth-cta-link">
                {t("auth.signInToBook")}
              </IMLink>
            </p>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="rsp-club-actions-bar">
          <Button onClick={handleQuickBookingClick} className="rsp-club-action-button" aria-label={t("clubs.quickBooking")}>
            {t("clubs.quickBooking")}
          </Button>

          {club.coaches.length > 0 && (
            <Button
              onClick={handleRequestTrainingClick}
              variant="outline"
              className="rsp-club-action-button"
              aria-label={t("clubs.requestTraining")}
            >
              {t("clubs.requestTraining")}
            </Button>
          )}
        </div>

        {/* Weekly Availability Timeline */}
        {club.courts.length > 0 && (
          <section className="rsp-club-timeline-section mt-8">
            <WeeklyAvailabilityTimeline
              key={timelineKey}
              clubId={club.id}
              onSlotClick={handleTimelineSlotClick}
            />
          </section>
        )}

        {/* Full Club Description Section */}
        {club.longDescription && (
          <div className="rsp-club-full-description">
            <div className="rsp-club-full-description-card">
              <h2 className="rsp-club-full-description-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10,9 9,9 8,9" />
                </svg>
                {t("clubDetail.aboutClub")}
              </h2>
              <p className="rsp-club-full-description-text">{club.longDescription}</p>
            </div>
          </div>
        )}

        {/* Info Grid */}
        <div className="rsp-club-info-grid">
          {/* Left Column - Details */}
          <div className="space-y-6">
            {/* Courts Summary Card */}
            <div className="rsp-club-info-card">
              <h2 className="rsp-club-info-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                </svg>
                {t("clubDetail.courts")}
              </h2>

              {/* Court type badges */}
              <div className="rsp-club-courts-summary">
                {courtCounts.indoor > 0 && (
                  <span className="rsp-badge rsp-badge-indoor">
                    <span className="rsp-club-court-type-count">{courtCounts.indoor}</span> {t("common.indoor")}
                  </span>
                )}
                {courtCounts.outdoor > 0 && (
                  <span className="rsp-badge rsp-badge-outdoor">
                    <span className="rsp-club-court-type-count">{courtCounts.outdoor}</span> {t("common.outdoor")}
                  </span>
                )}
              </div>

              {/* Price range */}
              {priceRange && (
                <div className="rsp-club-price-range">
                  <span className="rsp-club-price-label">{t("clubDetail.priceRange")}:</span>
                  <span className="rsp-club-price-value">
                    {priceRange.min === priceRange.max
                      ? formatPrice(priceRange.min)
                      : `${formatPrice(priceRange.min)} - ${formatPrice(priceRange.max)}`}
                  </span>
                  <span className="rsp-club-price-label">{t("common.perHour")}</span>
                </div>
              )}

              {/* Tags */}
              {clubTags.length > 0 && (
                <div className="rsp-club-tags-list mt-4">
                  {clubTags.map((tag, index) => (
                    <span key={index} className="rsp-club-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Map Section */}
            {hasValidCoordinates && (
              <div className="rsp-club-info-card">
                <h2 className="rsp-club-info-card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6" />
                    <line x1="8" y1="2" x2="8" y2="18" />
                    <line x1="16" y1="6" x2="16" y2="22" />
                  </svg>
                  {t("clubDetail.location")}
                </h2>
                <ClubMap
                  latitude={club.latitude as number}
                  longitude={club.longitude as number}
                  clubName={club.name}
                />
                <p className="mt-3 text-sm opacity-70">{club.location}</p>
              </div>
            )}
          </div>

          {/* Right Column - Contact & Hours */}
          <div className="space-y-6">
            {/* Contact Info Card */}
            <div className="rsp-club-info-card">
              <h2 className="rsp-club-info-card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {t("clubDetail.contact")}
              </h2>
              <div className="rsp-club-contact-list">
                {club.phone && (
                  <div className="rsp-club-contact-item">
                    <svg className="rsp-club-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <div>
                      <span className="rsp-club-contact-label">{t("clubDetail.phone")}</span>
                      <a href={`tel:${club.phone}`} className="rsp-club-contact-value rsp-club-contact-link">{club.phone}</a>
                    </div>
                  </div>
                )}
                {club.email && (
                  <div className="rsp-club-contact-item">
                    <svg className="rsp-club-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <div>
                      <span className="rsp-club-contact-label">{t("clubDetail.email")}</span>
                      <a href={`mailto:${club.email}`} className="rsp-club-contact-value rsp-club-contact-link">{club.email}</a>
                    </div>
                  </div>
                )}
                {club.website && (
                  <div className="rsp-club-contact-item">
                    <svg className="rsp-club-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <div>
                      <span className="rsp-club-contact-label">{t("clubDetail.website")}</span>
                      <a
                        href={club.website.startsWith("http") ? club.website : `https://${club.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rsp-club-contact-value rsp-club-contact-link"
                      >
                        {club.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  </div>
                )}
                {club.location && (
                  <div className="rsp-club-contact-item">
                    <svg className="rsp-club-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <div>
                      <span className="rsp-club-contact-label">{t("clubDetail.address")}</span>
                      <span className="rsp-club-contact-value">{club.location}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Business Hours Card */}
            {club.businessHours && club.businessHours.length > 0 && (
              <div className="rsp-club-info-card">
                <h2 className="rsp-club-info-card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  {t("clubDetail.hours")}
                </h2>
                <div className="rsp-club-hours-list">
                  {club.businessHours.map((hours) => (
                    <div key={hours.id} className="rsp-club-hours-row">
                      <span className="rsp-club-hours-day">{DAY_NAMES[hours.dayOfWeek]}</span>
                      {hours.isClosed ? (
                        <span className="rsp-club-hours-closed">{t("clubDetail.closed")}</span>
                      ) : (
                        <span className="rsp-club-hours-time">
                          {hours.openTime} - {hours.closeTime}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Courts Grid Section */}
        <section className="rsp-club-courts-section">
          <div className="rsp-club-courts-header">
            <h2 className="rsp-club-courts-title">{t("clubDetail.availableCourts")}</h2>
          </div>
          <div className="rsp-club-courts-grid">
            {club.courts.length === 0 ? (
              <div className="rsp-club-empty-courts">
                <p className="rsp-club-empty-courts-text">{t("clubs.noCourts")}</p>
              </div>
            ) : (
              club.courts.map((court) => (
                <CourtCard
                  key={court.id}
                  court={court}
                  onBook={handleBookClick}
                  onViewSchedule={handleViewSchedule}
                  isBookDisabled={!isAuthenticated}
                  bookDisabledTooltip={t("auth.signInToBookTooltip")}
                  todaySlots={
                    <CourtSlotsToday
                      slots={courtAvailability[court.id] || []}
                      isLoading={availabilityLoading}
                      maxSlots={6}
                    />
                  }
                />
              ))
            )}
          </div>
        </section>

        {/* Gallery Section with Fullscreen Modal */}
        {galleryImages.length > 0 && (
          <section className="rsp-club-gallery-section">
            <h2 className="rsp-club-gallery-title">{t("clubDetail.gallery")}</h2>
            <div className="rsp-club-gallery-grid">
              {galleryImages.map((image, index) => (
                <button
                  key={index}
                  className="rsp-club-gallery-item"
                  onClick={() => handleGalleryOpen(index)}
                  aria-label={t("clubDetail.viewImage")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="rsp-club-gallery-image"
                  />
                  <span className="rsp-club-gallery-zoom-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Back Link */}
        <div className="rsp-club-back-link">
          <IMLink href="/clubs">{t("common.backToClubs")}</IMLink>
        </div>
      </div>

      {/* Modals */}
      {isAuthenticated && selectedCourtId && (
        <BookingModal
          courtId={selectedCourtId}
          availableSlots={getSlotsForBookingModal(selectedCourtId)}
          coachList={club.coaches}
          isOpen={isModalOpen}
          onClose={handleCloseBookingModal}
          userId={userId}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {isAuthenticated && (
        <QuickBookingWizard
          clubId={club.id}
          isOpen={isQuickBookingOpen}
          onClose={handleQuickBookingClose}
          onBookingComplete={handleQuickBookingComplete}
        />
      )}

      {isAuthenticated && (
        <RequestTrainingModal
          clubId={club.id}
          trainers={club.coaches}
          playerId={userId}
          isOpen={isRequestTrainingOpen}
          onClose={handleRequestTrainingClose}
          onSuccess={handleBookingSuccess}
        />
      )}

      {selectedTimeSlot && (
        <CourtAvailabilityModal
          isOpen={isCourtAvailabilityOpen}
          onClose={handleCloseCourtAvailability}
          date={selectedTimeSlot.date}
          hour={selectedTimeSlot.hour}
          courts={selectedTimeSlot.courts}
          onSelectCourt={handleSelectCourtFromTimeline}
        />
      )}

      <AuthPromptModal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
      />

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
