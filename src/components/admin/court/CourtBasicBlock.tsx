"use client";

import { useState, useCallback } from "react";
import { Button, Input } from "@/components/ui";
import { SectionEditModal } from "@/components/admin/club/SectionEditModal";
import { formatPrice, centsToDollars, dollarsToCents } from "@/utils/price";
import { SportType, SPORT_TYPE_OPTIONS, getSportName } from "@/constants/sports";
import type { CourtDetail } from "./types";
import "./CourtBasicBlock.css";

interface CourtBasicBlockProps {
  court: CourtDetail;
  onUpdate: (payload: {
    name: string;
    slug: string;
    type: string;
    surface: string;
    indoor: boolean;
    sportType: SportType;
    defaultPriceCents: number;
  }) => Promise<unknown>;
}

export function CourtBasicBlock({ court, onUpdate }: CourtBasicBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: court.name,
    slug: court.slug || "",
    type: court.type || "",
    surface: court.surface || "",
    indoor: court.indoor,
    sportType: court.sportType || SportType.PADEL,
    defaultPriceCents: court.defaultPriceCents,
  });

  const handleEdit = useCallback(() => {
    setFormData({
      name: court.name,
      slug: court.slug || "",
      type: court.type || "",
      surface: court.surface || "",
      indoor: court.indoor,
      sportType: court.sportType || SportType.PADEL,
      defaultPriceCents: court.defaultPriceCents,
    });
    setError("");
    setFieldErrors({});
    setIsEditing(true);
  }, [court]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setError("");
    setFieldErrors({});
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type, checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
      // Clear field error on change
      if (fieldErrors[name]) {
        setFieldErrors((prev) => {
          const updated = { ...prev };
          delete updated[name];
          return updated;
        });
      }
    },
    [fieldErrors]
  );

  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData((prev) => ({
      ...prev,
      defaultPriceCents: dollarsToCents(value),
    }));
    if (fieldErrors.defaultPriceCents) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated.defaultPriceCents;
        return updated;
      });
    }
  }, [fieldErrors]);

  const handleSave = useCallback(async () => {
    // Client-side validation
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    } else if (formData.name.trim().length > 120) {
      errors.name = "Name must be at most 120 characters";
    }

    if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens";
    }

    if (formData.defaultPriceCents < 0) {
      errors.defaultPriceCents = "Price must be non-negative";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Focus first invalid field
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
      element?.focus();
      return;
    }

    setIsSaving(true);
    setError("");
    setFieldErrors({});

    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (err: unknown) {
      // Handle server errors
      if (err && typeof err === "object" && "errors" in err) {
        const serverErrors = (err as { errors: Record<string, string> }).errors;
        setFieldErrors(serverErrors);
        // Focus first invalid field
        const firstErrorField = Object.keys(serverErrors)[0];
        const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
        element?.focus();
      } else {
        setError(err instanceof Error ? err.message : "Failed to save changes");
      }
    } finally {
      setIsSaving(false);
    }
  }, [formData, onUpdate]);

  const displayPrice = centsToDollars(formData.defaultPriceCents).toFixed(2);

  return (
    <>
      <div className="im-block im-court-basic-block">
        <div className="im-block-header">
          <h2 className="im-block-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            Basic Information
          </h2>
          <Button
            variant="outline"
            onClick={handleEdit}
            className="im-edit-btn"
            aria-label="Edit basic information"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            Edit
          </Button>
        </div>

        <div className="im-block-content">
          <div className="im-block-row">
            <span className="im-block-label">Name</span>
            <span className="im-block-value">{court.name}</span>
          </div>

          <div className="im-block-row">
            <span className="im-block-label">Slug</span>
            <span className={`im-block-value ${!court.slug ? "im-block-value--empty" : ""}`}>
              {court.slug || "Not set"}
            </span>
          </div>

          <div className="im-block-row">
            <span className="im-block-label">Type</span>
            <span className={`im-block-value ${!court.type ? "im-block-value--empty" : ""}`}>
              {court.type || "Not set"}
            </span>
          </div>

          <div className="im-block-row">
            <span className="im-block-label">Surface</span>
            <span className={`im-block-value ${!court.surface ? "im-block-value--empty" : ""}`}>
              {court.surface || "Not set"}
            </span>
          </div>

          <div className="im-block-row">
            <span className="im-block-label">Sport Type</span>
            <span className="im-block-value">
              {court.sportType ? getSportName(court.sportType as SportType) : "Padel"}
            </span>
          </div>

          <div className="im-block-row">
            <span className="im-block-label">Environment</span>
            <span className="im-block-value">
              <span className={`im-court-badge ${court.indoor ? "im-court-badge--indoor" : "im-court-badge--outdoor"}`}>
                {court.indoor ? "Indoor" : "Outdoor"}
              </span>
            </span>
          </div>

          <div className="im-block-row">
            <span className="im-block-label">Default Price</span>
            <span className="im-block-value im-block-value--price">
              {formatPrice(court.defaultPriceCents)}/hour
            </span>
          </div>

          {court.updatedAt && (
            <div className="im-block-meta">
              Last updated: {new Date(court.updatedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <SectionEditModal
        isOpen={isEditing}
        onClose={handleClose}
        title="Edit Basic Information"
        onSave={handleSave}
        isSaving={isSaving}
      >
        {error && <div className="im-section-edit-modal-error">{error}</div>}

        <div className="im-modal-field">
          <Input
            label="Name *"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Court name"
            disabled={isSaving}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
          />
          {fieldErrors.name && (
            <span id="name-error" className="im-field-error">{fieldErrors.name}</span>
          )}
        </div>

        <div className="im-modal-field">
          <Input
            label="Slug (URL identifier)"
            name="slug"
            value={formData.slug}
            onChange={handleInputChange}
            placeholder="court-name-slug"
            disabled={isSaving}
            aria-describedby={fieldErrors.slug ? "slug-error" : undefined}
          />
          <span className="im-field-hint">
            Used in URLs. Use lowercase letters, numbers, and hyphens only.
          </span>
          {fieldErrors.slug && (
            <span id="slug-error" className="im-field-error">{fieldErrors.slug}</span>
          )}
        </div>

        <div className="im-modal-row">
          <div className="im-modal-field">
            <Input
              label="Type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              placeholder="e.g., padel, tennis"
              disabled={isSaving}
            />
          </div>

          <div className="im-modal-field">
            <Input
              label="Surface"
              name="surface"
              value={formData.surface}
              onChange={handleInputChange}
              placeholder="e.g., artificial, clay"
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="im-modal-field">
          <label className="rsp-label mb-1 block text-sm font-medium">
            Sport Type
          </label>
          <select
            name="sportType"
            value={formData.sportType}
            onChange={handleInputChange}
            disabled={isSaving}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SPORT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="im-modal-field">
          <label className="rsp-label mb-1 block text-sm font-medium">
            Default Price per Hour
          </label>
          <Input
            name="defaultPrice"
            type="number"
            step="0.01"
            min="0"
            value={displayPrice}
            onChange={handlePriceChange}
            placeholder="0.00"
            disabled={isSaving}
            aria-describedby={fieldErrors.defaultPriceCents ? "price-error" : undefined}
          />
          {fieldErrors.defaultPriceCents && (
            <span id="price-error" className="im-field-error">{fieldErrors.defaultPriceCents}</span>
          )}
        </div>

        <div className="im-modal-field">
          <label className="im-checkbox-wrapper">
            <input
              type="checkbox"
              name="indoor"
              checked={formData.indoor}
              onChange={handleInputChange}
              disabled={isSaving}
              className="im-checkbox"
            />
            <span className="im-checkbox-label">Indoor court</span>
          </label>
        </div>
      </SectionEditModal>
    </>
  );
}
