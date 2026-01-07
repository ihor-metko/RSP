"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui";
import {
  WizardStepDateTime,
  generateTimeOptions,
  DURATION_OPTIONS,
  getTodayDateString,
} from "./types";
import { filterPastTimeSlots } from "@/utils/dateTime";

interface Step3DateTimeProps {
  data: WizardStepDateTime;
  onChange: (data: Partial<WizardStepDateTime>) => void;
  isLoading?: boolean;
  clubTimezone?: string | null;
}

export function Step3DateTime({
  data,
  onChange,
  isLoading = false,
  clubTimezone,
}: Step3DateTimeProps) {
  const t = useTranslations();

  // Filter time options to exclude past times for today
  // Pass club timezone to ensure correct filtering in club's local time
  const TIME_OPTIONS = filterPastTimeSlots(generateTimeOptions(), data.date, clubTimezone || undefined);
  const hasNoTimeSlots = TIME_OPTIONS.length === 0;
  const isToday = data.date === getTodayDateString();

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
            disabled={isLoading || hasNoTimeSlots}
            placeholder={t("booking.quickBooking.selectStartTime")}
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

        {/* Show warning when no time slots available for today */}
        {hasNoTimeSlots && isToday && (
          <div className="rsp-admin-wizard-warning" role="alert">
            {t("adminWizard.noTimeSlotsAvailable")}
          </div>
        )}
      </div>
    </div>
  );
}
