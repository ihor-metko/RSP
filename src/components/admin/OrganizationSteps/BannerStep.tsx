"use client";

import { Card } from "@/components/ui";
import { UploadField } from "../UploadField.client";
import { useTranslations } from "next-intl";

interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

interface BannerFormData {
  heroImage: UploadedFile | null;
}

interface BannerStepProps {
  formData: unknown;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onChange: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | ((field: string, value: UploadedFile | null | boolean | string) => void);
  translationNamespace?: string;
}

export function BannerStep({ formData, fieldErrors, isSubmitting, onChange, translationNamespace = "organizations.stepper" }: BannerStepProps) {
  const t = useTranslations(translationNamespace);
  const data = formData as BannerFormData;
  const handleChange = onChange as (field: string, value: UploadedFile | null) => void;

  return (
    <Card className="im-stepper-section">
      <h2 className="im-stepper-section-title">{t("bannerTitle")}</h2>
      <p className="im-stepper-section-description">
        {t("bannerDescription")}
      </p>
      <div className="im-step-content">
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <UploadField
              label={t("backgroundImage")}
              value={data.heroImage}
              onChange={(file) => handleChange('heroImage', file)}
              aspectRatio="wide"
              required
              helperText={t("backgroundHelperText")}
              disabled={isSubmitting}
            />
            {fieldErrors.heroImage && (
              <span className="im-stepper-field-error">{fieldErrors.heroImage}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
