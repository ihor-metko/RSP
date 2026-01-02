"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { centsToDollars, dollarsToCents } from "@/utils/price";
import { SportType, SPORT_TYPE_OPTIONS } from "@/constants/sports";

export interface CourtFormData {
  name: string;
  slug: string;
  type: string;
  surface: string;
  indoor: boolean;
  sportType: SportType;
  description: string;
  isPublished: boolean;
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
    sportType: initialValues?.sportType || SportType.PADEL,
    description: initialValues?.description || "",
    isPublished: initialValues?.isPublished ?? false,
    defaultPriceCents: initialValues?.defaultPriceCents ?? 0,
  });

  const [error, setError] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
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
          Description (optional)
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="General information about the court (surface details, notes, etc.)"
          disabled={isSubmitting}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="rsp-input-wrapper">
        <label className="rsp-label mb-1 block text-sm font-medium">
          Sport Type
        </label>
        <select
          name="sportType"
          value={formData.sportType}
          onChange={handleInputChange}
          disabled={isSubmitting}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SPORT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

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

      <div className="rsp-input-wrapper flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublished"
          name="isPublished"
          checked={formData.isPublished}
          onChange={handleInputChange}
          disabled={isSubmitting}
          className="h-4 w-4 rounded-sm border-gray-300 focus:ring-2"
        />
        <label htmlFor="isPublished" className="rsp-label text-sm font-medium">
          Published
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
