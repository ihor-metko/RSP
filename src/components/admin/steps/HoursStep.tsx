"use client";

import { useCallback } from "react";
import { WorkingHoursEditor } from "@/components/admin/WorkingHoursEditor.client";
import type { SpecialHour } from "@/components/admin/SpecialHoursField.client";
import type { BusinessHour } from "@/types/admin";

export type { BusinessHour, SpecialHour };

export interface HoursData {
  businessHours: BusinessHour[];
  specialHours?: SpecialHour[];
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

  const handleSpecialHoursChange = useCallback(
    (hours: SpecialHour[]) => {
      onChange({ specialHours: hours });
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
      <WorkingHoursEditor
        businessHours={data.businessHours}
        specialHours={data.specialHours || []}
        onBusinessHoursChange={handleBusinessHoursChange}
        onSpecialHoursChange={handleSpecialHoursChange}
        disabled={disabled}
        showSpecialHours={true}
      />
    </div>
  );
}
