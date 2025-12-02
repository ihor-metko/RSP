"use client";

import { useCallback } from "react";
import { BusinessHoursField } from "@/components/admin/BusinessHoursField.client";

export interface BusinessHour {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export interface HoursData {
  businessHours: BusinessHour[];
}

interface HoursStepProps {
  data: HoursData;
  onChange: (data: Partial<HoursData>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function HoursStep({
  data,
  onChange,
  errors = {},
  disabled = false,
}: HoursStepProps) {
  const handleBusinessHoursChange = useCallback(
    (hours: BusinessHour[]) => {
      onChange({ businessHours: hours });
    },
    [onChange]
  );

  return (
    <div className="im-step-content">
      {errors.businessHours && (
        <div className="im-stepper-field-error im-stepper-error-block">
          {errors.businessHours}
        </div>
      )}
      <BusinessHoursField
        value={data.businessHours}
        onChange={handleBusinessHoursChange}
        disabled={disabled}
      />
    </div>
  );
}
