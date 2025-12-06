"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import {
  generateTimeOptions,
  getTodayDateString,
  DURATION_OPTIONS,
  isPeakHour,
  PlayerBookingStep1Data,
} from "./types";

interface Step1DateTimeProps {
  data: PlayerBookingStep1Data;
  onChange: (data: Partial<PlayerBookingStep1Data>) => void;
  estimatedPrice: number | null;
  isLoading?: boolean;
}

const TIME_OPTIONS = generateTimeOptions();

export function Step1DateTime({
  data,
  onChange,
  estimatedPrice,
  isLoading = false,
}: Step1DateTimeProps) {
  const t = useTranslations();
  const isPeak = isPeakHour(data.date, data.startTime);

  return (
    <div className="rsp-wizard-step-content" role="group" aria-labelledby="step1-title">
      <h2 className="rsp-wizard-step-title" id="step1-title">
        {t("wizard.step1Title")}
      </h2>

      <div className="rsp-wizard-form">
        {/* Date Input */}
        <div className="rsp-wizard-field">
          <label htmlFor="wizard-date" className="rsp-wizard-label">
            {t("common.date")}
          </label>
          <input
            id="wizard-date"
            type="date"
            className="rsp-wizard-input"
            value={data.date}
            onChange={(e) => onChange({ date: e.target.value })}
            min={getTodayDateString()}
            disabled={isLoading}
            aria-describedby={isPeak ? "peak-hint" : undefined}
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
              aria-describedby={isPeak ? "peak-hint" : undefined}
            />
          </div>

          <div className="rsp-wizard-field">
            <Select
              id="wizard-duration"
              label={t("common.duration")}
              options={DURATION_OPTIONS.map((mins) => ({
                value: String(mins),
                label: `${mins} ${t("common.minutes")}`,
              }))}
              value={String(data.duration)}
              onChange={(value) => onChange({ duration: parseInt(value, 10) })}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Peak hours hint */}
        {isPeak && (
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
            {estimatedPrice !== null ? (
              formatPrice(estimatedPrice)
            ) : (
              <span className="opacity-50">--</span>
            )}
          </div>
          <div className="rsp-wizard-price-estimate-hint">
            {t("wizard.priceVariesByTime")}
          </div>
        </div>
      </div>
    </div>
  );
}
