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

interface ImagesFormData {
  logo: UploadedFile | null;
  heroImage: UploadedFile | null;
}

interface ImagesStepProps {
  formData: unknown;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onChange: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | ((field: string, value: UploadedFile | null) => void);
  translationNamespace?: string;
}

export function ImagesStep({ formData, fieldErrors, isSubmitting, onChange, translationNamespace = "organizations.stepper" }: ImagesStepProps) {
  const t = useTranslations(translationNamespace);
  const data = formData as ImagesFormData;
  const handleChange = onChange as (field: string, value: UploadedFile | null) => void;

  return (
    <Card className="im-stepper-section">
      <h2 className="im-stepper-section-title">{t("imagesTitle")}</h2>
      <p className="im-stepper-section-description">
        {t("imagesDescription")}
      </p>
      <div className="im-step-content">
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <UploadField
              label={t("organizationLogo")}
              value={data.logo}
              onChange={(file) => handleChange('logo', file)}
              aspectRatio="square"
              helperText={t("logoHelperText")}
              disabled={isSubmitting}
              allowSVG={true}
            />
          </div>
        </div>

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
