"use client";

import { useTranslations } from "next-intl";
import { Select, DateInput } from "@/components/ui";
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
  estimatedPriceRange?: { min: number; max: number } | null;
  isLoading?: boolean;
}

const TIME_OPTIONS = generateTimeOptions();

export function Step1DateTime({
  data,
  onChange,
  estimatedPrice,
  estimatedPriceRange,
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
              aria-describedby={isPeak ? "peak-hint" : undefined}
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
                return {
                  value: String(mins),
                  label,
                };
              })}
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
            {estimatedPriceRange && estimatedPriceRange.min !== estimatedPriceRange.max ? (
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
            {estimatedPriceRange && estimatedPriceRange.min !== estimatedPriceRange.max
              ? t("wizard.priceRangeHint")
              : t("wizard.priceVariesByTime")}
          </div>
        </div>
      </div>
    </div>
  );
}
