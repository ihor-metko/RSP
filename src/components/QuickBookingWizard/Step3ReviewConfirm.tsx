"use client";

import { useTranslations } from "next-intl";
import { formatPrice } from "@/utils/price";
import {
  WizardCourt,
  formatDateDisplay,
  formatTimeDisplay,
  calculateEndTime,
} from "./types";

interface Step3ReviewConfirmProps {
  date: string;
  startTime: string;
  duration: number;
  court: WizardCourt | null;
  totalPrice: number;
  submitError: string | null;
}

export function Step3ReviewConfirm({
  date,
  startTime,
  duration,
  court,
  totalPrice,
  submitError,
}: Step3ReviewConfirmProps) {
  const t = useTranslations();
  const endTime = calculateEndTime(startTime, duration);

  return (
    <div className="rsp-wizard-step-content" role="group" aria-labelledby="step3-title">
      <h3 id="step3-title" className="rsp-wizard-step-title">
        {t("wizard.reviewAndConfirm")}
      </h3>

      <p className="rsp-wizard-step-description">
        {t("wizard.reviewBookingDetails")}
      </p>

      {submitError && (
        <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
          {submitError}
        </div>
      )}

      {/* Booking Summary */}
      <div className="rsp-wizard-summary">
        <div className="rsp-wizard-summary-card">
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
            <>
              <div className="rsp-wizard-summary-row">
                <span className="rsp-wizard-summary-label">{t("wizard.court")}</span>
                <span className="rsp-wizard-summary-value">{court.name}</span>
              </div>
              {court.type && (
                <div className="rsp-wizard-summary-row">
                  <span className="rsp-wizard-summary-label">{t("wizard.courtType")}</span>
                  <span className="rsp-wizard-summary-value">{court.type}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rsp-wizard-total">
          <span className="rsp-wizard-total-label">{t("wizard.total")}</span>
          <span className="rsp-wizard-total-value">{formatPrice(totalPrice)}</span>
        </div>
      </div>
    </div>
  );
}
