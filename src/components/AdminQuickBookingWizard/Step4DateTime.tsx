"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui";
import {
  WizardStepDateTime,
  generateTimeOptions,
  DURATION_OPTIONS,
  getTodayDateString,
} from "./types";

const TIME_OPTIONS = generateTimeOptions();

interface Step4DateTimeProps {
  data: WizardStepDateTime;
  onChange: (data: Partial<WizardStepDateTime>) => void;
  isLoading?: boolean;
}

export function Step4DateTime({
  data,
  onChange,
  isLoading = false,
}: Step4DateTimeProps) {
  const t = useTranslations();

  return (
    <div className="rsp-admin-wizard-step">
      <div className="rsp-admin-wizard-step-header">
        <h3 className="rsp-admin-wizard-step-title">
          {t("adminWizard.selectDateTime")}
        </h3>
        <p className="rsp-admin-wizard-step-description">
          {t("adminWizard.selectDateTimeDescription")}
        </p>
      </div>

      <div className="rsp-admin-wizard-step-content">
        <div className="rsp-admin-wizard-date-time-grid">
          {/* Date picker */}
          <div className="rsp-booking-select-wrapper">
            <label
              htmlFor="admin-booking-date"
              className="rsp-booking-label"
            >
              {t("common.date")}
            </label>
            <input
              id="admin-booking-date"
              type="date"
              className="rsp-booking-select"
              value={data.date}
              onChange={(e) => onChange({ date: e.target.value })}
              min={getTodayDateString()}
              disabled={isLoading}
            />
          </div>

          {/* Time picker */}
          <Select
            id="admin-booking-time"
            label={t("booking.quickBooking.startTime")}
            options={TIME_OPTIONS.map((time) => ({
              value: time,
              label: time,
            }))}
            value={data.startTime}
            onChange={(value) => onChange({ startTime: value })}
            disabled={isLoading}
            className="rsp-booking-select"
          />

          {/* Duration picker */}
          <Select
            id="admin-booking-duration"
            label={t("common.duration")}
            options={DURATION_OPTIONS.map((mins) => ({
              value: String(mins),
              label: `${mins} ${t("common.minutes")}`,
            }))}
            value={String(data.duration)}
            onChange={(value) => onChange({ duration: parseInt(value, 10) })}
            disabled={isLoading}
            className="rsp-booking-select"
          />
        </div>
      </div>
    </div>
  );
}
