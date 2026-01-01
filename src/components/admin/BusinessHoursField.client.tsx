"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Checkbox, TimeInput } from "@/components/ui";
import type { BusinessHour } from "@/types/admin";
import { DAY_TRANSLATION_KEYS } from "@/constants/workingHours";
import "./BusinessHoursField.css";

interface BusinessHoursFieldProps {
  value: BusinessHour[];
  onChange: (hours: BusinessHour[]) => void;
  disabled?: boolean;
}

export function BusinessHoursField({ value, onChange, disabled }: BusinessHoursFieldProps) {
  const t = useTranslations();

  const handleTimeChange = useCallback((dayOfWeek: number, field: "openTime" | "closeTime", time: string) => {
    const newHours = value.map((hour) => {
      if (hour.dayOfWeek === dayOfWeek) {
        return {
          ...hour,
          [field]: time || null,
        };
      }
      return hour;
    });
    onChange(newHours);
  }, [value, onChange]);

  const handleClosedToggle = useCallback((dayOfWeek: number) => {
    const newHours = value.map((hour) => {
      if (hour.dayOfWeek === dayOfWeek) {
        return {
          ...hour,
          isClosed: !hour.isClosed,
          openTime: !hour.isClosed ? null : "09:00",
          closeTime: !hour.isClosed ? null : "21:00",
        };
      }
      return hour;
    });
    onChange(newHours);
  }, [value, onChange]);

  return (
    <div className="im-business-hours">
      <div className="im-business-hours-grid">
        {value.map((hour) => {
          const dayName = t(DAY_TRANSLATION_KEYS[hour.dayOfWeek]);
          return (
            <div key={hour.dayOfWeek} className="im-business-hours-row">
              <span className="im-business-hours-day">
                {dayName}
              </span>
              
              <div className="im-business-hours-times">
                {hour.isClosed ? (
                  <span className="im-business-hours-closed-text">{t("businessHours.closed")}</span>
                ) : (
                  <>
                    <TimeInput
                      value={hour.openTime || ""}
                      onChange={(e) => handleTimeChange(hour.dayOfWeek, "openTime", e.target.value)}
                      disabled={disabled}
                      aria-label={t("businessHours.openingTime", { day: dayName })}
                    />
                    <span className="im-business-hours-separator">{t("businessHours.to")}</span>
                    <TimeInput
                      value={hour.closeTime || ""}
                      onChange={(e) => handleTimeChange(hour.dayOfWeek, "closeTime", e.target.value)}
                      disabled={disabled}
                      aria-label={t("businessHours.closingTime", { day: dayName })}
                    />
                  </>
                )}
              </div>

              <div className="im-business-hours-toggle">
                <Checkbox
                  label={t("businessHours.closedLabel")}
                  checked={hour.isClosed}
                  onChange={() => handleClosedToggle(hour.dayOfWeek)}
                  disabled={disabled}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
