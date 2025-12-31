"use client";

import { Card } from "@/components/ui";
import { useTranslations } from "next-intl";
import "./LogoStep.css";

interface LogoStepProps {
  formData?: unknown;
  fieldErrors?: Record<string, string>;
  isSubmitting?: boolean;
  onChange?: unknown;
  translationNamespace?: string;
}

export function LogoStep({ translationNamespace = "organizations.stepper" }: LogoStepProps) {
  const t = useTranslations(translationNamespace);

  return (
    <Card className="im-stepper-section">
      <h2 className="im-stepper-section-title">{t("logoTitle")}</h2>
      <p className="im-stepper-section-description">
        {t("logoDescription")}
      </p>
      <div className="im-step-content">
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <p className="im-upload-field-helper">
              Logo upload and management will be available in a future update.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
