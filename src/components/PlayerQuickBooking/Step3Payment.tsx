"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatPrice } from "@/utils/price";
import { formatDateTimeLong, formatDateLong } from "@/utils/date";
import {
  BookingCourt,
  BookingClub,
  PaymentProviderInfo,
} from "./types";

interface Step3PaymentProps {
  club: BookingClub | null;
  date: string;
  startTime: string;
  duration: number;
  court: BookingCourt | null;
  totalPrice: number;
  selectedProviderId: string | null;
  onSelectProvider: (providerId: string) => void;
  availableProviders: PaymentProviderInfo[];
  isLoadingProviders: boolean;
  providersError: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  reservationExpiresAt: string | null;
  onReservationExpired?: () => void;
}

// Time validation constants
const MIN_HOUR = 0;
const MAX_HOUR = 23;
const MIN_MINUTE = 0;
const MAX_MINUTE = 59;

export function Step3Payment({
  club,
  date,
  startTime,
  duration,
  court,
  totalPrice,
  selectedProviderId,
  onSelectProvider,
  availableProviders,
  isLoadingProviders,
  providersError,
  isSubmitting,
  submitError,
  reservationExpiresAt: reservationExpiresAtProp,
  onReservationExpired,
}: Step3PaymentProps) {
  const t = useTranslations();
  const locale = useLocale();

  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Use reservation expiry from parent
  const reservationExpiresAt = reservationExpiresAtProp;

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    
    checkDarkMode();
    
    // Listen for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    
    return () => observer.disconnect();
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!reservationExpiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(reservationExpiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

      setTimeRemaining(remaining);

      if (remaining === 0) {
        onReservationExpired?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [reservationExpiresAt, onReservationExpired]);

  // Format time remaining
  const formatTimeRemaining = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Format date and time for display using locale-aware formatting
  const formatBookingDateTime = useCallback((dateStr: string, timeStr: string): string => {
    // Fallback function for when time parsing fails
    const fallbackToDateOnly = (errorMsg: string, context?: Record<string, unknown>) => {
      console.error(errorMsg, context ?? timeStr);
      return formatDateLong(new Date(dateStr), locale);
    };

    try {
      // Validate time format (HH:MM)
      if (!timeStr || !timeStr.includes(':')) {
        return fallbackToDateOnly('Invalid time format');
      }

      // Split time and validate we have exactly 2 parts
      const timeParts = timeStr.split(':');
      if (timeParts.length !== 2) {
        return fallbackToDateOnly('Invalid time format - expected HH:MM');
      }

      // Parse and validate hours and minutes
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);

      if (isNaN(hours) || isNaN(minutes) ||
        hours < MIN_HOUR || hours > MAX_HOUR ||
        minutes < MIN_MINUTE || minutes > MAX_MINUTE) {
        return fallbackToDateOnly('Invalid time values', { hours, minutes, timeStr });
      }

      // Create date time with the parsed time
      const dateTime = new Date(dateStr);
      dateTime.setHours(hours, minutes, 0, 0);

      return formatDateTimeLong(dateTime, locale);
    } catch (error) {
      return fallbackToDateOnly('Error formatting booking date time', { error });
    }
  }, [locale]);

  return (
    <div className="rsp-wizard-step-content" role="group" aria-labelledby="step3-title">
      <h2 className="rsp-wizard-step-title" id="step3-title">
        {t("wizard.step3Title")}
      </h2>

      {/* Reservation Timer */}
      {timeRemaining > 0 && (
        <div className="rsp-wizard-reservation-timer" role="timer" aria-live="polite">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>
            {t("wizard.reservationExpiresIn", { time: formatTimeRemaining(timeRemaining) })}
          </span>
        </div>
      )}

      {submitError && (
        <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
          {submitError}
        </div>
      )}

      {providersError && (
        <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
          {providersError}
        </div>
      )}

      {/* Short Booking Summary */}
      <div className="rsp-wizard-summary">
        <div className="rsp-wizard-summary-card">
          <div className="rsp-wizard-summary-row">
            <span className="rsp-wizard-summary-label">{t("booking.summary.date")}</span>
            <span className="rsp-wizard-summary-value">{formatBookingDateTime(date, startTime)}</span>
          </div>
          {court && (
            <>
              <div className="rsp-wizard-summary-row">
                <span className="rsp-wizard-summary-label">{t("booking.summary.court")}</span>
                <span className="rsp-wizard-summary-value">{court.name}</span>
              </div>
              {court.courtFormat && (
                <div className="rsp-wizard-summary-row">
                  <span className="rsp-wizard-summary-label">{t("booking.summary.courtType")}</span>
                  <span className="rsp-wizard-summary-value">
                    {court.courtFormat === "SINGLE"
                      ? t("booking.courtType.single")
                      : t("booking.courtType.double")}
                  </span>
                </div>
              )}
            </>
          )}
          <div className="rsp-wizard-summary-row">
            <span className="rsp-wizard-summary-label">{t("booking.summary.duration")}</span>
            <span className="rsp-wizard-summary-value">
              {duration} {t("common.minutes")}
            </span>
          </div>
        </div>

        <div className="rsp-wizard-total">
          <span className="rsp-wizard-total-label">{t("booking.summary.total")}</span>
          <span className="rsp-wizard-total-value">{formatPrice(totalPrice)}</span>
        </div>
      </div>

      {/* Payment Providers */}
      <div className="rsp-wizard-payment-section">
        <h3 className="rsp-wizard-payment-section-title">
          {t("wizard.selectPaymentProvider")}
        </h3>

        {isLoadingProviders ? (
          <div className="rsp-wizard-payment-providers-loading" role="status">
            <div className="rsp-wizard-spinner" aria-hidden="true" />
            <span>{t("wizard.loadingPaymentProviders")}</span>
          </div>
        ) : availableProviders.length === 0 ? (
          <div className="rsp-wizard-alert rsp-wizard-alert--info" role="alert">
            {t("wizard.noPaymentProvidersAvailable")}
          </div>
        ) : (
          <div
            className="rsp-wizard-payment-methods"
            role="radiogroup"
            aria-label={t("wizard.selectPaymentProvider")}
          >
            {availableProviders.map((provider) => (
              <button
                key={provider.id}
                type="button"
                role="radio"
                aria-checked={selectedProviderId === provider.id}
                className={`rsp-wizard-payment-method ${
                  selectedProviderId === provider.id
                    ? "rsp-wizard-payment-method--selected"
                    : ""
                }`}
                onClick={() => onSelectProvider(provider.id)}
                disabled={isSubmitting}
              >
                <img
                  src={isDark ? provider.logoDark : provider.logoLight}
                  alt={provider.name}
                  className="rsp-wizard-payment-method-logo"
                  onError={(e) => {
                    // Fallback to provider name if logo fails to load
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="rsp-wizard-payment-method-label">
                  {provider.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
