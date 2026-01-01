"use client";

import { useState } from "react";
import { Button, Input, Select, TimeInput, RadioGroup, DateInput } from "@/components/ui";
import { centsToDollars, dollarsToCents } from "@/utils/price";

export interface PriceRuleFormData {
  dayOfWeek: number | null;
  date: string | null;
  startTime: string;
  endTime: string;
  priceCents: number;
}

interface PriceRuleFormProps {
  initialValues?: Partial<PriceRuleFormData>;
  onSubmit: (data: PriceRuleFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
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

export function PriceRuleForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: PriceRuleFormProps) {
  const [ruleType, setRuleType] = useState<"weekly" | "date">(
    initialValues?.date ? "date" : "weekly"
  );
  const [formData, setFormData] = useState<PriceRuleFormData>({
    dayOfWeek: initialValues?.dayOfWeek ?? 1, // Default to Monday
    date: initialValues?.date ?? null,
    startTime: initialValues?.startTime || "09:00",
    endTime: initialValues?.endTime || "10:00",
    priceCents: initialValues?.priceCents ?? 0,
  });

  const [error, setError] = useState("");

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

  const handleRuleTypeChange = (type: "weekly" | "date") => {
    setRuleType(type);
    if (type === "weekly") {
      setFormData((prev) => ({
        ...prev,
        date: null,
        dayOfWeek: prev.dayOfWeek ?? 1,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        dayOfWeek: null,
        date: prev.date || new Date().toISOString().split("T")[0],
      }));
    }
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
    if (ruleType === "date" && !formData.date) {
      setError("Date is required for date-specific rules");
      return;
    }

    try {
      const submitData: PriceRuleFormData = {
        startTime: formData.startTime,
        endTime: formData.endTime,
        priceCents: formData.priceCents,
        dayOfWeek: ruleType === "weekly" ? formData.dayOfWeek : null,
        date: ruleType === "date" ? formData.date : null,
      };
      await onSubmit(submitData);
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

      {/* Rule Type Toggle */}
      <RadioGroup
        label="Rule Type"
        name="ruleType"
        options={[
          { value: "weekly", label: "Recurring Weekly" },
          { value: "date", label: "Specific Date" },
        ]}
        value={ruleType}
        onChange={(value) => {
          if (value === "weekly" || value === "date") {
            handleRuleTypeChange(value);
          }
        }}
        disabled={isSubmitting}
      />

      {/* Day of Week Select (for weekly rules) */}
      {ruleType === "weekly" && (
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

      {/* Date Input (for date-specific rules) */}
      {ruleType === "date" && (
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
