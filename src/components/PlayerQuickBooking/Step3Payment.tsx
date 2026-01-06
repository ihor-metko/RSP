"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatPrice } from "@/utils/price";
import { formatDateTimeLong, formatDateLong } from "@/utils/date";
import Image from "next/image";
import { useTheme } from "@/hooks/useTheme";
import {
  PaymentProviderInfo,
  BookingCourt,
  BookingClub,
} from "./types";

interface Step3PaymentProps {
  club: BookingClub | null;
  date: string;
  startTime: string;
  duration: number;
  court: BookingCourt | null;
  totalPrice: number;
  availablePaymentProviders: PaymentProviderInfo[];
  selectedPaymentProvider: PaymentProviderInfo | null;
  onSelectPaymentProvider: (provider: PaymentProviderInfo) => void;
  isSubmitting: boolean;
  isLoadingProviders: boolean;
  submitError: string | null;
  providersError: string | null;
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
  availablePaymentProviders,
  selectedPaymentProvider,
  onSelectPaymentProvider,
  isSubmitting,
  isLoadingProviders,
  submitError,
  providersError,
  reservationExpiresAt: reservationExpiresAtProp,
  onReservationExpired,
}: Step3PaymentProps) {
  const t = useTranslations();
  const locale = useLocale();
  const theme = useTheme();

  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Use reservation expiry from parent
  const reservationExpiresAt = reservationExpiresAtProp;

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

      {/* Booking Summary */}
      <div className="rsp-wizard-summary">
        <div className="rsp-wizard-summary-card">
          {club && (
            <div className="rsp-wizard-summary-row">
              <span className="rsp-wizard-summary-label">{t("booking.summary.club")}</span>
              <span className="rsp-wizard-summary-value">{club.name}</span>
            </div>
          )}
          <div className="rsp-wizard-summary-row">
            <span className="rsp-wizard-summary-label">{t("booking.summary.date")}</span>
            <span className="rsp-wizard-summary-value">{formatBookingDateTime(date, startTime)}</span>
          </div>
          <div className="rsp-wizard-summary-row">
            <span className="rsp-wizard-summary-label">{t("booking.summary.duration")}</span>
            <span className="rsp-wizard-summary-value">
              {duration} {t("common.minutes")}
            </span>
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
        </div>

        <div className="rsp-wizard-total">
          <span className="rsp-wizard-total-label">{t("booking.summary.total")}</span>
          <span className="rsp-wizard-total-value">{formatPrice(totalPrice)}</span>
        </div>
      </div>

      {/* Payment Providers */}
      {isLoadingProviders ? (
        <div className="rsp-wizard-loading">
          {t("wizard.loadingPaymentProviders")}
        </div>
      ) : providersError ? (
        <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
          {providersError}
        </div>
      ) : availablePaymentProviders.length === 0 ? (
        <div className="rsp-wizard-alert rsp-wizard-alert--warning" role="alert">
          {t("wizard.noPaymentProvidersAvailable")}
        </div>
      ) : (
        <div
          className="rsp-wizard-payment-methods"
          role="radiogroup"
          aria-label={t("wizard.selectPaymentProvider")}
        >
          {availablePaymentProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              role="radio"
              aria-checked={selectedPaymentProvider?.id === provider.id}
              className={`rsp-wizard-payment-method ${selectedPaymentProvider?.id === provider.id
                ? "rsp-wizard-payment-method--selected"
                : ""
                }`}
              onClick={() => onSelectPaymentProvider(provider)}
              disabled={isSubmitting}
            >
              <div className="rsp-wizard-payment-method-logo">
                <Image
                  src={theme === "dark" ? provider.logoDark : provider.logoLight}
                  alt={provider.displayName}
                  width={80}
                  height={32}
                  style={{ objectFit: "contain" }}
                  onError={(e) => {
                    // Fallback to text display if logo fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              </div>
              <span className="rsp-wizard-payment-method-label">
                {provider.displayName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
