"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
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
    date: initialValues?.date || "",
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
      <div className="rsp-input-wrapper">
        <label className="rsp-label mb-2 block text-sm font-medium">
          Rule Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="ruleType"
              value="weekly"
              checked={ruleType === "weekly"}
              onChange={() => handleRuleTypeChange("weekly")}
              disabled={isSubmitting}
              className="h-4 w-4"
            />
            <span className="text-sm">Recurring Weekly</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="ruleType"
              value="date"
              checked={ruleType === "date"}
              onChange={() => handleRuleTypeChange("date")}
              disabled={isSubmitting}
              className="h-4 w-4"
            />
            <span className="text-sm">Specific Date</span>
          </label>
        </div>
      </div>

      {/* Day of Week Select (for weekly rules) */}
      {ruleType === "weekly" && (
        <div className="rsp-input-wrapper">
          <label htmlFor="dayOfWeek" className="rsp-label mb-1 block text-sm font-medium">
            Day of Week
          </label>
          <select
            id="dayOfWeek"
            name="dayOfWeek"
            value={formData.dayOfWeek ?? 1}
            onChange={handleInputChange}
            disabled={isSubmitting}
            className="tm-booking-select w-full px-3 py-2 border rounded-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          >
            {DAY_OF_WEEK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date Input (for date-specific rules) */}
      {ruleType === "date" && (
        <div className="rsp-input-wrapper">
          <label htmlFor="date" className="rsp-label mb-1 block text-sm font-medium">
            Date
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date || ""}
            onChange={handleInputChange}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
        </div>
      )}

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rsp-input-wrapper">
          <label htmlFor="startTime" className="rsp-label mb-1 block text-sm font-medium">
            Start Time
          </label>
          <input
            type="time"
            id="startTime"
            name="startTime"
            value={formData.startTime}
            onChange={handleInputChange}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
        </div>
        <div className="rsp-input-wrapper">
          <label htmlFor="endTime" className="rsp-label mb-1 block text-sm font-medium">
            End Time
          </label>
          <input
            type="time"
            id="endTime"
            name="endTime"
            value={formData.endTime}
            onChange={handleInputChange}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>

      {/* Price */}
      <div className="rsp-input-wrapper">
        <label className="rsp-label mb-1 block text-sm font-medium">
          Price per Hour
        </label>
        <Input
          name="price"
          type="number"
          step="0.01"
          min="0.01"
          value={displayPrice}
          onChange={handlePriceChange}
          placeholder="0.00"
          disabled={isSubmitting}
        />
      </div>

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
