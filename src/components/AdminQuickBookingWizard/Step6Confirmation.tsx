"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import {
  formatDateDisplay,
  formatTimeDisplay,
  calculateEndTime,
} from "./types";
import type {
  WizardOrganization,
  WizardClub,
  WizardUser,
  WizardCourt,
  WizardStepDateTime,
  WizardStepConfirmation,
} from "./types";

interface Step6ConfirmationProps {
  organization: WizardOrganization | null;
  club: WizardClub | null;
  user: WizardUser | null;
  dateTime: WizardStepDateTime;
  court: WizardCourt | null;
  confirmation: WizardStepConfirmation;
  onNotesChange: (notes: string) => void;
  isSubmitting: boolean;
  submitError: string | null;
  isComplete: boolean;
  bookingId: string | null;
  totalPrice: number;
}

export function Step6Confirmation({
  organization,
  club,
  user,
  dateTime,
  court,
  confirmation,
  onNotesChange,
  isSubmitting,
  submitError,
  isComplete,
  bookingId,
  totalPrice,
}: Step6ConfirmationProps) {
  const t = useTranslations();

  if (isComplete) {
    return (
      <div className="rsp-admin-wizard-step">
        <div className="rsp-admin-wizard-success">
          <div className="rsp-admin-wizard-success-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="9,12 11,14 15,10" />
            </svg>
          </div>
          <h3 className="rsp-admin-wizard-success-title">
            {t("adminWizard.bookingCreated")}
          </h3>
          <p className="rsp-admin-wizard-success-message">
            {t("adminWizard.bookingCreatedMessage")}
          </p>
          {bookingId && (
            <p className="rsp-admin-wizard-booking-id">
              {t("adminWizard.bookingId")}: {bookingId.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  const endTime = calculateEndTime(dateTime.startTime, dateTime.duration);

  return (
    <div className="rsp-admin-wizard-step">
      <div className="rsp-admin-wizard-step-header">
        <h3 className="rsp-admin-wizard-step-title">
          {t("adminWizard.confirmBooking")}
        </h3>
        <p className="rsp-admin-wizard-step-description">
          {t("adminWizard.confirmBookingDescription")}
        </p>
      </div>

      <div className="rsp-admin-wizard-step-content">
        {submitError && (
          <div className="rsp-admin-wizard-error" role="alert">
            {submitError}
          </div>
        )}

        <div className="rsp-admin-wizard-summary">
          {/* Organization */}
          {organization && (
            <div className="rsp-admin-wizard-summary-item">
              <span className="rsp-admin-wizard-summary-label">
                {t("adminBookings.organization")}
              </span>
              <span className="rsp-admin-wizard-summary-value">
                {organization.name}
              </span>
            </div>
          )}

          {/* Club */}
          {club && (
            <div className="rsp-admin-wizard-summary-item">
              <span className="rsp-admin-wizard-summary-label">
                {t("adminBookings.club")}
              </span>
              <span className="rsp-admin-wizard-summary-value">
                {club.name}
              </span>
            </div>
          )}

          {/* User */}
          {user && (
            <div className="rsp-admin-wizard-summary-item">
              <span className="rsp-admin-wizard-summary-label">
                {t("adminWizard.bookingFor")}
              </span>
              <span className="rsp-admin-wizard-summary-value">
                {user.name ? `${user.name} (${user.email})` : user.email}
              </span>
            </div>
          )}

          {/* Date */}
          <div className="rsp-admin-wizard-summary-item">
            <span className="rsp-admin-wizard-summary-label">
              {t("common.date")}
            </span>
            <span className="rsp-admin-wizard-summary-value">
              {formatDateDisplay(dateTime.date)}
            </span>
          </div>

          {/* Time */}
          <div className="rsp-admin-wizard-summary-item">
            <span className="rsp-admin-wizard-summary-label">
              {t("common.time")}
            </span>
            <span className="rsp-admin-wizard-summary-value">
              {formatTimeDisplay(dateTime.startTime, endTime)}
            </span>
          </div>

          {/* Duration */}
          <div className="rsp-admin-wizard-summary-item">
            <span className="rsp-admin-wizard-summary-label">
              {t("common.duration")}
            </span>
            <span className="rsp-admin-wizard-summary-value">
              {dateTime.duration} {t("common.minutes")}
            </span>
          </div>

          {/* Court */}
          {court && (
            <div className="rsp-admin-wizard-summary-item">
              <span className="rsp-admin-wizard-summary-label">
                {t("adminBookings.court")}
              </span>
              <span className="rsp-admin-wizard-summary-value">
                {court.name}
                {court.type && ` - ${court.type}`}
              </span>
            </div>
          )}

          {/* Price */}
          <div className="rsp-admin-wizard-summary-item rsp-admin-wizard-summary-item--total">
            <span className="rsp-admin-wizard-summary-label">
              {t("common.totalPrice")}
            </span>
            <span className="rsp-admin-wizard-summary-value rsp-admin-wizard-summary-value--price">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>

        {/* Notes field */}
        <div className="rsp-admin-wizard-notes">
          <Input
            id="booking-notes"
            label={t("adminWizard.bookingNotes")}
            type="text"
            value={confirmation.notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={t("adminWizard.bookingNotesPlaceholder")}
            disabled={isSubmitting}
          />
          <p className="rsp-admin-wizard-notes-hint">
            {t("adminWizard.bookingNotesHint")}
          </p>
        </div>

        <div className="rsp-admin-wizard-payment-notice">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{t("adminWizard.noPaymentRequired")}</span>
        </div>
      </div>
    </div>
  );
}
