"use client";

import { useCallback } from "react";
import { Checkbox } from "@/components/ui";
import type { BusinessHour } from "@/types/admin";
import { DAY_NAMES } from "@/constants/workingHours";
import "./BusinessHoursField.css";

interface BusinessHoursFieldProps {
  value: BusinessHour[];
  onChange: (hours: BusinessHour[]) => void;
  disabled?: boolean;
}

export function BusinessHoursField({ value, onChange, disabled }: BusinessHoursFieldProps) {
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
        {value.map((hour) => (
          <div key={hour.dayOfWeek} className="im-business-hours-row">
            <span className="im-business-hours-day">
              {DAY_NAMES[hour.dayOfWeek]}
            </span>
            
            <div className="im-business-hours-times">
              {hour.isClosed ? (
                <span className="im-business-hours-closed-text">Closed</span>
              ) : (
                <>
                  <input
                    type="time"
                    value={hour.openTime || ""}
                    onChange={(e) => handleTimeChange(hour.dayOfWeek, "openTime", e.target.value)}
                    className="im-business-hours-input"
                    disabled={disabled}
                    aria-label={`${DAY_NAMES[hour.dayOfWeek]} opening time`}
                  />
                  <span className="im-business-hours-separator">to</span>
                  <input
                    type="time"
                    value={hour.closeTime || ""}
                    onChange={(e) => handleTimeChange(hour.dayOfWeek, "closeTime", e.target.value)}
                    className="im-business-hours-input"
                    disabled={disabled}
                    aria-label={`${DAY_NAMES[hour.dayOfWeek]} closing time`}
                  />
                </>
              )}
            </div>

            <div className="im-business-hours-toggle">
              <Checkbox
                label="Closed"
                checked={hour.isClosed}
                onChange={() => handleClosedToggle(hour.dayOfWeek)}
                disabled={disabled}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
