"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import "./MobileViews.css";

interface BookingConfirmMobileViewProps {
  isSuccess?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onNewBooking?: () => void;
}

/**
 * BookingConfirmMobileView
 * 
 * Mobile-first booking confirmation skeleton.
 * Shows placeholder summary card with booking details.
 * Displays success state after confirmation.
 * 
 * This is a placeholder skeleton - no actual booking logic implemented.
 */
export function BookingConfirmMobileView({
  isSuccess = false,
  onConfirm,
  onCancel,
  onNewBooking,
}: BookingConfirmMobileViewProps) {
  const t = useTranslations();

  if (isSuccess) {
    return (
      <div className="im-mobile-booking-confirm">
        {/* Success State */}
        <div className="im-mobile-booking-success">
          <div className="im-mobile-booking-success-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22,4 12,14.01 9,11.01" />
            </svg>
          </div>
          <h1 className="im-mobile-booking-success-title">
            {t("booking.successTitle")}
          </h1>
          <p className="im-mobile-booking-success-message">
            {t("booking.successMessage")}
          </p>

          {/* Booking Reference Placeholder */}
          <div className="im-mobile-booking-success-reference">
            <span className="im-mobile-booking-success-reference-label">
              {t("booking.referenceNumber")}
            </span>
            <span className="im-mobile-booking-success-reference-value">
              #ABC123
            </span>
          </div>

          {/* Actions */}
          <div className="im-mobile-booking-success-actions">
            {onNewBooking && (
              <Button
                onClick={onNewBooking}
                className="im-mobile-booking-success-btn"
              >
                {t("booking.bookAnother")}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="im-mobile-booking-confirm">
      {/* Header */}
      <div className="im-mobile-booking-header">
        <h1 className="im-mobile-booking-title">
          {t("booking.confirmTitle")}
        </h1>
        <p className="im-mobile-booking-subtitle">
          {t("booking.confirmSubtitle")}
        </p>
      </div>

      {/* Summary Card */}
      <div className="im-mobile-booking-summary">
        <h2 className="im-mobile-booking-summary-title">
          {t("booking.bookingDetails")}
        </h2>

        {/* Club Info Placeholder */}
        <div className="im-mobile-booking-summary-section">
          <div className="im-mobile-booking-summary-label">
            {t("booking.club")}
          </div>
          <div className="im-mobile-booking-summary-value">
            {t("booking.clubPlaceholder")}
          </div>
        </div>

        {/* Court Info Placeholder */}
        <div className="im-mobile-booking-summary-section">
          <div className="im-mobile-booking-summary-label">
            {t("booking.court")}
          </div>
          <div className="im-mobile-booking-summary-value">
            {t("booking.courtPlaceholder")}
          </div>
        </div>

        {/* Date Placeholder */}
        <div className="im-mobile-booking-summary-section">
          <div className="im-mobile-booking-summary-label">
            {t("booking.date")}
          </div>
          <div className="im-mobile-booking-summary-value">
            {t("booking.datePlaceholder")}
          </div>
        </div>

        {/* Time Placeholder */}
        <div className="im-mobile-booking-summary-section">
          <div className="im-mobile-booking-summary-label">
            {t("booking.time")}
          </div>
          <div className="im-mobile-booking-summary-value">
            {t("booking.timePlaceholder")}
          </div>
        </div>

        {/* Price Placeholder */}
        <div className="im-mobile-booking-summary-section im-mobile-booking-summary-total">
          <div className="im-mobile-booking-summary-label">
            {t("booking.total")}
          </div>
          <div className="im-mobile-booking-summary-value">
            {t("booking.pricePlaceholder")}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="im-mobile-booking-actions">
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            className="im-mobile-booking-cancel-btn"
          >
            {t("common.cancel")}
          </Button>
        )}
        {onConfirm && (
          <Button
            onClick={onConfirm}
            className="im-mobile-booking-confirm-btn"
          >
            {t("booking.confirmBooking")}
          </Button>
        )}
      </div>
    </div>
  );
}
