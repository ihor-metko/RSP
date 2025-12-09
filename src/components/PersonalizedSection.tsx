"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, Button, Select, Modal } from "@/components/ui";
import { useClubStore } from "@/stores/useClubStore";
import { useCurrentLocale } from "@/hooks/useCurrentLocale";
import { formatPrice } from "@/utils/price";
import "./PersonalizedSection.css";

interface UpcomingBooking {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  priceCents: number;
  court: {
    id: string;
    name: string;
  };
  club: {
    id: string;
    name: string;
  } | null;
  coach: {
    id: string;
    name: string | null;
  } | null;
}

interface HomeData {
  upcomingBookings: UpcomingBooking[];
}

interface PersonalizedSectionProps {
  userName: string;
}

interface WizardCourt {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  surface: string | null;
  indoor: boolean;
  defaultPriceCents: number;
  priceCents?: number;
}

type PaymentMethod = "card" | "apple_pay" | "google_pay";

// Business hours configuration
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 22;
const MINUTES_PER_HOUR = 60;
const DURATION_OPTIONS = [30, 60, 90, 120];

// Get today's date in YYYY-MM-DD format
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

// Generate time options for the dropdown
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
    const hourStr = hour.toString().padStart(2, "0");
    options.push(`${hourStr}:00`);
    options.push(`${hourStr}:30`);
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

// Calculate end time based on start time and duration
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const totalMinutes = startHour * 60 + startMinute + durationMinutes;
  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinute = totalMinutes % 60;
  return `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;
}

// Format date for display
function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === "uk" ? "uk-UA" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Format time for display
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Format date for display in summary
function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Get status badge class
function getStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "rsp-personalized-status--confirmed";
    case "pending":
      return "rsp-personalized-status--pending";
    case "cancelled":
      return "rsp-personalized-status--cancelled";
    default:
      return "";
  }
}

// Wizard steps for landing page (starts with club selection)
const WIZARD_STEPS = [
  { id: 1, label: "selectClub" },
  { id: 2, label: "dateTime" },
  { id: 3, label: "selectCourt" },
  { id: 4, label: "payment" },
] as const;

export function PersonalizedSection({ userName }: PersonalizedSectionProps) {
  const router = useRouter();
  const t = useTranslations();
  const currentLocale = useCurrentLocale();

  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use centralized club store for quick booking
  const clubsFromStore = useClubStore((state) => state.clubs);
  const clubsLoading = useClubStore((state) => state.loading);
  const fetchClubsFromStore = useClubStore((state) => state.fetchClubs);
  
  // Memoize clubs to avoid unnecessary re-renders
  const clubs = useMemo(() => clubsFromStore, [clubsFromStore]);

  // Quick Booking Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedStartTime, setSelectedStartTime] = useState<string>("10:00");
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [availableCourts, setAvailableCourts] = useState<WizardCourt[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<WizardCourt | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isLoadingCourts, setIsLoadingCourts] = useState(false);
  const [courtsError, setCourtsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  // Booking Details Modal
  const [selectedBooking, setSelectedBooking] = useState<UpcomingBooking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Fetch personalized home data
  const fetchHomeData = useCallback(async () => {
    try {
      const response = await fetch("/api/home");
      if (response.ok) {
        const data = await response.json();
        setHomeData(data);
      } else if (response.status === 401) {
        setError("Unauthorized");
      } else {
        setError(t("auth.errorOccurred"));
      }
    } catch {
      setError(t("auth.errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Fetch clubs for quick booking using store
  const fetchClubs = useCallback(async () => {
    try {
      await fetchClubsFromStore();
    } catch {
      // Silently fail - not critical for this component
    }
  }, [fetchClubsFromStore]);

  useEffect(() => {
    fetchHomeData();
    fetchClubs();
  }, [fetchHomeData, fetchClubs]);

  // Fetch available courts when moving to step 3
  const fetchAvailableCourts = useCallback(async () => {
    if (!selectedClubId) return;

    setIsLoadingCourts(true);
    setCourtsError(null);

    try {
      const params = new URLSearchParams({
        date: selectedDate,
        start: selectedStartTime,
        duration: selectedDuration.toString(),
      });

      const response = await fetch(
        `/api/clubs/${selectedClubId}/available-courts?${params}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        setCourtsError(errorData.error || t("auth.errorOccurred"));
        setAvailableCourts([]);
        return;
      }

      const data = await response.json();
      const courts: WizardCourt[] = data.availableCourts || [];

      // Fetch price timeline for each court
      const courtsWithPrices = await Promise.all(
        courts.map(async (court) => {
          try {
            const priceResponse = await fetch(
              `/api/courts/${court.id}/price-timeline?date=${selectedDate}`
            );
            if (priceResponse.ok) {
              const priceData = await priceResponse.json();
              const segment = priceData.timeline.find(
                (seg: { start: string; end: string; priceCents: number }) =>
                  selectedStartTime >= seg.start && selectedStartTime < seg.end
              );
              const priceCents = segment
                ? Math.round((segment.priceCents / MINUTES_PER_HOUR) * selectedDuration)
                : Math.round((court.defaultPriceCents / MINUTES_PER_HOUR) * selectedDuration);
              return { ...court, priceCents };
            }
          } catch {
            // Ignore price fetch errors
          }
          return {
            ...court,
            priceCents: Math.round((court.defaultPriceCents / MINUTES_PER_HOUR) * selectedDuration),
          };
        })
      );

      setAvailableCourts(courtsWithPrices);
    } catch {
      setCourtsError(t("auth.errorOccurred"));
      setAvailableCourts([]);
    } finally {
      setIsLoadingCourts(false);
    }
  }, [selectedClubId, selectedDate, selectedStartTime, selectedDuration, t]);

  // Fetch estimated price when date/time/duration changes in step 2
  useEffect(() => {
    const fetchEstimatedPrice = async () => {
      if (!selectedClubId || wizardStep !== 2) return;

      try {
        const params = new URLSearchParams({
          date: selectedDate,
          start: selectedStartTime,
          duration: selectedDuration.toString(),
        });
        const response = await fetch(
          `/api/clubs/${selectedClubId}/available-courts?${params}`
        );

        if (response.ok) {
          const data = await response.json();
          const courts: WizardCourt[] = data.availableCourts || [];

          if (courts.length > 0) {
            const avgPrice = Math.round(
              courts.reduce((sum, c) => sum + (c.defaultPriceCents / MINUTES_PER_HOUR) * selectedDuration, 0) / courts.length
            );
            setEstimatedPrice(avgPrice);
          } else {
            setEstimatedPrice(null);
          }
        }
      } catch {
        // Silently fail for price estimation
      }
    };

    if (isWizardOpen && wizardStep === 2) {
      fetchEstimatedPrice();
    }
  }, [isWizardOpen, wizardStep, selectedClubId, selectedDate, selectedStartTime, selectedDuration]);

  // Handle wizard navigation
  const handleWizardNext = async () => {
    if (wizardStep === 1 && selectedClubId) {
      setWizardStep(2);
    } else if (wizardStep === 2) {
      setWizardStep(3);
      await fetchAvailableCourts();
    } else if (wizardStep === 3 && selectedCourtId) {
      setWizardStep(4);
    } else if (wizardStep === 4 && selectedPaymentMethod) {
      await handleSubmitBooking();
    }
  };

  const handleWizardBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
      setSubmitError(null);
    }
  };

  // Submit booking
  const handleSubmitBooking = async () => {
    if (!selectedCourt || !selectedPaymentMethod) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const startDateTime = `${selectedDate}T${selectedStartTime}:00.000Z`;
      const endTime = calculateEndTime(selectedStartTime, selectedDuration);
      const endDateTime = `${selectedDate}T${endTime}:00.000Z`;

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courtId: selectedCourt.id,
          startTime: startDateTime,
          endTime: endDateTime,
          userId: "current-user",
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        setSubmitError(t("booking.slotAlreadyBooked"));
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        setSubmitError(data.error || t("auth.errorOccurred"));
        setIsSubmitting(false);
        return;
      }

      setIsComplete(true);
      setBookingId(data.bookingId);

      // Refresh home data and close wizard after delay
      setTimeout(() => {
        fetchHomeData();
        handleCloseWizard();
      }, 2000);
    } catch {
      setSubmitError(t("auth.errorOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle court selection
  const handleSelectCourt = (court: WizardCourt) => {
    setSelectedCourtId(court.id);
    setSelectedCourt(court);
  };

  // Open wizard
  const handleOpenWizard = () => {
    setIsWizardOpen(true);
    setWizardStep(1);
    setSelectedClubId("");
    setSelectedDate(getTodayDateString());
    setSelectedStartTime("10:00");
    setSelectedDuration(60);
    setAvailableCourts([]);
    setSelectedCourtId(null);
    setSelectedCourt(null);
    setSelectedPaymentMethod(null);
    setCourtsError(null);
    setSubmitError(null);
    setIsComplete(false);
    setBookingId(null);
    setEstimatedPrice(null);
  };

  // Close wizard
  const handleCloseWizard = () => {
    if (!isSubmitting) {
      setIsWizardOpen(false);
    }
  };

  // Handle booking card click
  const handleBookingCardClick = (booking: UpcomingBooking) => {
    setSelectedBooking(booking);
    setIsBookingModalOpen(true);
  };

  // Navigate to club from booking modal
  const handleGoToClub = () => {
    if (selectedBooking?.club?.id) {
      router.push(`/clubs/${selectedBooking.club.id}`);
      setIsBookingModalOpen(false);
    }
  };

  // Calculate total price for wizard
  const totalPrice = selectedCourt?.priceCents ?? estimatedPrice ?? 0;

  // Check if can proceed to next step
  const canProceed = () => {
    switch (wizardStep) {
      case 1:
        return !!selectedClubId;
      case 2:
        return !!selectedDate && !!selectedStartTime && selectedDuration > 0;
      case 3:
        return !!selectedCourtId;
      case 4:
        return !!selectedPaymentMethod && !isSubmitting;
      default:
        return false;
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="rsp-personalized-section" aria-label={t("home.personalized.title")}>
        <div className="rsp-personalized-container">
          <div className="rsp-personalized-skeleton-greeting" />
          <div className="rsp-personalized-grid">
            {[1, 2].map((i) => (
              <div key={i} className="rsp-personalized-skeleton-card">
                <div className="rsp-personalized-skeleton-title" />
                <div className="rsp-personalized-skeleton-content" />
                <div className="rsp-personalized-skeleton-content" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="rsp-personalized-section" aria-label={t("home.personalized.title")}>
        <div className="rsp-personalized-container">
          <div className="rsp-personalized-error" role="alert">
            {error}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rsp-personalized-section" aria-label={t("home.personalized.title")}>
      <div className="rsp-personalized-container">
        {/* Greeting Block with Call-to-Action */}
        <div className="rsp-personalized-greeting">
          <h2 className="rsp-personalized-greeting-title">
            {t("home.personalized.greeting", { name: userName })}
          </h2>
          <p className="rsp-personalized-greeting-cta">
            {t("home.personalized.readyToPlay")}
          </p>
        </div>

        <div className="rsp-personalized-grid">
          {/* Quick Booking Block */}
          <Card className="rsp-personalized-card rsp-personalized-quick-booking">
            <div className="rsp-personalized-card-header">
              <div className="rsp-personalized-card-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                  <path d="M9 16l2 2 4-4" />
                </svg>
              </div>
              <h3 className="rsp-personalized-card-title">
                {t("home.personalized.quickBooking")}
              </h3>
            </div>
            <p className="rsp-personalized-card-description">
              {t("home.personalized.quickBookingDescription")}
            </p>
            <Button
              onClick={handleOpenWizard}
              className="rsp-personalized-book-btn"
              disabled={clubsLoading || clubs.length === 0}
              aria-label={t("home.personalized.startBooking")}
            >
              {clubsLoading ? (
                <span className="rsp-personalized-btn-loading">
                  <span className="rsp-personalized-spinner" />
                  {t("common.loading")}
                </span>
              ) : clubs.length === 0 ? (
                t("playerDashboard.quickBook.noClubs")
              ) : (
                <>
                  {t("home.personalized.startBooking")}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </>
              )}
            </Button>
          </Card>

          {/* Upcoming Bookings Block */}
          <Card className="rsp-personalized-card rsp-personalized-bookings">
            <div className="rsp-personalized-card-header">
              <div className="rsp-personalized-card-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3 className="rsp-personalized-card-title">
                {t("home.personalized.upcomingBookings")}
              </h3>
            </div>

            {homeData?.upcomingBookings && homeData.upcomingBookings.length > 0 ? (
              <div className="rsp-personalized-bookings-list" role="list" aria-label={t("home.personalized.upcomingBookings")}>
                {homeData.upcomingBookings.slice(0, 3).map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => handleBookingCardClick(booking)}
                    className="rsp-personalized-booking-card"
                    role="listitem"
                    aria-label={`${booking.club?.name || ""} - ${formatDate(booking.startTime, currentLocale)} ${formatTime(booking.startTime)}`}
                  >
                    <div className="rsp-personalized-booking-main">
                      <div className="rsp-personalized-booking-date">
                        {formatDate(booking.startTime, currentLocale)}
                      </div>
                      <div className="rsp-personalized-booking-time">
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </div>
                    </div>
                    <div className="rsp-personalized-booking-details">
                      <div className="rsp-personalized-booking-venue">
                        {booking.club?.name}
                      </div>
                      <div className="rsp-personalized-booking-court">
                        {booking.court.name}
                      </div>
                    </div>
                    <span className={`rsp-personalized-status ${getStatusBadgeClass(booking.status)}`}>
                      {t(`common.${booking.status.toLowerCase()}`)}
                    </span>
                    <svg className="rsp-personalized-booking-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="9,18 15,12 9,6" />
                    </svg>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rsp-personalized-empty">
                <p className="rsp-personalized-empty-text">
                  {t("home.personalized.noUpcomingBookings")}
                </p>
                <Button
                  variant="outline"
                  onClick={handleOpenWizard}
                  className="rsp-personalized-empty-btn"
                  disabled={clubsLoading || clubs.length === 0}
                >
                  {t("home.personalized.bookNow")}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Quick Booking Wizard Modal */}
      <Modal
        isOpen={isWizardOpen}
        onClose={handleCloseWizard}
        title={t("booking.quickBooking.title")}
      >
        <div className="rsp-wizard-modal">
          {/* Step Indicator */}
          <nav className="rsp-wizard-steps" aria-label={t("wizard.progress")}>
            {WIZARD_STEPS.map((step) => {
              const isActive = wizardStep === step.id;
              const isCompleted = wizardStep > step.id;

              return (
                <div
                  key={step.id}
                  className={`rsp-wizard-step ${
                    isActive ? "rsp-wizard-step--active" : ""
                  } ${isCompleted ? "rsp-wizard-step--completed" : ""}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="rsp-wizard-step-circle" aria-hidden="true">
                    {isCompleted ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="rsp-wizard-step-label">
                    {t(`wizard.steps.${step.label}`)}
                  </span>
                </div>
              );
            })}
          </nav>

          {/* Step Content */}
          <div className="rsp-wizard-content">
            {/* Step 1: Club Selection */}
            {wizardStep === 1 && (
              <div className="rsp-wizard-step-content" role="group" aria-labelledby="step1-title">
                <h3 id="step1-title" className="rsp-wizard-step-title">
                  {t("home.personalized.selectClubStep")}
                </h3>
                <div className="rsp-wizard-form">
                  <Select
                    id="wizard-club-select"
                    label={t("playerDashboard.quickBook.selectClub")}
                    options={
                      clubs.length === 0
                        ? [{ value: "", label: t("playerDashboard.quickBook.noClubs") }]
                        : [
                            { value: "", label: t("home.personalized.chooseClub") },
                            ...clubs.map((club) => ({
                              value: club.id,
                              label: club.name,
                            })),
                          ]
                    }
                    value={selectedClubId}
                    onChange={(value) => setSelectedClubId(value)}
                    className="rsp-wizard-select"
                    aria-describedby="club-hint"
                  />
                  <p id="club-hint" className="rsp-wizard-field-hint">
                    {t("home.personalized.selectClubHint")}
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Date & Time */}
            {wizardStep === 2 && (
              <div className="rsp-wizard-step-content" role="group" aria-labelledby="step2-title">
                <h3 id="step2-title" className="rsp-wizard-step-title">
                  {t("wizard.step1Title")}
                </h3>
                <div className="rsp-wizard-form">
                  <div className="rsp-wizard-field">
                    <label htmlFor="wizard-date" className="rsp-wizard-label">
                      {t("common.date")}
                    </label>
                    <input
                      id="wizard-date"
                      type="date"
                      className="rsp-wizard-input"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={getTodayDateString()}
                    />
                  </div>

                  <div className="rsp-wizard-form-row rsp-wizard-form-row--2col">
                    <div className="rsp-wizard-field">
                      <Select
                        id="wizard-start-time"
                        label={t("booking.quickBooking.startTime")}
                        options={TIME_OPTIONS.map((time) => ({
                          value: time,
                          label: time,
                        }))}
                        value={selectedStartTime}
                        onChange={(value) => setSelectedStartTime(value)}
                      />
                    </div>

                    <div className="rsp-wizard-field">
                      <Select
                        id="wizard-duration"
                        label={t("common.duration")}
                        options={DURATION_OPTIONS.map((mins) => ({
                          value: String(mins),
                          label: `${mins} ${t("common.minutes")}`,
                        }))}
                        value={String(selectedDuration)}
                        onChange={(value) => setSelectedDuration(parseInt(value, 10))}
                      />
                    </div>
                  </div>

                  {/* Estimated Price */}
                  <div className="rsp-wizard-price-estimate" aria-live="polite">
                    <div className="rsp-wizard-price-estimate-label">
                      {t("wizard.estimatedPrice")}
                    </div>
                    <div className="rsp-wizard-price-estimate-value">
                      {estimatedPrice !== null ? (
                        formatPrice(estimatedPrice)
                      ) : (
                        <span className="opacity-50">--</span>
                      )}
                    </div>
                    <div className="rsp-wizard-price-estimate-hint">
                      {t("wizard.priceVariesByTime")}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Court Selection */}
            {wizardStep === 3 && (
              <div className="rsp-wizard-step-content" role="group" aria-labelledby="step3-title">
                <h3 id="step3-title" className="rsp-wizard-step-title">
                  {t("wizard.step2Title")}
                </h3>

                {isLoadingCourts ? (
                  <div className="rsp-wizard-loading" aria-busy="true" aria-live="polite">
                    <div className="rsp-wizard-spinner" role="progressbar" />
                    <span className="rsp-wizard-loading-text">{t("wizard.loadingCourts")}</span>
                  </div>
                ) : courtsError ? (
                  <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
                    {courtsError}
                  </div>
                ) : availableCourts.length === 0 ? (
                  <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
                    {t("booking.quickBooking.noCourtsAvailable")}
                    <p className="mt-1 text-xs opacity-70">
                      {t("booking.quickBooking.tryAnotherTime")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rsp-wizard-courts-header">
                      <span className="rsp-wizard-courts-title">
                        {t("wizard.selectCourt")}
                      </span>
                      <span className="rsp-wizard-courts-count" aria-live="polite">
                        {t("wizard.availableCount", { count: availableCourts.length })}
                      </span>
                    </div>

                    <div
                      className="rsp-wizard-courts-grid"
                      role="listbox"
                      aria-label={t("wizard.selectCourt")}
                      aria-multiselectable="false"
                    >
                      {availableCourts.map((court) => (
                        <div
                          key={court.id}
                          role="option"
                          aria-selected={selectedCourtId === court.id}
                          tabIndex={0}
                          className={`rsp-wizard-court-card ${
                            selectedCourtId === court.id ? "rsp-wizard-court-card--selected" : ""
                          }`}
                          onClick={() => handleSelectCourt(court)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSelectCourt(court);
                            }
                          }}
                        >
                          <div className="rsp-wizard-court-card-header">
                            <span className="rsp-wizard-court-card-name">{court.name}</span>
                            <span className="rsp-wizard-court-card-check" aria-hidden="true">
                              {selectedCourtId === court.id && (
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                >
                                  <polyline points="20,6 9,17 4,12" />
                                </svg>
                              )}
                            </span>
                          </div>

                          <div className="rsp-wizard-court-badges">
                            {court.type && (
                              <span className="rsp-wizard-court-badge">{court.type}</span>
                            )}
                            {court.surface && (
                              <span className="rsp-wizard-court-badge">{court.surface}</span>
                            )}
                            {court.indoor && (
                              <span className="rsp-wizard-court-badge rsp-wizard-court-badge--indoor">
                                {t("common.indoor")}
                              </span>
                            )}
                          </div>

                          <span className="rsp-wizard-court-card-price">
                            {court.priceCents !== undefined
                              ? formatPrice(court.priceCents)
                              : `${formatPrice(court.defaultPriceCents)} ${t("common.perHour")}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Payment */}
            {wizardStep === 4 && (
              <div className="rsp-wizard-step-content" role="group" aria-labelledby="step4-title">
                <h3 id="step4-title" className="rsp-wizard-step-title">
                  {t("wizard.step3Title")}
                </h3>

                {isComplete && bookingId ? (
                  <div className="rsp-wizard-success" role="alert" aria-live="polite">
                    <div className="rsp-wizard-success-icon" aria-hidden="true">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    </div>
                    <h4 className="rsp-wizard-success-title">
                      {t("wizard.bookingConfirmed")}
                    </h4>
                    <p className="rsp-wizard-success-message">
                      {t("wizard.bookingConfirmedMessage")}
                    </p>
                  </div>
                ) : (
                  <>
                    {submitError && (
                      <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
                        {submitError}
                      </div>
                    )}

                    {/* Booking Summary */}
                    <div className="rsp-wizard-summary">
                      <div className="rsp-wizard-summary-card">
                        <div className="rsp-wizard-summary-row">
                          <span className="rsp-wizard-summary-label">{t("playerDashboard.quickBook.selectClub")}</span>
                          <span className="rsp-wizard-summary-value">
                            {clubs.find(c => c.id === selectedClubId)?.name}
                          </span>
                        </div>
                        <div className="rsp-wizard-summary-row">
                          <span className="rsp-wizard-summary-label">{t("common.date")}</span>
                          <span className="rsp-wizard-summary-value">{formatDateDisplay(selectedDate)}</span>
                        </div>
                        <div className="rsp-wizard-summary-row">
                          <span className="rsp-wizard-summary-label">{t("common.time")}</span>
                          <span className="rsp-wizard-summary-value">
                            {selectedStartTime} - {calculateEndTime(selectedStartTime, selectedDuration)}
                          </span>
                        </div>
                        <div className="rsp-wizard-summary-row">
                          <span className="rsp-wizard-summary-label">{t("common.duration")}</span>
                          <span className="rsp-wizard-summary-value">
                            {selectedDuration} {t("common.minutes")}
                          </span>
                        </div>
                        {selectedCourt && (
                          <div className="rsp-wizard-summary-row">
                            <span className="rsp-wizard-summary-label">{t("wizard.court")}</span>
                            <span className="rsp-wizard-summary-value">{selectedCourt.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="rsp-wizard-total">
                        <span className="rsp-wizard-total-label">{t("wizard.total")}</span>
                        <span className="rsp-wizard-total-value">{formatPrice(totalPrice)}</span>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div
                      className="rsp-wizard-payment-methods"
                      role="radiogroup"
                      aria-label={t("wizard.selectPaymentMethod")}
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedPaymentMethod === "card"}
                        className={`rsp-wizard-payment-method ${
                          selectedPaymentMethod === "card" ? "rsp-wizard-payment-method--selected" : ""
                        }`}
                        onClick={() => setSelectedPaymentMethod("card")}
                        disabled={isSubmitting}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                          <line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                        <span className="rsp-wizard-payment-method-label">{t("wizard.payWithCard")}</span>
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedPaymentMethod === "apple_pay"}
                        className={`rsp-wizard-payment-method ${
                          selectedPaymentMethod === "apple_pay" ? "rsp-wizard-payment-method--selected" : ""
                        }`}
                        onClick={() => setSelectedPaymentMethod("apple_pay")}
                        disabled={isSubmitting}
                      >
                        <span className="rsp-wizard-payment-method-label">{t("wizard.applePay")}</span>
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedPaymentMethod === "google_pay"}
                        className={`rsp-wizard-payment-method ${
                          selectedPaymentMethod === "google_pay" ? "rsp-wizard-payment-method--selected" : ""
                        }`}
                        onClick={() => setSelectedPaymentMethod("google_pay")}
                        disabled={isSubmitting}
                      >
                        <span className="rsp-wizard-payment-method-label">{t("wizard.googlePay")}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          {!isComplete && (
            <div className="rsp-wizard-nav">
              <button
                type="button"
                className="rsp-wizard-nav-btn rsp-wizard-nav-btn--back"
                onClick={wizardStep === 1 ? handleCloseWizard : handleWizardBack}
                disabled={isSubmitting}
              >
                {wizardStep === 1 ? t("common.cancel") : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <polyline points="15,18 9,12 15,6" />
                    </svg>
                    {t("common.back")}
                  </>
                )}
              </button>

              <button
                type="button"
                className="rsp-wizard-nav-btn rsp-wizard-nav-btn--next"
                onClick={handleWizardNext}
                disabled={!canProceed()}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="rsp-wizard-spinner" aria-hidden="true" />
                    {t("common.processing")}
                  </>
                ) : wizardStep === 4 ? (
                  t("wizard.confirmBooking")
                ) : (
                  <>
                    {t("wizard.continue")}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <polyline points="9,18 15,12 9,6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Booking Details Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title={t("playerDashboard.bookingDetails.title")}
      >
        {selectedBooking && (
          <div className="rsp-personalized-booking-modal">
            <div className="rsp-personalized-booking-modal-content">
              <div className="rsp-personalized-booking-modal-row">
                <span className="rsp-personalized-booking-modal-label">{t("common.date")}</span>
                <span className="rsp-personalized-booking-modal-value">
                  {formatDateDisplay(selectedBooking.startTime)}
                </span>
              </div>

              <div className="rsp-personalized-booking-modal-row">
                <span className="rsp-personalized-booking-modal-label">{t("common.time")}</span>
                <span className="rsp-personalized-booking-modal-value">
                  {formatTime(selectedBooking.startTime)} - {formatTime(selectedBooking.endTime)}
                </span>
              </div>

              <div className="rsp-personalized-booking-modal-row">
                <span className="rsp-personalized-booking-modal-label">{t("training.history.club")}</span>
                <span className="rsp-personalized-booking-modal-value">
                  {selectedBooking.club?.name || "-"}
                </span>
              </div>

              <div className="rsp-personalized-booking-modal-row">
                <span className="rsp-personalized-booking-modal-label">{t("training.history.court")}</span>
                <span className="rsp-personalized-booking-modal-value">
                  {selectedBooking.court.name}
                </span>
              </div>

              {selectedBooking.coach?.name && (
                <div className="rsp-personalized-booking-modal-row">
                  <span className="rsp-personalized-booking-modal-label">{t("training.history.trainer")}</span>
                  <span className="rsp-personalized-booking-modal-value">
                    {selectedBooking.coach.name}
                  </span>
                </div>
              )}

              <div className="rsp-personalized-booking-modal-row">
                <span className="rsp-personalized-booking-modal-label">{t("common.status")}</span>
                <span className={`rsp-personalized-status ${getStatusBadgeClass(selectedBooking.status)}`}>
                  {t(`common.${selectedBooking.status.toLowerCase()}`)}
                </span>
              </div>

              <div className="rsp-personalized-booking-modal-row">
                <span className="rsp-personalized-booking-modal-label">{t("common.price")}</span>
                <span className="rsp-personalized-booking-modal-value rsp-personalized-booking-modal-price">
                  {formatPrice(selectedBooking.priceCents)}
                </span>
              </div>
            </div>

            <div className="rsp-personalized-booking-modal-actions">
              <Button variant="outline" onClick={() => setIsBookingModalOpen(false)}>
                {t("common.close")}
              </Button>
              {selectedBooking.club?.id && (
                <Button onClick={handleGoToClub}>
                  {t("clubs.viewClub")}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
