"use client";

import { BusinessHoursField } from "./BusinessHoursField.client";
import { SpecialHoursField, type SpecialHour } from "./SpecialHoursField.client";
import type { BusinessHour } from "@/types/admin";
import { DAY_NAMES } from "@/constants/workingHours";
import "./WorkingHoursEditor.css";

export interface WorkingHoursEditorProps {
  businessHours: BusinessHour[];
  specialHours?: SpecialHour[];
  onBusinessHoursChange: (hours: BusinessHour[]) => void;
  onSpecialHoursChange?: (hours: SpecialHour[]) => void;
  disabled?: boolean;
  showSpecialHours?: boolean;
}

export function WorkingHoursEditor({
  businessHours,
  specialHours = [],
  onBusinessHoursChange,
  onSpecialHoursChange,
  disabled = false,
  showSpecialHours = true,
}: WorkingHoursEditorProps) {
  return (
    <div className="im-working-hours-editor">
      <div className="im-working-hours-section">
        <h3 className="im-working-hours-section-title">Weekly Schedule</h3>
        <BusinessHoursField
          value={businessHours}
          onChange={onBusinessHoursChange}
          disabled={disabled}
        />
      </div>

      {showSpecialHours && onSpecialHoursChange && (
        <div className="im-working-hours-section">
          <SpecialHoursField
            value={specialHours}
            onChange={onSpecialHoursChange}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Validates business hours
 * @returns error message if validation fails, null otherwise
 */
export function validateBusinessHours(hours: BusinessHour[]): string | null {
  for (const hour of hours) {
    if (!hour.isClosed && hour.openTime && hour.closeTime) {
      if (hour.openTime >= hour.closeTime) {
        return `Invalid hours for ${DAY_NAMES[hour.dayOfWeek]}: opening time must be before closing time`;
      }
    }
  }
  return null;
}

/**
 * Validates special hours
 * @param hours - Array of special hours to validate
 * @param t - Optional translation function for error messages
 * @returns error message if validation fails, null otherwise
 */
export function validateSpecialHours(
  hours: SpecialHour[],
  t?: (key: string, params?: Record<string, string>) => string
): string | null {
  // Check for duplicate dates
  const dates = hours.map((h) => h.date);
  const uniqueDates = new Set(dates);
  if (dates.length !== uniqueDates.size) {
    return t ? t("duplicateDates") : "Duplicate dates in special hours";
  }

  // Validate each special hour
  for (const hour of hours) {
    if (!hour.isClosed && hour.openTime && hour.closeTime) {
      if (hour.openTime >= hour.closeTime) {
        return t 
          ? t("invalidSpecialHours", { date: hour.date })
          : `Invalid special hours for ${hour.date}: opening time must be before closing time`;
      }
    }
  }
  
  return null;
}

/**
 * Validates all working hours (both business and special)
 * @returns error message if validation fails, null otherwise
 */
export function validateWorkingHours(
  businessHours: BusinessHour[],
  specialHours: SpecialHour[]
): string | null {
  const businessError = validateBusinessHours(businessHours);
  if (businessError) return businessError;

  const specialError = validateSpecialHours(specialHours);
  if (specialError) return specialError;

  return null;
}
