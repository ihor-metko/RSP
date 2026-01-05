"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, RadioGroup } from "@/components/ui";
import { SectionEditModal } from "@/components/admin/club/SectionEditModal";
import { formatPrice, centsToDollars, dollarsToCents } from "@/utils/price";
import { SportType, SPORT_TYPE_OPTIONS, getSportName } from "@/constants/sports";
import type { CourtFormat } from "@/types/court";
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
    courtFormat?: CourtFormat | null;
    description?: string | null;
    isPublished: boolean;
    defaultPriceCents: number;
  }) => Promise<unknown>;
}

export function CourtBasicBlock({ court, onUpdate }: CourtBasicBlockProps) {
  const t = useTranslations();
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
    courtFormat: court.courtFormat || null,
    description: court.description || "",
    isPublished: court.isPublished ?? false,
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
      courtFormat: court.courtFormat || null,
      description: court.description || "",
      isPublished: court.isPublished ?? false,
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
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      errors.name = t("courtDetail.blocks.basicInformation.nameRequired");
    } else if (formData.name.trim().length < 2) {
      errors.name = t("courtDetail.blocks.basicInformation.nameMinLength");
    } else if (formData.name.trim().length > 120) {
      errors.name = t("courtDetail.blocks.basicInformation.nameMaxLength");
    }

    if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.slug = t("courtDetail.blocks.basicInformation.slugInvalid");
    }

    if (formData.defaultPriceCents < 0) {
      errors.defaultPriceCents = t("courtDetail.blocks.basicInformation.priceNonNegative");
    }

    // Validate courtFormat for Padel courts
    if (formData.sportType === SportType.PADEL && !formData.courtFormat) {
      errors.courtFormat = t("courtDetail.blocks.basicInformation.courtFormatRequired");
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
      // Prepare payload with courtFormat
      const payload = {
        ...formData,
        courtFormat: formData.sportType === SportType.PADEL ? (formData.courtFormat as CourtFormat) : null,
      };
      await onUpdate(payload);
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
  }, [formData, onUpdate, t]);

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
            {t("courtDetail.blocks.basicInformation.title")}
          </h2>
          <Button
            variant="outline"
            onClick={handleEdit}
            className="im-edit-btn"
            aria-label={t("courtDetail.blocks.basicInformation.editBasicInfo")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            {t("courtDetail.blocks.basicInformation.edit")}
          </Button>
        </div>

        <div className="im-block-content">
          <div className="im-block-row">
            <span className="im-block-label">{t("courtDetail.blocks.basicInformation.name")}</span>
            <span className="im-block-value">{court.name}</span>
          </div>

          <div className="im-block-row">
            <span className="im-block-label">{t("courtDetail.blocks.basicInformation.slug")}</span>
            <span className={`im-block-value ${!court.slug ? "im-block-value--empty" : ""}`}>
              {court.slug || t("courtDetail.blocks.basicInformation.notSet")}
            </span>
          </div>

          <div className="im-block-row">
            <span className="im-block-label">{t("courtDetail.blocks.basicInformation.type")}</span>
            <span className={`im-block-value ${!court.type ? "im-block-value--empty" : ""}`}>
              {court.type || t("courtDetail.blocks.basicInformation.notSet")}
            </span>
          </div>

          <div className="im-block-row">
            <span className="im-block-label">{t("courtDetail.blocks.basicInformation.surface")}</span>
            <span className={`im-block-value ${!court.surface ? "im-block-value--empty" : ""}`}>
              {court.surface || t("courtDetail.blocks.basicInformation.notSet")}
            </span>
          </div>

          <div className="im-block-row">
            <span className="im-block-label">{t("courtDetail.blocks.basicInformation.sportType")}</span>
            <span className="im-block-value">
              {court.sportType ? getSportName(court.sportType as SportType) : "Padel"}
            </span>
          </div>

          {court.courtFormat && (
            <div className="im-block-row">
              <span className="im-block-label">{t("courtDetail.blocks.basicInformation.courtFormat")}</span>
              <span className="im-block-value">
                {court.courtFormat === "SINGLE" 
                  ? t("courtDetail.blocks.basicInformation.courtFormatSingle") 
                  : t("courtDetail.blocks.basicInformation.courtFormatDouble")}
              </span>
            </div>
          )}

          <div className="im-block-row">
            <span className="im-block-label">{t("courtDetail.blocks.basicInformation.environment")}</span>
            <span className="im-block-value">
              <span className={`im-court-badge ${court.indoor ? "im-court-badge--indoor" : "im-court-badge--outdoor"}`}>
                {court.indoor ? t("courtDetail.blocks.basicInformation.indoor") : t("courtDetail.blocks.basicInformation.outdoor")}
              </span>
            </span>
          </div>

          <div className="im-block-row">
            <span className="im-block-label">{t("courtDetail.blocks.basicInformation.publicationStatus")}</span>
            <span className="im-block-value">
              <span className={`im-court-badge ${court.isPublished ? "im-court-badge--published" : "im-court-badge--unpublished"}`}>
                {court.isPublished ? t("courtDetail.blocks.basicInformation.published") : t("courtDetail.blocks.basicInformation.unpublished")}
              </span>
            </span>
          </div>

          {court.description && (
            <div className="im-block-row im-block-row--vertical">
              <span className="im-block-label">{t("courtDetail.blocks.basicInformation.description")}</span>
              <span className="im-block-value im-block-value--description">
                {court.description}
              </span>
            </div>
          )}

          <div className="im-block-row">
            <span className="im-block-label">{t("courtDetail.blocks.basicInformation.defaultPrice")}</span>
            <span className="im-block-value im-block-value--price">
              {formatPrice(court.defaultPriceCents)}/hour
            </span>
          </div>

          {court.updatedAt && (
            <div className="im-block-meta">
              {t("courtDetail.blocks.basicInformation.lastUpdated")} {new Date(court.updatedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <SectionEditModal
        isOpen={isEditing}
        onClose={handleClose}
        title={t("courtDetail.blocks.basicInformation.editTitle")}
        onSave={handleSave}
        isSaving={isSaving}
      >
        {error && <div className="im-section-edit-modal-error">{error}</div>}

        <div className="im-modal-field">
          <Input
            label={`${t("courtDetail.blocks.basicInformation.name")} *`}
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder={t("courtDetail.blocks.basicInformation.namePlaceholder")}
            disabled={isSaving}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
          />
          {fieldErrors.name && (
            <span id="name-error" className="im-field-error">{fieldErrors.name}</span>
          )}
        </div>

        <div className="im-modal-field">
          <Input
            label={t("courtDetail.blocks.basicInformation.slugLabel")}
            name="slug"
            value={formData.slug}
            onChange={handleInputChange}
            placeholder={t("courtDetail.blocks.basicInformation.slugPlaceholder")}
            disabled={isSaving}
            aria-describedby={fieldErrors.slug ? "slug-error" : undefined}
          />
          <span className="im-field-hint">
            {t("courtDetail.blocks.basicInformation.slugHint")}
          </span>
          {fieldErrors.slug && (
            <span id="slug-error" className="im-field-error">{fieldErrors.slug}</span>
          )}
        </div>

        <div className="im-modal-row">
          <div className="im-modal-field">
            <Input
              label={t("courtDetail.blocks.basicInformation.typeLabel")}
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              placeholder={t("courtDetail.blocks.basicInformation.typePlaceholder")}
              disabled={isSaving}
            />
          </div>

          <div className="im-modal-field">
            <Input
              label={t("courtDetail.blocks.basicInformation.surfaceLabel")}
              name="surface"
              value={formData.surface}
              onChange={handleInputChange}
              placeholder={t("courtDetail.blocks.basicInformation.surfacePlaceholder")}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="im-modal-field">
          <label className="rsp-label mb-1 block text-sm font-medium">
            {t("courtDetail.blocks.basicInformation.sportTypeLabel")}
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

        {formData.sportType === SportType.PADEL && (
          <div className="im-modal-field">
            <RadioGroup
              label={t("courtDetail.blocks.basicInformation.courtFormatLabel")}
              name="courtFormat"
              options={[
                {
                  value: "SINGLE",
                  label: t("courtDetail.blocks.basicInformation.courtFormatSingle"),
                },
                {
                  value: "DOUBLE",
                  label: t("courtDetail.blocks.basicInformation.courtFormatDouble"),
                },
              ]}
              value={formData.courtFormat || ""}
              onChange={(value) => {
                // Validate value before setting
                if (value === 'SINGLE' || value === 'DOUBLE') {
                  setFormData((prev) => ({ ...prev, courtFormat: value as CourtFormat }));
                  if (fieldErrors.courtFormat) {
                    setFieldErrors((prev) => {
                      const updated = { ...prev };
                      delete updated.courtFormat;
                      return updated;
                    });
                  }
                }
              }}
              disabled={isSaving}
            />
            {fieldErrors.courtFormat && (
              <span id="courtFormat-error" className="im-field-error">{fieldErrors.courtFormat}</span>
            )}
          </div>
        )}

        <div className="im-modal-field">
          <label className="rsp-label mb-1 block text-sm font-medium">
            {t("courtDetail.blocks.basicInformation.descriptionLabel")}
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder={t("courtDetail.blocks.basicInformation.descriptionPlaceholder")}
            disabled={isSaving}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="im-modal-field">
          <label className="rsp-label mb-1 block text-sm font-medium">
            {t("courtDetail.blocks.basicInformation.defaultPriceLabel")}
          </label>
          <Input
            name="defaultPrice"
            type="number"
            step="0.01"
            min="0"
            value={displayPrice}
            onChange={handlePriceChange}
            placeholder={t("courtDetail.blocks.basicInformation.defaultPricePlaceholder")}
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
            <span className="im-checkbox-label">{t("courtDetail.blocks.basicInformation.indoorCourtLabel")}</span>
          </label>
        </div>

        <div className="im-modal-field">
          <label className="im-checkbox-wrapper">
            <input
              type="checkbox"
              name="isPublished"
              checked={formData.isPublished}
              onChange={handleInputChange}
              disabled={isSaving}
              className="im-checkbox"
            />
            <span className="im-checkbox-label">{t("courtDetail.blocks.basicInformation.publishedLabel")}</span>
          </label>
          <span className="im-field-hint">
            {t("courtDetail.blocks.basicInformation.publishedHint")}
          </span>
        </div>
      </SectionEditModal>
    </>
  );
}
