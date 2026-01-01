"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, TimeInput, DateInput, Checkbox, Tooltip } from "@/components/ui";
import "./SpecialHoursField.css";

export interface SpecialHour {
  id?: string;
  date: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  reason: string;
  _action?: 'create' | 'update' | 'delete'; // Track operation type
}

interface SpecialHoursFieldProps {
  value: SpecialHour[];
  onChange: (hours: SpecialHour[]) => void;
  disabled?: boolean;
}

export function SpecialHoursField({ value, onChange, disabled }: SpecialHoursFieldProps) {
  const t = useTranslations("clubDetail");

  const handleAdd = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    onChange([
      ...value,
      {
        date: today,
        openTime: null,
        closeTime: null,
        isClosed: true,
        reason: "",
        _action: 'create', // Mark as new
      },
    ]);
  }, [value, onChange]);

  const handleRemove = useCallback((index: number) => {
    const hourToRemove = value[index];

    // If it has an ID (existing item), mark it for deletion instead of removing immediately
    if (hourToRemove.id) {
      onChange(value.map((hour, i) =>
        i === index ? { ...hour, _action: 'delete' as const } : hour
      ));
    } else {
      // If no ID (new item), just remove it from the array
      onChange(value.filter((_, i) => i !== index));
    }
  }, [value, onChange]);

  const handleChange = useCallback(
    (index: number, field: keyof SpecialHour, newValue: string | boolean) => {
      const newHours = value.map((hour, i) => {
        if (i !== index) return hour;

        const updatedHour = { ...hour };

        // Mark as updated if it has an ID and not already marked for action
        if (hour.id && !hour._action) {
          updatedHour._action = 'update';
        }

        if (field === "isClosed") {
          updatedHour.isClosed = newValue as boolean;
          updatedHour.openTime = newValue ? null : "09:00";
          updatedHour.closeTime = newValue ? null : "21:00";
        } else if (field === "date") {
          updatedHour.date = newValue as string;
        } else if (field === "openTime") {
          updatedHour.openTime = newValue as string | null;
        } else if (field === "closeTime") {
          updatedHour.closeTime = newValue as string | null;
        } else if (field === "reason") {
          updatedHour.reason = newValue as string;
        }
        // Ignore _action and id fields as they are not user-editable

        return updatedHour;
      });
      onChange(newHours);
    },
    [value, onChange]
  );

  return (
    <div className="im-special-hours">
      <div className="im-special-hours-header">
        <h3 className="im-special-hours-title">{t("specialDateOverrides")}</h3>
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={disabled}
          className="im-special-hours-add-btn"
        >
          + {t("addDate")}
        </Button>
      </div>
      {value.length > 0 ? (
        <div className="im-special-hours-list">
          {value.map((hour, index) => {
            // Skip rendering items marked for deletion
            if (hour._action === 'delete') return null;

            return (
              <div key={hour.id || index} className="im-special-hours-row">
                <div className="im-special-hours-row-top">
                  <div className="im-special-hours-date-field">
                    <DateInput
                      value={hour.date}
                      onChange={(date) => handleChange(index, "date", date)}
                      placeholder={t("selectDate")}
                      aria-label={t("date")}
                    />
                  </div>

                  <div className="im-special-hours-times-wrapper">
                    {hour.isClosed ? '' : (
                      <Tooltip
                        content={t("workingHoursTooltip")}
                        position="top"
                      >
                        <div className="im-special-hours-times">
                          <TimeInput
                            value={hour.openTime || ""}
                            onChange={(e) => handleChange(index, "openTime", e.target.value)}
                            disabled={disabled}
                          />
                          <span className="im-special-hours-separator">{t("to")}</span>
                          <TimeInput
                            value={hour.closeTime || ""}
                            onChange={(e) => handleChange(index, "closeTime", e.target.value)}
                            disabled={disabled}
                          />
                        </div>
                      </Tooltip>
                    )}
                  </div>

                  <div className="im-special-hours-toggle">
                    <Checkbox
                      checked={hour.isClosed}
                      onChange={(e) => handleChange(index, "isClosed", e.target.checked)}
                      disabled={disabled}
                      label={t("closed")}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemove(index)}
                    disabled={disabled}
                    className="im-special-hours-remove-btn"
                  >
                    ✕
                  </Button>
                </div>

                <div className="im-special-hours-row-bottom">
                  <div className="im-special-hours-reason-field">
                    <Input
                      placeholder={t("reason")}
                      value={hour.reason}
                      onChange={(e) => handleChange(index, "reason", e.target.value)}
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="im-special-hours-empty">{t("noSpecialHours")}</p>
      )}
    </div>
  );
}
