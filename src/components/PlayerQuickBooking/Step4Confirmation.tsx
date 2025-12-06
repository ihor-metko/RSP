"use client";

import { useTranslations } from "next-intl";
import { formatPrice } from "@/utils/price";
import {
  BookingCourt,
  BookingClub,
  formatDateDisplay,
  formatTimeDisplay,
  calculateEndTime,
} from "./types";

interface Step4ConfirmationProps {
  club: BookingClub | null;
  date: string;
  startTime: string;
  duration: number;
  court: BookingCourt | null;
  totalPrice: number;
  bookingId: string | null;
  onClose: () => void;
}

export function Step4Confirmation({
  club,
  date,
  startTime,
  duration,
  court,
  totalPrice,
  bookingId,
  onClose,
}: Step4ConfirmationProps) {
  const t = useTranslations();
  const endTime = calculateEndTime(startTime, duration);

  return (
    <div className="rsp-wizard-step-content">
      <div className="rsp-wizard-success" role="alert" aria-live="polite">
        <div className="rsp-wizard-success-icon" aria-hidden="true">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>
        <h2 className="rsp-wizard-success-title">
          {t("wizard.bookingConfirmed")}
        </h2>
        <p className="rsp-wizard-success-message">
          {t("wizard.bookingConfirmedMessage")}
        </p>
        
        {bookingId && (
          <p className="rsp-wizard-booking-ref">
            {t("wizard.bookingReference")}: <strong>{bookingId}</strong>
          </p>
        )}
      </div>

      {/* Booking Details Summary */}
      <div className="rsp-wizard-confirmation-summary">
        <h3 className="rsp-wizard-confirmation-title">{t("wizard.bookingDetails")}</h3>
        
        <div className="rsp-wizard-summary-card">
          {club && (
            <div className="rsp-wizard-summary-row">
              <span className="rsp-wizard-summary-label">{t("wizard.club")}</span>
              <span className="rsp-wizard-summary-value">{club.name}</span>
            </div>
          )}
          {court && (
            <div className="rsp-wizard-summary-row">
              <span className="rsp-wizard-summary-label">{t("wizard.court")}</span>
              <span className="rsp-wizard-summary-value">{court.name}</span>
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
          <div className="rsp-wizard-summary-row rsp-wizard-summary-row--total">
            <span className="rsp-wizard-summary-label">{t("wizard.totalPaid")}</span>
            <span className="rsp-wizard-summary-value">{formatPrice(totalPrice)}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="rsp-wizard-confirmation-actions">
        <button
          type="button"
          className="rsp-wizard-btn rsp-wizard-btn--primary"
          onClick={onClose}
        >
          {t("wizard.closeAndViewBookings")}
        </button>
      </div>
    </div>
  );
}
