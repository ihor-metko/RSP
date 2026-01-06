"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Modal, Button, Card, Select } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import { filterPastTimeSlots, getTodayStr } from "@/utils/dateTime";
import "./QuickBookingModal.css";

interface AvailableCourt {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  surface: string | null;
  indoor: boolean;
  defaultPriceCents: number;
  priceCents?: number; // Resolved price for the selected slot
}

interface QuickBookingModalProps {
  clubId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectCourt: (courtId: string, date: string, startTime: string, endTime: string, priceCents?: number) => void;
}

// Business hours configuration
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 22;

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

const DURATION_OPTIONS = [60, 90, 120, 150, 180];
const DEFAULT_DURATION = 120; // 2 hours

export function QuickBookingModal({
  clubId,
  isOpen,
  onClose,
  onSelectCourt,
}: QuickBookingModalProps) {
  const t = useTranslations();
  const [date, setDate] = useState<string>(getTodayStr());
  const [startTime, setStartTime] = useState<string>("10:00");
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION);
  const [availableCourts, setAvailableCourts] = useState<AvailableCourt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter time options to exclude past times for today
  const timeOptions = filterPastTimeSlots(generateTimeOptions(), date);

  const handleFindCourts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        date,
        start: startTime,
        duration: duration.toString(),
      });
      const response = await fetch(
        `/api/clubs/${clubId}/available-courts?${params}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch available courts");
        setAvailableCourts([]);
        return;
      }

      const data = await response.json();
      const courts: AvailableCourt[] = data.availableCourts || [];

      // Fetch price timeline for each court to get resolved prices
      const courtsWithPrices = await Promise.all(
        courts.map(async (court) => {
          try {
            const priceResponse = await fetch(
              `/api/courts/${court.id}/price-timeline?date=${date}`
            );
            if (priceResponse.ok) {
              const priceData = await priceResponse.json();
              // Find price segment that covers the start time
              const segment = priceData.timeline.find(
                (seg: { start: string; end: string; priceCents: number }) =>
                  startTime >= seg.start && startTime < seg.end
              );
              // Calculate price for the duration
              const priceCents = segment
                ? Math.round((segment.priceCents / 60) * duration)
                : Math.round((court.defaultPriceCents / 60) * duration);
              return { ...court, priceCents };
            }
          } catch {
            // Ignore price fetch errors
          }
          // Fallback to default price calculation
          return {
            ...court,
            priceCents: Math.round((court.defaultPriceCents / 60) * duration),
          };
        })
      );

      setAvailableCourts(courtsWithPrices);
    } catch {
      setError(t("auth.errorOccurred"));
      setAvailableCourts([]);
    } finally {
      setIsLoading(false);
    }
  }, [clubId, date, startTime, duration, t]);

  const handleSelectCourt = (court: AvailableCourt) => {
    // Calculate end time based on start time and duration
    // Use simple arithmetic on hours/minutes to avoid timezone issues
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const totalMinutes = startHour * 60 + startMinute + duration;
    const endHour = Math.floor(totalMinutes / 60) % 24;
    const endMinute = totalMinutes % 60;
    const endTimeStr = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

    onSelectCourt(court.id, date, startTime, endTimeStr, court.priceCents);
  };

  const handleClose = () => {
    // Reset state when closing
    setAvailableCourts([]);
    setHasSearched(false);
    setError(null);
    onClose();
  };

  // Reset search results when date/time/duration changes
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setAvailableCourts([]);
    setHasSearched(false);
    setError(null);
  };

  const handleTimeChange = (newTime: string) => {
    setStartTime(newTime);
    setAvailableCourts([]);
    setHasSearched(false);
    setError(null);
  };

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    setAvailableCourts([]);
    setHasSearched(false);
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("booking.quickBooking.title")}>
      <div className="tm-quick-booking-modal">
        <div className="tm-quick-booking-form">
          {/* Date picker */}
          <div className="tm-booking-select-wrapper">
            <label htmlFor="quick-booking-date" className="tm-booking-label">
              {t("common.date")}
            </label>
            <input
              id="quick-booking-date"
              type="date"
              className="tm-booking-select"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              min={getTodayStr()}
              disabled={isLoading}
            />
          </div>

          {/* Time picker */}
          <Select
            id="quick-booking-time"
            label={t("booking.quickBooking.startTime")}
            options={timeOptions.map((time) => ({
              value: time,
              label: time,
            }))}
            value={startTime}
            onChange={(value) => handleTimeChange(value)}
            disabled={isLoading}
            className="tm-booking-select"
          />

          {/* Duration picker */}
          <Select
            id="quick-booking-duration"
            label={t("common.duration")}
            options={DURATION_OPTIONS.map((mins) => ({
              value: String(mins),
              label: `${mins} ${t("common.minutes")}`,
            }))}
            value={String(duration)}
            onChange={(value) => handleDurationChange(parseInt(value, 10))}
            disabled={isLoading}
            className="tm-booking-select"
          />

          {/* Find courts button */}
          <div className="tm-quick-booking-search">
            <Button onClick={handleFindCourts} disabled={isLoading}>
              {isLoading ? t("booking.quickBooking.searching") : t("booking.quickBooking.findAvailableCourts")}
            </Button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="tm-booking-alert tm-booking-alert--error" role="alert">
            {error}
          </div>
        )}

        {/* Results section */}
        {hasSearched && !isLoading && !error && (
          <div className="tm-quick-booking-results">
            {availableCourts.length === 0 ? (
              <div className="tm-quick-booking-empty">
                <p className="tm-quick-booking-empty-text">
                  {t("booking.quickBooking.noCourtsAvailable")}
                </p>
                <p className="tm-quick-booking-empty-hint">
                  {t("booking.quickBooking.tryAnotherTime")}
                </p>
              </div>
            ) : (
              <div className="tm-quick-booking-courts">
                <p className="tm-quick-booking-results-title">
                  {t("booking.quickBooking.availableCourts", { count: availableCourts.length })}
                </p>
                <div className="tm-quick-booking-court-list" role="list">
                  {availableCourts.map((court) => (
                    <Card
                      key={court.id}
                      className="tm-quick-booking-court-card"
                    >
                      <div className="tm-quick-booking-court-info" role="listitem">
                        <div className="tm-quick-booking-court-name">
                          {court.name}
                        </div>
                        <div className="tm-quick-booking-court-details">
                          {court.type && (
                            <span className="tm-badge tm-badge-type">
                              {court.type}
                            </span>
                          )}
                          {court.surface && (
                            <span className="tm-badge tm-badge-surface">
                              {court.surface}
                            </span>
                          )}
                          {court.indoor && (
                            <span className="tm-badge tm-badge-indoor">
                              {t("common.indoor")}
                            </span>
                          )}
                        </div>
                        <div className="tm-quick-booking-court-price">
                          {court.priceCents !== undefined ? (
                            <span className="font-semibold">{formatPrice(court.priceCents)}</span>
                          ) : (
                            <span>{formatPrice(court.defaultPriceCents)} {t("common.perHour")}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleSelectCourt(court)}
                        className="tm-quick-booking-select-btn"
                        aria-label={`${t("booking.quickBooking.select")} ${court.name}${court.priceCents !== undefined ? ` - ${formatPrice(court.priceCents)}` : ""}`}
                      >
                        {t("booking.quickBooking.select")}
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
