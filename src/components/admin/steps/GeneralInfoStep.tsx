"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui";

const CLUB_TYPES = [{ value: "padel", label: "Padel" }];

export interface GeneralInfoData {
  name: string;
  slug: string;
  clubType: string;
  shortDescription: string;
  isPublic?: boolean;
}

interface GeneralInfoStepProps {
  data: GeneralInfoData;
  onChange: (data: Partial<GeneralInfoData>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  showPublicToggle?: boolean;
}

export function GeneralInfoStep({
  data,
  onChange,
  errors = {},
  disabled = false,
  showPublicToggle = false,
}: GeneralInfoStepProps) {
  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;
      onChange({ [name]: type === "checkbox" ? checked : value });
    },
    [onChange]
  );

  return (
    <div className="im-step-content">
      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <Input
            label="Club Name *"
            name="name"
            value={data.name}
            onChange={handleInputChange}
            placeholder="Enter club name"
            disabled={disabled}
          />
          {errors.name && (
            <span className="im-stepper-field-error">{errors.name}</span>
          )}
        </div>
      </div>

      <div className="im-stepper-row im-stepper-row--two">
        <div className="im-stepper-field">
          <Input
            label="Slug (optional)"
            name="slug"
            value={data.slug}
            onChange={handleInputChange}
            placeholder="club-name-slug"
            disabled={disabled}
          />
          <span className="im-stepper-field-hint">
            Auto-generated from name if empty
          </span>
          {errors.slug && (
            <span className="im-stepper-field-error">{errors.slug}</span>
          )}
        </div>
        <div className="im-stepper-field">
          <label className="im-stepper-label">Club Type</label>
          <select
            name="clubType"
            value={data.clubType}
            onChange={handleInputChange}
            className="im-stepper-select"
            disabled={disabled}
          >
            <option value="">Select type...</option>
            {CLUB_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <label className="im-stepper-label">Short Description</label>
          <textarea
            name="shortDescription"
            value={data.shortDescription}
            onChange={handleInputChange}
            placeholder="Brief description of the club..."
            className="im-stepper-textarea"
            rows={3}
            disabled={disabled}
          />
        </div>
      </div>

      {showPublicToggle && (
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <label className="im-stepper-checkbox-wrapper">
              <input
                type="checkbox"
                name="isPublic"
                checked={data.isPublic || false}
                onChange={handleInputChange}
                disabled={disabled}
                className="im-stepper-checkbox"
              />
              <span className="im-stepper-checkbox-label">
                Publish club (visible to public)
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
