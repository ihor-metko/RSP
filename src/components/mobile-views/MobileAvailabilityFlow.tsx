"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, EmptyState } from "@/components/ui";
import { AuthPromptModal } from "@/components/AuthPromptModal";
import { useUserStore } from "@/stores/useUserStore";
import { getTodayUTC, getDatesFromStartUTC } from "@/utils/utcDateTime";
import "./MobileViews.css";

interface MobileAvailabilityFlowProps {
  clubId: string;
  clubName: string;
  onBack: () => void;
  onBookingComplete: () => void;
}

type Step = "date" | "time" | "court";

interface TimeSlot {
  hour: number;
  displayTime: string;
  available: boolean;
  courts: Array<{
    courtId: string;
    courtName: string;
    status: "available" | "booked" | "partial" | "pending";
  }>;
}

interface Court {
  id: string;
  name: string;
  type: string | null;
  indoor: boolean;
}

interface AvailabilityData {
  days: Array<{
    date: string;
    dayName: string;
    hours: Array<{
      hour: number;
      courts: Array<{
        courtId: string;
        courtName: string;
        status: "available" | "booked" | "partial" | "pending";
      }>;
    }>;
  }>;
  courts: Court[];
}

export function MobileAvailabilityFlow({
  clubId,
  clubName,
  onBack,
  onBookingComplete,
}: MobileAvailabilityFlowProps) {
  const t = useTranslations();
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  const [currentStep, setCurrentStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);

  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);

  // Fetch availability data
  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = getTodayUTC();
      const response = await fetch(
        `/api/clubs/${clubId}/courts/availability?start=${startDate}&days=14&mode=rolling`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch availability");
      }

      const data: AvailabilityData = await response.json();
      setAvailabilityData(data);
    } catch (err) {
      console.error("Error fetching availability:", err);
      setError(t("availability.failedToLoadAvailability"));
    } finally {
      setLoading(false);
    }
  }, [clubId, t]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Get available dates (dates with at least one available slot)
  const availableDates = availabilityData?.days.filter((day) =>
    day.hours.some((hour) =>
      hour.courts.some((court) => court.status === "available")
    )
  ) || [];

  // Get time slots for selected date
  const getTimeSlotsForDate = useCallback((dateStr: string): TimeSlot[] => {
    if (!availabilityData) return [];

    const dayData = availabilityData.days.find((d) => d.date === dateStr);
    if (!dayData) return [];

    return dayData.hours.map((hour) => {
      const hasAvailable = hour.courts.some((c) => c.status === "available");
      return {
        hour: hour.hour,
        displayTime: `${hour.hour.toString().padStart(2, "0")}:00`,
        available: hasAvailable,
        courts: hour.courts,
      };
    }).filter((slot) => slot.available); // Only show available slots
  }, [availabilityData]);

  // Get courts for selected date and time
  const getCourtsForDateTime = useCallback((dateStr: string, hour: number): Court[] => {
    if (!availabilityData) return [];

    const dayData = availabilityData.days.find((d) => d.date === dateStr);
    if (!dayData) return [];

    const hourData = dayData.hours.find((h) => h.hour === hour);
    if (!hourData) return [];

    // Get only available courts
    const availableCourtIds = hourData.courts
      .filter((c) => c.status === "available")
      .map((c) => c.courtId);

    return availabilityData.courts.filter((court) =>
      availableCourtIds.includes(court.id)
    );
  }, [availabilityData]);

  // Step handlers
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setSelectedCourt(null);
    setCurrentStep("time");
  };

  const handleTimeSelect = (hour: number) => {
    setSelectedTime(hour);
    setSelectedCourt(null);
    setCurrentStep("court");
  };

  const handleCourtSelect = (courtId: string) => {
    setSelectedCourt(courtId);
  };

  const handleContinueToBooking = () => {
    if (!isLoggedIn) {
      setIsAuthPromptOpen(true);
      return;
    }

    if (!selectedDate || selectedTime === null || !selectedCourt) {
      return;
    }

    // TODO: When booking modal is integrated, convert times to UTC:
    // const timezone = getClubTimezone(clubTimezone);
    // const startTime = `${selectedTime.toString().padStart(2, "0")}:00`;
    // const endTime = `${(selectedTime + 1).toString().padStart(2, "0")}:00`;
    // const startDateTime = clubLocalToUTC(selectedDate, startTime, timezone);
    // const endDateTime = clubLocalToUTC(selectedDate, endTime, timezone);

    // Navigate to booking confirmation (to be implemented)
    // For now, we'll redirect to the club page
    onBookingComplete();
  };

  const handleBack = () => {
    if (currentStep === "time") {
      setCurrentStep("date");
      setSelectedTime(null);
      setSelectedCourt(null);
    } else if (currentStep === "court") {
      setCurrentStep("time");
      setSelectedCourt(null);
    } else {
      onBack();
    }
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + "T00:00:00.000Z");
    const today = getTodayUTC();
    const tomorrow = getDatesFromStartUTC(today, 2)[1];

    if (dateStr === today) {
      return t("common.today");
    } else if (dateStr === tomorrow) {
      return t("common.tomorrow");
    }

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="im-mobile-availability">
        <div className="im-mobile-availability-header">
          <button onClick={onBack} className="im-mobile-availability-back" aria-label={t("common.back")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="im-mobile-availability-title">{t("clubs.checkAvailability")}</h1>
        </div>
        <div className="im-mobile-availability-loading">
          <div className="im-mobile-availability-skeleton-item" />
          <div className="im-mobile-availability-skeleton-item" />
          <div className="im-mobile-availability-skeleton-item" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="im-mobile-availability">
        <div className="im-mobile-availability-header">
          <button onClick={onBack} className="im-mobile-availability-back" aria-label={t("common.back")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="im-mobile-availability-title">{t("clubs.checkAvailability")}</h1>
        </div>
        <div className="im-mobile-availability-error">
          <p>{error}</p>
          <Button onClick={fetchAvailability}>{t("common.retry")}</Button>
        </div>
      </div>
    );
  }

  // Empty state - no available dates
  if (availableDates.length === 0) {
    return (
      <div className="im-mobile-availability">
        <div className="im-mobile-availability-header">
          <button onClick={onBack} className="im-mobile-availability-back" aria-label={t("common.back")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="im-mobile-availability-title">{t("clubs.checkAvailability")}</h1>
        </div>
        <EmptyState
          title={t("availability.noAvailableSlots")}
          description={t("availability.noAvailableSlotsDescription")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
      </div>
    );
  }

  const timeSlots = selectedDate ? getTimeSlotsForDate(selectedDate) : [];
  const courts = selectedDate && selectedTime !== null ? getCourtsForDateTime(selectedDate, selectedTime) : [];

  const stepTitle = currentStep === "date"
    ? t("availability.selectDate")
    : currentStep === "time"
      ? t("availability.selectTime")
      : t("availability.selectCourt");

  const canContinue = selectedDate !== null && selectedTime !== null && selectedCourt !== null;

  return (
    <>
      <div className="im-mobile-availability">
        {/* Header */}
        <div className="im-mobile-availability-header">
          <button onClick={handleBack} className="im-mobile-availability-back" aria-label={t("common.back")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="im-mobile-availability-header-content">
            <p className="im-mobile-availability-club-name">{clubName}</p>
            <h1 className="im-mobile-availability-title">{stepTitle}</h1>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="im-mobile-availability-progress">
          <div className={`im-mobile-availability-progress-step ${currentStep === "date" || selectedDate ? "active" : ""}`}>
            <span className="im-mobile-availability-progress-number">1</span>
            <span className="im-mobile-availability-progress-label">{t("availability.date")}</span>
          </div>
          <div className="im-mobile-availability-progress-line" />
          <div className={`im-mobile-availability-progress-step ${currentStep === "time" || selectedTime !== null ? "active" : ""}`}>
            <span className="im-mobile-availability-progress-number">2</span>
            <span className="im-mobile-availability-progress-label">{t("availability.time")}</span>
          </div>
          <div className="im-mobile-availability-progress-line" />
          <div className={`im-mobile-availability-progress-step ${currentStep === "court" || selectedCourt ? "active" : ""}`}>
            <span className="im-mobile-availability-progress-number">3</span>
            <span className="im-mobile-availability-progress-label">{t("availability.court")}</span>
          </div>
        </div>

        {/* Content */}
        <div className="im-mobile-availability-content">
          {/* Step 1: Date Selection */}
          {currentStep === "date" && (
            <div className="im-mobile-availability-list">
              {availableDates.map((day) => (
                <button
                  key={day.date}
                  onClick={() => handleDateSelect(day.date)}
                  className={`im-mobile-availability-item ${selectedDate === day.date ? "selected" : ""}`}
                >
                  <div className="im-mobile-availability-item-content">
                    <span className="im-mobile-availability-item-label">{formatDate(day.date)}</span>
                    <span className="im-mobile-availability-item-sublabel">{day.dayName}</span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="im-mobile-availability-item-arrow">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Time Selection */}
          {currentStep === "time" && selectedDate && (
            <div className="im-mobile-availability-list">
              {timeSlots.length === 0 ? (
                <EmptyState
                  title={t("availability.noTimeSlotsAvailable")}
                  description={t("availability.noTimeSlotsDescription")}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                  }
                />
              ) : (
                timeSlots.map((slot) => (
                  <button
                    key={slot.hour}
                    onClick={() => handleTimeSelect(slot.hour)}
                    className={`im-mobile-availability-item ${selectedTime === slot.hour ? "selected" : ""}`}
                  >
                    <div className="im-mobile-availability-item-content">
                      <span className="im-mobile-availability-item-label">
                        {slot.displayTime} - {`${(slot.hour + 1).toString().padStart(2, "0")}:00`}
                      </span>
                      <span className="im-mobile-availability-item-sublabel">
                        {slot.courts.filter((c) => c.status === "available").length} {t("availability.courtsAvailable")}
                      </span>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="im-mobile-availability-item-arrow">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 3: Court Selection */}
          {currentStep === "court" && selectedDate && selectedTime !== null && (
            <div className="im-mobile-availability-list">
              {courts.length === 0 ? (
                <EmptyState
                  title={t("availability.noCourtsAvailable")}
                  description={t("availability.noCourtsDescription")}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                  }
                />
              ) : (
                courts.map((court) => (
                  <button
                    key={court.id}
                    onClick={() => handleCourtSelect(court.id)}
                    className={`im-mobile-availability-item ${selectedCourt === court.id ? "selected" : ""}`}
                  >
                    <div className="im-mobile-availability-item-content">
                      <span className="im-mobile-availability-item-label">{court.name}</span>
                      <div className="im-mobile-availability-item-badges">
                        {court.type && (
                          <span className="im-mobile-availability-badge">{court.type}</span>
                        )}
                        <span className="im-mobile-availability-badge">
                          {court.indoor ? t("common.indoor") : t("common.outdoor")}
                        </span>
                      </div>
                    </div>
                    {selectedCourt === court.id && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="im-mobile-availability-item-check">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {currentStep === "court" && canContinue && (
          <div className="im-mobile-availability-footer">
            <Button
              onClick={handleContinueToBooking}
              className="im-mobile-availability-cta"
              aria-label={t("availability.continueToBooking")}
            >
              {t("availability.continueToBooking")}
            </Button>
          </div>
        )}
      </div>

      {/* Auth Prompt Modal */}
      <AuthPromptModal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
      />
    </>
  );
}
