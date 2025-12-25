"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, Button } from "@/components/ui";
import { UploadField } from "@/components/admin/UploadField.client";

interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

export interface BannerData {
  heroImage: UploadedFile | null;
}

interface BannerTabProps {
  initialData: BannerData;
  onSave: (file: File | null) => Promise<void>;
  disabled?: boolean;
}

export function BannerTab({ initialData, onSave, disabled = false }: BannerTabProps) {
  const t = useTranslations("organizations.tabs");
  const [formData, setFormData] = useState<BannerData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = useCallback((file: UploadedFile | null) => {
    setFormData({ heroImage: file });
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onSave(formData.heroImage?.file || null);
      setHasChanges(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.saveFailed");
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="im-entity-tab-card">
      <div className="im-entity-tab-header">
        <div>
          <h3 className="im-entity-tab-title">{t("banner.title")}</h3>
          <p className="im-entity-tab-description">{t("banner.description")}</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving || disabled}
          variant="primary"
        >
          {isSaving ? t("common.saving") : t("common.save")}
        </Button>
      </div>

      {error && (
        <div className="im-entity-tab-error" role="alert">
          {error}
        </div>
      )}

      <div className="im-entity-tab-content">
        <div className="im-entity-tab-field">
          <UploadField
            label={t("banner.heroImage")}
            value={formData.heroImage}
            onChange={handleChange}
            aspectRatio="wide"
            helperText={t("banner.heroImageHelperText")}
            disabled={isSaving || disabled}
            allowSVG={false}
          />
        </div>

        {formData.heroImage && (
          <div className="im-entity-tab-field">
            <label className="im-upload-field-label">{t("banner.preview")}</label>
            <div className="im-banner-preview-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={formData.heroImage.preview || formData.heroImage.url}
                alt={t("banner.previewAlt")}
                className="im-banner-preview-image"
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
