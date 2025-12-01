"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { centsToDollars, dollarsToCents } from "@/utils/price";

export interface CourtFormData {
  name: string;
  slug: string;
  type: string;
  surface: string;
  indoor: boolean;
  defaultPriceCents: number;
}

interface CourtFormProps {
  initialValues?: Partial<CourtFormData>;
  onSubmit: (data: CourtFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CourtForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CourtFormProps) {
  const [formData, setFormData] = useState<CourtFormData>({
    name: initialValues?.name || "",
    slug: initialValues?.slug || "",
    type: initialValues?.type || "",
    surface: initialValues?.surface || "",
    indoor: initialValues?.indoor ?? false,
    defaultPriceCents: initialValues?.defaultPriceCents ?? 0,
  });

  const [error, setError] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData((prev) => ({
      ...prev,
      defaultPriceCents: dollarsToCents(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save court");
    }
  };

  const displayPrice = centsToDollars(formData.defaultPriceCents).toFixed(2);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
          {error}
        </div>
      )}

      <Input
        label="Name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        placeholder="Court name"
        required
        disabled={isSubmitting}
      />

      <Input
        label="Slug (optional)"
        name="slug"
        value={formData.slug}
        onChange={handleInputChange}
        placeholder="court-slug"
        disabled={isSubmitting}
      />

      <Input
        label="Type (optional)"
        name="type"
        value={formData.type}
        onChange={handleInputChange}
        placeholder="e.g., padel, tennis"
        disabled={isSubmitting}
      />

      <Input
        label="Surface (optional)"
        name="surface"
        value={formData.surface}
        onChange={handleInputChange}
        placeholder="e.g., artificial, clay"
        disabled={isSubmitting}
      />

      <div className="rsp-input-wrapper">
        <label className="rsp-label mb-1 block text-sm font-medium">
          Default Price
        </label>
        <Input
          name="defaultPrice"
          type="number"
          step="0.01"
          min="0"
          value={displayPrice}
          onChange={handlePriceChange}
          placeholder="0.00"
          disabled={isSubmitting}
        />
      </div>

      <div className="rsp-input-wrapper flex items-center gap-2">
        <input
          type="checkbox"
          id="indoor"
          name="indoor"
          checked={formData.indoor}
          onChange={handleInputChange}
          disabled={isSubmitting}
          className="h-4 w-4 rounded-sm border-gray-300 focus:ring-2"
        />
        <label htmlFor="indoor" className="rsp-label text-sm font-medium">
          Indoor
        </label>
      </div>

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
