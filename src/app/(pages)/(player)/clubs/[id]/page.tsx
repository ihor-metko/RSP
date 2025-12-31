"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookingModal } from "@/components/booking/BookingModal";
import { PlayerQuickBooking } from "@/components/PlayerQuickBooking";
import { CourtCard } from "@/components/CourtCard";
import { WeeklyAvailabilityTimeline } from "@/components/WeeklyAvailabilityTimeline";
import { CourtAvailabilityModal } from "@/components/CourtAvailabilityModal";
import { CourtScheduleModal } from "@/components/CourtScheduleModal";
import { AuthPromptModal } from "@/components/AuthPromptModal";
import { GalleryModal } from "@/components/GalleryModal";
import { Button, IMLink, Breadcrumbs, ImageCarousel, CourtCarousel, EntityBanner } from "@/components/ui";
import { usePlayerClubStore } from "@/stores/usePlayerClubStore";
import { useUserStore } from "@/stores/useUserStore";
import { useActiveClub } from "@/contexts/ClubContext";
import { isValidImageUrl, getImageUrl } from "@/utils/image";
import { parseClubMetadata } from "@/types/club";
import type { Court, AvailabilitySlot, AvailabilityResponse, CourtAvailabilityStatus } from "@/types/court";
import "@/components/ClubDetailPage.css";
import "@/components/EntityPageLayout.css";

// Create a loading component wrapper
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

interface BusinessHours {
  id: string;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
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
  logoData?: { url: string; altText?: string; thumbnailUrl?: string } | null;
  bannerData?: { url: string; altText?: string; description?: string; position?: string } | null;
  metadata?: string | null;
  defaultCurrency?: string | null;
  timezone?: string | null;
  tags?: string | null;
  businessHours?: BusinessHours[];
}

interface Slot {
  startTime: string;
  endTime: string;
}

// Helper to get today's date in YYYY-MM-DD format
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export default function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const pathname = usePathname();
  const t = useTranslations();
  const { setActiveClubId } = useActiveClub();

  // Day names for business hours
  const DAY_NAMES = [
    t("common.sunday"),
    t("common.monday"),
    t("common.tuesday"),
    t("common.wednesday"),
    t("common.thursday"),
    t("common.friday"),
    t("common.saturday")
  ];

  // Use store for auth
  const user = useUserStore((state) => state.user);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  // Use centralized player club store
  const currentClub = usePlayerClubStore((state) => state.currentClub);
  const ensureClubById = usePlayerClubStore((state) => state.ensureClubById);
  const ensureCourtsByClubId = usePlayerClubStore((state) => state.ensureCourtsByClubId);
  const ensureGalleryByClubId = usePlayerClubStore((state) => state.ensureGalleryByClubId);
  const getCourtsForClub = usePlayerClubStore((state) => state.getCourtsForClub);
  const getGalleryForClub = usePlayerClubStore((state) => state.getGalleryForClub);
  const loadingClubs = usePlayerClubStore((state) => state.loadingClubs);
  const loadingCourts = usePlayerClubStore((state) => state.loadingCourts);
  const clubsError = usePlayerClubStore((state) => state.clubsError);

  // Map currentClub to ClubWithDetails (they should be compatible)
  const club = currentClub as ClubWithDetails | null;
  
  // Get courts and gallery from store
  const courts = club ? getCourtsForClub(club.id) : [];
  const gallery = club ? getGalleryForClub(club.id) : [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [courtAvailability, setCourtAvailability] = useState<Record<string, AvailabilitySlot[]>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
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
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleModalCourt, setScheduleModalCourt] = useState<Court | null>(null);

  // Get user ID from session, or use a placeholder for unauthenticated users
  const userId = user?.id || "guest";
  const isAuthenticated = isLoggedIn && user;

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
        // Set active club for socket room targeting
        setActiveClubId(resolvedParams.id);

        await ensureClubById(resolvedParams.id);
        
        // Fetch courts and gallery separately after club is loaded
        await Promise.all([
          ensureCourtsByClubId(resolvedParams.id),
          ensureGalleryByClubId(resolvedParams.id),
        ]);
      } catch (err) {
        console.error("Failed to fetch club:", err);
      }
    }
    fetchClubData();
  }, [params, ensureClubById, ensureCourtsByClubId, ensureGalleryByClubId, setActiveClubId]);

  // Fetch availability when courts are loaded
  useEffect(() => {
    if (courts && courts.length > 0) {
      fetchAvailability(courts);
    } else if (club && !loadingCourts) {
      setAvailabilityLoading(false);
    }
  }, [courts, club, loadingCourts, fetchAvailability]);

  const handleBookClick = (courtId: string) => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }
    setSelectedCourtId(courtId);
    setIsModalOpen(true);
  };

  const handleViewSchedule = (courtId: string) => {
    // Open schedule modal instead of navigating
    const court = courts.find(c => c.id === courtId);
    if (court) {
      setScheduleModalCourt(court);
      setIsScheduleModalOpen(true);
    }
  };

  const handleScheduleModalClose = () => {
    setIsScheduleModalOpen(false);
    setScheduleModalCourt(null);
  };

  const handleScheduleModalBook = (courtId: string, slot: AvailabilitySlot) => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }
    // Close schedule modal and open booking modal with the selected slot
    setIsScheduleModalOpen(false);
    setPreselectedSlot({ startTime: slot.start, endTime: slot.end });
    setSelectedCourtId(courtId);
    setIsModalOpen(true);
  };

  const handleCardClick = (courtId: string) => {
    // Open schedule modal when card is clicked
    handleViewSchedule(courtId);
  };

  const handleBookingSuccess = () => {
    if (courts && courts.length > 0) {
      fetchAvailability(courts);
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
    if (courts && courts.length > 0) {
      fetchAvailability(courts);
    }
    setTimelineKey((prev) => prev + 1);
  };

  const handleQuickBookingClose = () => {
    setIsQuickBookingOpen(false);
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
  if (loadingClubs && !club) {
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
  if (clubsError || (!loadingClubs && !club)) {
    const errorMessage = clubsError 
      ? (clubsError.includes("404") || clubsError.includes("not found") 
          ? t("clubs.clubNotFound") 
          : clubsError)
      : t("clubs.clubNotFound");
    
    return (
      <main className="rsp-club-detail-page p-8">
        <div className="tm-error-banner text-center p-6 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl">
          {errorMessage}
        </div>
        <div className="mt-4 text-center">
          <IMLink href="/clubs">{t("common.backToClubs")}</IMLink>
        </div>
      </main>
    );
  }

  if (!club) {
    return null;
  }

  // Prepare derived data
  const hasValidCoordinates = club.latitude !== null && club.longitude !== null && club.latitude !== undefined && club.longitude !== undefined;

  // Format location display
  const locationDisplay = [club.city, club.country].filter(Boolean).join(", ") || club.location;

  // Parse club metadata for logo and banner settings
  const clubMetadata = parseClubMetadata(club.metadata);

  // Prepare gallery images for modal
  const galleryImages = (gallery || [])
    .map((image) => {
      const imageUrl = getImageUrl(image.imageUrl);
      return isValidImageUrl(imageUrl)
        ? { url: imageUrl as string, alt: image.altText || `${club.name} gallery image` }
        : null;
    })
    .filter((img): img is { url: string; alt: string } => img !== null);

  return (
    <main className="rsp-club-detail-page">
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
        hideAdminFeatures={true}
      />

      {/* Main Content */}
      <div className="entity-page-content">
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
        {user?.isRoot && (
          <div className="mb-4 text-right">
            <IMLink href={`/admin/courts?clubId=${club.id}`}>{t("clubs.adminCourts")}</IMLink>
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
        </div>

        {/* Weekly Availability Timeline */}
        {courts.length > 0 && (
          <section className="rsp-club-timeline-section mt-8">
            <WeeklyAvailabilityTimeline
              key={timelineKey}
              clubId={club.id}
              onSlotClick={handleTimelineSlotClick}
            />
          </section>
        )}

        {/* Description & Gallery Section - Left of Contacts & Hours */}
        <section className="im-club-description-gallery">
          <div className="im-club-description-gallery-grid">
            {/* Left Column - Description & Gallery */}
            <div className="im-club-description-gallery-left">
              {/* Description Card */}
              {club.longDescription && (
                <div className="im-club-description-card">
                  <h2 className="im-club-description-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10,9 9,9 8,9" />
                    </svg>
                    {t("clubDetail.aboutClub")}
                  </h2>
                  <p className="im-club-description-text">{club.longDescription}</p>
                </div>
              )}

              {/* Gallery Card */}
              {galleryImages.length > 0 && (
                <div className="im-club-gallery-card" data-testid="club-gallery-block">
                  <div className="im-club-gallery-card-header">
                    <h2 className="im-club-gallery-card-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21,15 16,10 5,21" />
                      </svg>
                      {t("clubDetail.gallery")}
                    </h2>
                  </div>
                  <div className="im-club-gallery-card-content">
                    <ImageCarousel
                      images={galleryImages}
                      onImageClick={handleGalleryOpen}
                      showIndicators={true}
                      loop={true}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Contact & Hours */}
            <div className="im-club-contacts-column">
              {/* Contact Info Card */}
              <div className="im-club-info-card">
                <h2 className="im-club-info-card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {t("clubDetail.contact")}
                </h2>
                <div className="im-club-contact-list">
                  {club.phone && (
                    <div className="im-club-contact-item">
                      <svg className="im-club-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <div>
                        <span className="im-club-contact-label">{t("clubDetail.phone")}</span>
                        <a href={`tel:${club.phone}`} className="im-club-contact-value im-club-contact-link">{club.phone}</a>
                      </div>
                    </div>
                  )}
                  {club.email && (
                    <div className="im-club-contact-item">
                      <svg className="im-club-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      <div>
                        <span className="im-club-contact-label">{t("clubDetail.email")}</span>
                        <a href={`mailto:${club.email}`} className="im-club-contact-value im-club-contact-link">{club.email}</a>
                      </div>
                    </div>
                  )}
                  {club.website && (
                    <div className="im-club-contact-item">
                      <svg className="im-club-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <div>
                        <span className="im-club-contact-label">{t("clubDetail.website")}</span>
                        <a
                          href={club.website.startsWith("http") ? club.website : `https://${club.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="im-club-contact-value im-club-contact-link"
                        >
                          {club.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    </div>
                  )}
                  {club.location && (
                    <div className="im-club-contact-item">
                      <svg className="im-club-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <div>
                        <span className="im-club-contact-label">{t("clubDetail.address")}</span>
                        <span className="im-club-contact-value">{club.location}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Hours Card */}
              {club.businessHours && club.businessHours.length > 0 && (
                <div className="im-club-info-card">
                  <h2 className="im-club-info-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                    {t("clubDetail.hours")}
                  </h2>
                  <div className="im-club-hours-list">
                    {club.businessHours.map((hours) => (
                      <div key={hours.id} className="im-club-hours-row">
                        <span className="im-club-hours-day">{DAY_NAMES[hours.dayOfWeek]}</span>
                        {hours.isClosed ? (
                          <span className="im-club-hours-closed">{t("clubDetail.closed")}</span>
                        ) : (
                          <span className="im-club-hours-time">
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
        </section>

        {/* Map Section */}
        {hasValidCoordinates && (
          <div className="rsp-club-info-card mb-8">
            <h2 className="rsp-club-info-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
              {t("clubDetail.location")}
            </h2>
            {process.env.NODE_ENV === "production" ? (
              <Suspense fallback={<MapLoadingPlaceholder message={t("common.loadingMap")} />}>
                <ClubMap
                  latitude={club.latitude as number}
                  longitude={club.longitude as number}
                  clubName={club.name}
                />
              </Suspense>
            ) : (
              <div>{t("common.mapHiddenInDev")}</div>
            )}
            <p className="mt-3 text-sm opacity-70">{club.location}</p>
          </div>
        )}

        {/* Courts Carousel Section */}
        <section className="rsp-club-courts-section">
          <div className="rsp-club-courts-header">
            <h2 className="rsp-club-courts-title">{t("clubDetail.availableCourts")}</h2>
          </div>
          {loadingCourts ? (
            <div className="rsp-club-loading-courts">
              <p className="rsp-club-loading-text">{t("common.loading")}</p>
            </div>
          ) : courts.length === 0 ? (
            <div className="rsp-club-empty-courts">
              <p className="rsp-club-empty-courts-text">{t("clubs.noCourts")}</p>
            </div>
          ) : (
            <div className="im-court-carousel-section">
              <CourtCarousel
                items={courts}
                itemKeyExtractor={(court) => court.id}
                mobileVisible={1}
                tabletVisible={2}
                desktopVisible={3}
                showIndicators={true}
                showNavigation={true}
                lazyLoad={true}
                gap={16}
                renderItem={(court) => (
                  <CourtCard
                    key={court.id}
                    court={court}
                    onBook={handleBookClick}
                    onViewSchedule={handleViewSchedule}
                    onCardClick={handleCardClick}
                    isBookDisabled={!isAuthenticated}
                    bookDisabledTooltip={t("auth.signInToBookTooltip")}
                    availabilitySlots={courtAvailability[court.id] || []}
                    isLoadingAvailability={availabilityLoading}
                    maxVisibleSlots={6}
                    showLegend={false}
                    showAvailabilitySummary={true}
                    showDetailedAvailability={false}
                  />
                )}
              />
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      {isAuthenticated && selectedCourtId && (
        <BookingModal
          courtId={selectedCourtId}
          availableSlots={getSlotsForBookingModal(selectedCourtId)}
          coachList={[]} // Coaches removed per requirements - trainers should be fetched separately if needed
          isOpen={isModalOpen}
          onClose={handleCloseBookingModal}
          userId={userId}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {isAuthenticated && (
        <PlayerQuickBooking
          preselectedClubId={club.id}
          isOpen={isQuickBookingOpen}
          onClose={handleQuickBookingClose}
          onBookingComplete={handleQuickBookingComplete}
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

      {/* Court Schedule Modal */}
      {scheduleModalCourt && (
        <CourtScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={handleScheduleModalClose}
          courtId={scheduleModalCourt.id}
          courtName={scheduleModalCourt.name}
          onBook={handleScheduleModalBook}
        />
      )}

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
