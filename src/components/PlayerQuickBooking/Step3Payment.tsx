"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/utils/price";
import {
  PaymentMethod,
  BookingCourt,
  BookingClub,
  formatDateDisplay,
  formatTimeDisplay,
  calculateEndTime,
} from "./types";

interface Step3PaymentProps {
  club: BookingClub | null;
  date: string;
  startTime: string;
  duration: number;
  court: BookingCourt | null;
  totalPrice: number;
  selectedPaymentMethod: PaymentMethod | null;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  isSubmitting: boolean;
  submitError: string | null;
  onReservationCreated?: (reservationId: string, expiresAt: string) => void;
  onReservationExpired?: () => void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
  {
    id: "card",
    label: "wizard.payWithCard",
    disabled: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: "apple_pay",
    label: "wizard.applePay",
    disabled: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.0425 7.97573C17.0008 7.98573 15.9808 8.31073 15.9808 9.57823C15.9808 11.0407 17.3225 11.5507 17.365 11.5607C17.3558 11.5907 17.1283 12.3782 16.5467 13.1957C16.0392 13.8982 15.5075 14.5982 14.6817 14.5982C13.8558 14.5982 13.6167 14.1232 12.6617 14.1232C11.7292 14.1232 11.3742 14.6182 10.6175 14.6182C9.86083 14.6182 9.34083 13.9582 8.75333 13.1582C8.06083 12.2007 7.5 10.7282 7.5 9.33323C7.5 7.19823 8.90833 6.06573 10.295 6.06573C11.1017 6.06573 11.7742 6.58573 12.2733 6.58573C12.75 6.58573 13.5058 6.04573 14.4333 6.04573C14.7683 6.04573 16.0392 6.06573 16.9825 7.28323C16.9117 7.32073 17.085 7.96573 17.0425 7.97573ZM14.375 4.79573C14.755 4.34073 15.02 3.70573 15.02 3.07073C15.02 2.98323 15.0117 2.89573 15 2.82323C14.3825 2.84573 13.6417 3.22573 13.195 3.74573C12.8475 4.14573 12.5275 4.78073 12.5275 5.42573C12.5275 5.52323 12.5425 5.62073 12.5533 5.65573C12.5992 5.66573 12.6717 5.67823 12.7442 5.67823C13.2967 5.67823 13.9683 5.31573 14.375 4.79573Z" />
      </svg>
    ),
  },
  {
    id: "google_pay",
    label: "wizard.googlePay",
    disabled: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.48 10.92V13.97H16.74C16.53 15.13 15.38 17.32 12.48 17.32C9.97 17.32 7.9 15.22 7.9 12.5C7.9 9.78 9.97 7.68 12.48 7.68C13.99 7.68 15 8.33 15.6 8.89L17.87 6.71C16.33 5.27 14.37 4.5 12.48 4.5C8.32 4.5 4.9 7.92 4.9 12.08C4.9 16.24 8.32 19.66 12.48 19.66C16.95 19.66 19.94 16.43 19.94 12.08C19.94 11.58 19.9 11.2 19.82 10.82H12.48V10.92Z" />
      </svg>
    ),
  },
];

export function Step3Payment({
  club,
  date,
  startTime,
  duration,
  court,
  totalPrice,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  isSubmitting,
  submitError,
  onReservationCreated,
  onReservationExpired,
}: Step3PaymentProps) {
  const t = useTranslations();
  const endTime = calculateEndTime(startTime, duration);
  
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservationExpiresAt, setReservationExpiresAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);

  // Create reservation on mount
  useEffect(() => {
    const createReservation = async () => {
      if (!court || reservationId) return;

      setIsCreatingReservation(true);
      setReservationError(null);

      try {
        const startDateTime = `${date}T${startTime}:00.000Z`;
        const endDateTime = `${date}T${endTime}:00.000Z`;

        const response = await fetch("/api/bookings/reserve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            courtId: court.id,
            startTime: startDateTime,
            endTime: endDateTime,
            userId: "current-user", // Will be resolved by the API from session
          }),
        });

        const data = await response.json();

        if (response.status === 409) {
          setReservationError(t("booking.slotNoLongerAvailable"));
          onReservationExpired?.();
          return;
        }

        if (!response.ok) {
          setReservationError(data.error || t("auth.errorOccurred"));
          return;
        }

        setReservationId(data.reservationId);
        setReservationExpiresAt(data.expiresAt);
        onReservationCreated?.(data.reservationId, data.expiresAt);
      } catch {
        setReservationError(t("auth.errorOccurred"));
      } finally {
        setIsCreatingReservation(false);
      }
    };

    createReservation();
  }, [court, date, startTime, endTime, reservationId, t, onReservationCreated, onReservationExpired]);

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

  if (isCreatingReservation) {
    return (
      <div className="rsp-wizard-step-content">
        <h2 className="rsp-wizard-step-title">{t("wizard.step3Title")}</h2>
        <div className="rsp-wizard-loading" aria-busy="true" aria-live="polite">
          <div className="rsp-wizard-spinner" role="progressbar" />
          <span className="rsp-wizard-loading-text">{t("wizard.reservingSlot")}</span>
        </div>
      </div>
    );
  }

  if (reservationError) {
    return (
      <div className="rsp-wizard-step-content">
        <h2 className="rsp-wizard-step-title">{t("wizard.step3Title")}</h2>
        <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
          {reservationError}
        </div>
      </div>
    );
  }

  return (
    <div className="rsp-wizard-step-content" role="group" aria-labelledby="step3-title">
      <h2 className="rsp-wizard-step-title" id="step3-title">
        {t("wizard.step3Title")}
      </h2>

      {/* Reservation Timer */}
      {reservationId && timeRemaining > 0 && (
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
              <span className="rsp-wizard-summary-label">{t("wizard.club")}</span>
              <span className="rsp-wizard-summary-value">{club.name}</span>
            </div>
          )}
          <div className="rsp-wizard-summary-row">
            <span className="rsp-wizard-summary-label">{t("common.date")}</span>
            <span className="rsp-wizard-summary-value">{formatDateDisplay(date)}</span>
          </div>
          <div className="rsp-wizard-summary-row">
            <span className="rsp-wizard-summary-label">{t("common.time")}</span>
            <span className="rsp-wizard-summary-value">
              {formatTimeDisplay(startTime, endTime)}
            </span>
          </div>
          <div className="rsp-wizard-summary-row">
            <span className="rsp-wizard-summary-label">{t("common.duration")}</span>
            <span className="rsp-wizard-summary-value">
              {duration} {t("common.minutes")}
            </span>
          </div>
          {court && (
            <div className="rsp-wizard-summary-row">
              <span className="rsp-wizard-summary-label">{t("wizard.court")}</span>
              <span className="rsp-wizard-summary-value">{court.name}</span>
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
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.id}
            type="button"
            role="radio"
            aria-checked={selectedPaymentMethod === method.id}
            aria-disabled={method.disabled}
            className={`rsp-wizard-payment-method ${
              selectedPaymentMethod === method.id
                ? "rsp-wizard-payment-method--selected"
                : ""
            } ${method.disabled ? "rsp-wizard-payment-method--disabled" : ""}`}
            onClick={() => !method.disabled && onSelectPaymentMethod(method.id)}
            disabled={isSubmitting || method.disabled}
          >
            <span aria-hidden="true">{method.icon}</span>
            <span className="rsp-wizard-payment-method-label">
              {t(method.label)}
            </span>
            {method.disabled && (
              <span className="rsp-wizard-payment-method-badge">
                {t("wizard.comingSoon")}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
