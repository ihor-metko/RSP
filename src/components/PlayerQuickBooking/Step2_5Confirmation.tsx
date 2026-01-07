"use client";

import { useTranslations } from "next-intl";
import { formatPrice } from "@/utils/price";
import {
  BookingCourt,
  BookingClub,
  calculateEndTime,
} from "./types";

interface Step2_5ConfirmationProps {
  club: BookingClub | null;
  date: string;
  startTime: string;
  duration: number;
  court: BookingCourt | null;
  totalPrice: number;
  submitError?: string | null;
  readOnlyMode?: boolean; // Indicates step is locked (resume payment flow)
}

// Format date for display
export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format time for display
export function formatTimeDisplay(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

export function Step2_5Confirmation({
  club,
  date,
  startTime,
  duration,
  court,
  totalPrice,
  submitError,
  readOnlyMode = false,
}: Step2_5ConfirmationProps) {
  const t = useTranslations();
  const endTime = calculateEndTime(startTime, duration);

  return (
    <div className="rsp-wizard-step-content" role="group" aria-labelledby="step2_5-title">
      <h2 className="rsp-wizard-step-title" id="step2_5-title">
        {t("wizard.confirmBookingDetails")}
      </h2>

      <p className="rsp-wizard-step-description">
        {t("wizard.confirmBookingDetailsDescription")}
      </p>

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
          <span className="rsp-wizard-total-label">{t("wizard.estimatedPrice")}</span>
          <span className="rsp-wizard-total-value">{formatPrice(totalPrice)}</span>
        </div>

        <p className="rsp-wizard-price-note">
          {t("wizard.priceConfirmed")}
        </p>
      </div>
    </div>
  );
}
