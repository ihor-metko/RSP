"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, TimeInput } from "@/components/ui";
import "./SpecialHoursField.css";

export interface SpecialHour {
  id?: string;
  date: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  reason: string;
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
      },
    ]);
  }, [value, onChange]);

  const handleRemove = useCallback((index: number) => {
    onChange(value.filter((_, i) => i !== index));
  }, [value, onChange]);

  const handleChange = useCallback(
    (index: number, field: keyof SpecialHour, newValue: string | boolean) => {
      const newHours = value.map((hour, i) => {
        if (i !== index) return hour;
        if (field === "isClosed") {
          return {
            ...hour,
            isClosed: newValue as boolean,
            openTime: newValue ? null : "09:00",
            closeTime: newValue ? null : "21:00",
          };
        }
        return { ...hour, [field]: newValue || null };
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
          {value.map((hour, index) => (
            <div key={index} className="im-special-hours-row">
              <Input
                type="date"
                value={hour.date}
                onChange={(e) => handleChange(index, "date", e.target.value)}
                disabled={disabled}
              />
              <div className="im-special-hours-times">
                {hour.isClosed ? (
                  <span className="im-special-hours-closed-text">{t("closed")}</span>
                ) : (
                  <>
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
                  </>
                )}
              </div>
              <label className="im-special-hours-toggle">
                <input
                  type="checkbox"
                  checked={hour.isClosed}
                  onChange={(e) => handleChange(index, "isClosed", e.target.checked)}
                  disabled={disabled}
                />
                <span>{t("closed")}</span>
              </label>
              <Input
                placeholder={t("reason")}
                value={hour.reason}
                onChange={(e) => handleChange(index, "reason", e.target.value)}
                disabled={disabled}
              />
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
          ))}
        </div>
      ) : (
        <p className="im-special-hours-empty">{t("noSpecialHours")}</p>
      )}
    </div>
  );
}
