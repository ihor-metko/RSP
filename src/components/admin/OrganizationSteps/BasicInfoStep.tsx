"use client";

import { Input, Textarea, Card } from "@/components/ui";
import { useTranslations } from "next-intl";

interface BasicInfoFormData {
  name: string;
  slug: string;
  description: string;
}

interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

interface BasicInfoStepProps {
  formData: unknown;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onChange: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | ((field: string, value: UploadedFile | null) => void);
  translationNamespace?: string;
}

export function BasicInfoStep({ formData, fieldErrors, isSubmitting, onChange, translationNamespace = "organizations.stepper" }: BasicInfoStepProps) {
  const t = useTranslations(translationNamespace);
  const data = formData as BasicInfoFormData;
  const handleChange = onChange as (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

  return (
    <Card className="im-stepper-section">
      <h2 className="im-stepper-section-title">{t("basicInfoTitle")}</h2>
      <p className="im-stepper-section-description">
        {t("basicInfoDescription")}
      </p>
      <div className="im-step-content">
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <Input
              label={t("organizationName")}
              name="name"
              value={data.name}
              onChange={handleChange}
              placeholder={t("organizationNamePlaceholder")}
              disabled={isSubmitting}
            />
            {fieldErrors.name && (
              <span className="im-stepper-field-error">{fieldErrors.name}</span>
            )}
          </div>
        </div>

        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <Input
              label={t("slugOptional")}
              name="slug"
              value={data.slug}
              onChange={handleChange}
              placeholder={t("slugPlaceholder")}
              disabled={isSubmitting}
            />
            <span className="im-stepper-field-hint">
              {t("slugHintAuto")}
            </span>
            {fieldErrors.slug && (
              <span className="im-stepper-field-error">{fieldErrors.slug}</span>
            )}
          </div>
        </div>

        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <Textarea
              label={t("shortDescription")}
              name="description"
              value={data.description}
              onChange={handleChange}
              placeholder={t("descriptionPlaceholder")}
              disabled={isSubmitting}
              rows={4}
            />
            {fieldErrors.description && (
              <span className="im-stepper-field-error">{fieldErrors.description}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
