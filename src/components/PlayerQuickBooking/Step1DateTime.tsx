"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Select, DateInput, RadioGroup } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import {
  generateTimeOptionsForDate,
  getTodayDateString,
  DURATION_OPTIONS,
  isPeakHour,
  PlayerBookingStep1Data,
  ClubBusinessHours,
  wouldEndAfterClosing,
  getValidDurations,
} from "./types";

interface Step1DateTimeProps {
  data: PlayerBookingStep1Data;
  onChange: (data: Partial<PlayerBookingStep1Data>) => void;
  estimatedPrice: number | null;
  estimatedPriceRange?: { min: number; max: number } | null;
  isLoading?: boolean;
  availableCourtTypes?: ("SINGLE" | "DOUBLE")[];
  businessHours?: ClubBusinessHours[];
  clubTimezone?: string | null;
  readOnlyMode?: boolean; // Indicates step is locked (resume payment flow)
}

// Translation key mapping for court types
const COURT_TYPE_TRANSLATION_KEYS: Record<"SINGLE" | "DOUBLE", string> = {
  SINGLE: "court.type.single",
  DOUBLE: "court.type.double",
};


// Default available court types when none are provided
const DEFAULT_AVAILABLE_COURT_TYPES: ("SINGLE" | "DOUBLE")[] = ["SINGLE", "DOUBLE"];

export function Step1DateTime({
  data,
  onChange,
  estimatedPrice,
  estimatedPriceRange,
  isLoading = false,
  availableCourtTypes = DEFAULT_AVAILABLE_COURT_TYPES,
  businessHours,
  clubTimezone,
  readOnlyMode = false,
}: Step1DateTimeProps) {
  const t = useTranslations();
  const isPeak = isPeakHour(data.date, data.startTime);

  // Generate time options based on business hours for the selected date
  // Pass club timezone to ensure correct filtering of past times
  const TIME_OPTIONS = generateTimeOptionsForDate(data.date, businessHours, clubTimezone);

  // Check if booking would end after closing
  const endsAfterClosing = wouldEndAfterClosing(
    data.date,
    data.startTime,
    data.duration,
    businessHours
  );

  // Get valid durations for the selected start time
  const validDurations = getValidDurations(data.date, data.startTime, businessHours);

  // Determine price estimate hint message (memoized to prevent unnecessary re-renders)
  const priceEstimateHint = useMemo(() => {
    if (!data.startTime) {
      return null;
    }
    if (estimatedPriceRange == null && estimatedPrice == null) {
      return t("wizard.noCourtsAvailable");
    }
    if (estimatedPriceRange && estimatedPriceRange.min !== estimatedPriceRange.max) {
      return t("wizard.priceRangeHint");
    }
    return t("wizard.priceVariesByTime");
  }, [data.startTime, estimatedPriceRange, estimatedPrice, t]);

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format duration for display
  const formatDuration = (mins: number) => {
    const hours = mins / 60;
    return hours >= 1 && mins % 60 === 0
      ? `${hours} ${hours === 1 ? t("common.hour") : t("common.hours")}`
      : `${mins} ${t("common.minutes")}`;
  };

  return (
    <div className="rsp-wizard-step-content" role="group" aria-labelledby="step1-title">
      <h2 className="rsp-wizard-step-title" id="step1-title">
        {t("wizard.step1Title")}
      </h2>

      {/* Read-only mode indicator */}
      {readOnlyMode && (
        <div className="rsp-wizard-alert rsp-wizard-alert--info" role="status">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginRight: "8px" }}
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {t("wizard.stepLockedInfo")}
        </div>
      )}

      <div className={`rsp-wizard-form ${readOnlyMode ? "rsp-wizard-form--readonly" : ""}`}>
        {readOnlyMode ? (
          // Read-only display
          <>
            <div className="rsp-wizard-summary-card">
              <div className="rsp-wizard-summary-row">
                <span className="rsp-wizard-summary-label">{t("common.date")}</span>
                <span className="rsp-wizard-summary-value">{formatDateDisplay(data.date)}</span>
              </div>
              <div className="rsp-wizard-summary-row">
                <span className="rsp-wizard-summary-label">{t("booking.quickBooking.startTime")}</span>
                <span className="rsp-wizard-summary-value">{data.startTime}</span>
              </div>
              <div className="rsp-wizard-summary-row">
                <span className="rsp-wizard-summary-label">{t("common.duration")}</span>
                <span className="rsp-wizard-summary-value">{formatDuration(data.duration)}</span>
              </div>
              <div className="rsp-wizard-summary-row">
                <span className="rsp-wizard-summary-label">{t("court.courtType")}</span>
                <span className="rsp-wizard-summary-value">
                  {t(COURT_TYPE_TRANSLATION_KEYS[data.courtType])}
                </span>
              </div>
            </div>
          </>
        ) : (
          // Editable form
          <>
            {/* Date Input with Calendar */}
            <div className="rsp-wizard-field">
              <DateInput
                label={t("common.date")}
                value={data.date}
                onChange={(date) => onChange({ date })}
                minDate={getTodayDateString()}
                disabled={isLoading}
                aria-label={t("common.date")}
              />
            </div>

            {/* Start Time and Duration - 2 columns */}
            <div className="rsp-wizard-form-row rsp-wizard-form-row--2col">
              <div className="rsp-wizard-field">
                <Select
                  id="wizard-start-time"
                  label={t("booking.quickBooking.startTime")}
                  options={TIME_OPTIONS.map((time) => ({
                    value: time,
                    label: time,
                  }))}
                  value={data.startTime}
                  onChange={(value) => onChange({ startTime: value })}
                  disabled={isLoading}
                  placeholder={t("booking.quickBooking.selectStartTime")}
                  aria-describedby={isPeak && data.startTime ? "peak-hint" : undefined}
                />
              </div>

              <div className="rsp-wizard-field">
                <Select
                  id="wizard-duration"
                  label={t("common.duration")}
                  options={DURATION_OPTIONS.map((mins) => {
                    const hours = mins / 60;
                    const label = hours >= 1 && mins % 60 === 0
                      ? `${hours} ${hours === 1 ? t("common.hour") : t("common.hours")}`
                      : `${mins} ${t("common.minutes")}`;
                    const isValid = validDurations.includes(mins);
                    return {
                      value: String(mins),
                      label: isValid ? label : `${label} (${t("wizard.unavailable")})`,
                      disabled: !isValid,
                    };
                  })}
                  value={String(data.duration)}
                  onChange={(value) => onChange({ duration: parseInt(value, 10) })}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Court Type Selection */}
            {availableCourtTypes.length > 0 && (
              <div className="rsp-wizard-field">
                <RadioGroup
                  label={t("court.courtType")}
                  name="court-type"
                  options={availableCourtTypes.map((type) => ({
                    value: type,
                    label: t(COURT_TYPE_TRANSLATION_KEYS[type]),
                  }))}
                  value={data.courtType}
                  onChange={(value) => {
                    if (value === "SINGLE" || value === "DOUBLE") {
                      onChange({ courtType: value });
                    }
                  }}
                  disabled={isLoading}
                  className="rsp-wizard-court-type-group"
                />
              </div>
            )}

            {/* Peak hours hint */}
            {isPeak && data.startTime && (
              <div className="rsp-wizard-hint" id="peak-hint" role="note">
                <svg
                  className="rsp-wizard-hint-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{t("wizard.peakHoursHint")}</span>
              </div>
            )}

            {/* Dynamic Price Estimate */}
            <div className="rsp-wizard-price-estimate" aria-live="polite">
              <div className="rsp-wizard-price-estimate-label">
                {t("wizard.estimatedPrice")}
              </div>
              <div className="rsp-wizard-price-estimate-value">
                {!data.startTime ? (
                  <span className="opacity-50 text-base">{t("booking.quickBooking.selectStartTimeToSeePrice")}</span>
                ) : estimatedPriceRange && estimatedPriceRange.min !== estimatedPriceRange.max ? (
                  <>
                    {formatPrice(estimatedPriceRange.min)} - {formatPrice(estimatedPriceRange.max)}
                  </>
                ) : estimatedPrice !== null ? (
                  formatPrice(estimatedPrice)
                ) : (
                  <span className="opacity-50">--</span>
                )}
              </div>
              <div className="rsp-wizard-price-estimate-hint">
                {priceEstimateHint}
              </div>
            </div>

            {/* Warning message if booking ends after closing - moved to bottom */}
            {endsAfterClosing && data.startTime && (
              <div className="rsp-wizard-hint" role="alert" style={{ marginTop: "1rem", color: "var(--color-warning, #f59e0b)" }}>
                <svg
                  className="rsp-wizard-hint-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{t("wizard.clubClosedBeforeEnd")}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
