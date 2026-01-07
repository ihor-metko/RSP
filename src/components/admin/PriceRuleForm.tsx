"use client";

import { useState } from "react";
import { Button, Input, Select, TimeInput, DateInput } from "@/components/ui";
import { centsToDollars, dollarsToCents } from "@/utils/price";
import { timeOfDayToUTC } from "@/utils/dateTime";
import { getClubTimezone } from "@/constants/timezone";

export interface PriceRuleFormData {
  ruleType: string;
  dayOfWeek: number | null;
  date: string | null;
  holidayId: string | null;
  startTime: string;
  endTime: string;
  priceCents: number;
}

interface PriceRuleFormProps {
  initialValues?: Partial<PriceRuleFormData>;
  onSubmit: (data: PriceRuleFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  holidays?: Array<{ id: string; name: string; date: string }>;
  clubTimezone?: string | null;
}

const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const RULE_TYPE_OPTIONS = [
  { value: "SPECIFIC_DAY", label: "Specific Day of Week" },
  { value: "WEEKDAYS", label: "All Weekdays (Mon-Fri)" },
  { value: "WEEKENDS", label: "All Weekends (Sat-Sun)" },
  { value: "SPECIFIC_DATE", label: "Specific Date" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "ALL_DAYS", label: "All Days" },
];

export function PriceRuleForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  holidays = [],
  clubTimezone,
}: PriceRuleFormProps) {
  const [formData, setFormData] = useState<PriceRuleFormData>({
    ruleType: initialValues?.ruleType || "SPECIFIC_DAY",
    dayOfWeek: initialValues?.dayOfWeek ?? 1, // Default to Monday
    date: initialValues?.date ?? null,
    holidayId: initialValues?.holidayId ?? null,
    startTime: initialValues?.startTime || "09:00",
    endTime: initialValues?.endTime || "10:00",
    priceCents: initialValues?.priceCents ?? 0,
  });

  const [error, setError] = useState("");
  
  // Get club timezone with fallback
  const timezone = getClubTimezone(clubTimezone);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "dayOfWeek" ? parseInt(value, 10) : value,
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData((prev) => ({
      ...prev,
      priceCents: dollarsToCents(value),
    }));
  };

  const handleRuleTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      ruleType: value,
      // Reset fields based on rule type
      dayOfWeek: value === "SPECIFIC_DAY" ? (prev.dayOfWeek ?? 1) : null,
      date: value === "SPECIFIC_DATE" ? (prev.date || new Date().toISOString().split("T")[0]) : null,
      holidayId: value === "HOLIDAY" ? (prev.holidayId || (holidays[0]?.id ?? null)) : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate start time < end time
    if (formData.startTime >= formData.endTime) {
      setError("Start time must be before end time");
      return;
    }

    // Validate price is positive
    if (formData.priceCents <= 0) {
      setError("Price must be greater than 0");
      return;
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.startTime) || !timeRegex.test(formData.endTime)) {
      setError("Invalid time format. Use HH:MM format");
      return;
    }

    // Validate date for date-specific rules
    if (formData.ruleType === "SPECIFIC_DATE" && !formData.date) {
      setError("Date is required for date-specific rules");
      return;
    }

    // Validate holiday for holiday rules
    if (formData.ruleType === "HOLIDAY" && !formData.holidayId) {
      setError("Holiday is required for holiday rules");
      return;
    }

    try {
      // Convert club-local times to UTC before sending to API
      // Use specific date for SPECIFIC_DATE rules to handle DST correctly
      const referenceDate = formData.ruleType === "SPECIFIC_DATE" && formData.date && formData.date.trim()
        ? formData.date
        : undefined;
      
      const dataToSubmit: PriceRuleFormData = {
        ...formData,
        startTime: timeOfDayToUTC(formData.startTime, timezone, referenceDate),
        endTime: timeOfDayToUTC(formData.endTime, timezone, referenceDate),
      };
      
      await onSubmit(dataToSubmit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save price rule");
    }
  };

  const displayPrice = centsToDollars(formData.priceCents).toFixed(2);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
          {error}
        </div>
      )}

      {/* Rule Type Selection */}
      <Select
        id="ruleType"
        label="Rule Type"
        options={RULE_TYPE_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        }))}
        value={formData.ruleType}
        onChange={handleRuleTypeChange}
        disabled={isSubmitting}
      />

      {/* Day of Week Select (for SPECIFIC_DAY rules) */}
      {formData.ruleType === "SPECIFIC_DAY" && (
        <Select
          id="dayOfWeek"
          label="Day of Week"
          options={DAY_OF_WEEK_OPTIONS.map((opt) => ({
            value: String(opt.value),
            label: opt.label,
          }))}
          value={String(formData.dayOfWeek ?? 1)}
          onChange={(value) => {
            setFormData((prev) => ({
              ...prev,
              dayOfWeek: parseInt(value, 10),
            }));
          }}
          disabled={isSubmitting}
        />
      )}

      {/* Date Input (for SPECIFIC_DATE rules) */}
      {formData.ruleType === "SPECIFIC_DATE" && (
        <DateInput
          label="Date"
          value={formData.date ?? ""}
          onChange={(date) => {
            setFormData((prev) => ({
              ...prev,
              date: date || null,
            }));
          }}
          placeholder="Select date"
          disabled={isSubmitting}
        />
      )}

      {/* Holiday Selection (for HOLIDAY rules) */}
      {formData.ruleType === "HOLIDAY" && (
        <>
          {holidays.length > 0 ? (
            <Select
              id="holidayId"
              label="Holiday"
              options={holidays.map((h) => {
                const holidayDate = new Date(h.date);
                return {
                  value: h.id,
                  label: `${h.name} (${holidayDate.toLocaleDateString()})`,
                };
              })}
              value={formData.holidayId ?? ""}
              onChange={(value) => {
                setFormData((prev) => ({
                  ...prev,
                  holidayId: value || null,
                }));
              }}
              disabled={isSubmitting}
            />
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-100 dark:bg-gray-800 rounded-sm">
              No holidays configured. Please add holidays first in club settings.
            </div>
          )}
        </>
      )}

      {/* Helper text for special rule types */}
      {formData.ruleType === "WEEKDAYS" && (
        <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-sm">
          This rule will apply to all weekdays (Monday through Friday).
        </div>
      )}

      {formData.ruleType === "WEEKENDS" && (
        <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-sm">
          This rule will apply to all weekends (Saturday and Sunday).
        </div>
      )}

      {formData.ruleType === "ALL_DAYS" && (
        <div className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-sm">
          This rule will apply to every day of the week.
        </div>
      )}

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <TimeInput
          id="startTime"
          name="startTime"
          label="Start Time"
          value={formData.startTime}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
        <TimeInput
          id="endTime"
          name="endTime"
          label="End Time"
          value={formData.endTime}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
      </div>

      {/* Price */}
      <Input
        name="price"
        label="Price per Hour"
        type="number"
        step="0.01"
        min="0.01"
        value={displayPrice}
        onChange={handlePriceChange}
        placeholder="0.00"
        disabled={isSubmitting}
      />

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialValues ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
