"use client";

import { Input, Card } from "@/components/ui";
import { useTranslations } from "next-intl";

interface ContactsStepProps {
  formData: {
    contactEmail: string;
    contactPhone: string;
    website: string;
    facebook: string;
    instagram: string;
    linkedin: string;
  };
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  translationNamespace?: string;
}

export function ContactsStep({ formData, fieldErrors, isSubmitting, onChange, translationNamespace = "organizations.stepper" }: ContactsStepProps) {
  const t = useTranslations(translationNamespace);

  return (
    <Card className="im-stepper-section">
      <h2 className="im-stepper-section-title">{t("contactsTitle")}</h2>
      <p className="im-stepper-section-description">
        {t("contactsDescription")}
      </p>
      <div className="im-step-content">
        <div className="im-stepper-row im-stepper-row--two">
          <div className="im-stepper-field">
            <Input
              label={t("organizationEmail")}
              name="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={onChange}
              placeholder={t("organizationEmailPlaceholder")}
              disabled={isSubmitting}
            />
            {fieldErrors.contactEmail && (
              <span className="im-stepper-field-error">{fieldErrors.contactEmail}</span>
            )}
          </div>
          <div className="im-stepper-field">
            <Input
              label={t("phoneNumber")}
              name="contactPhone"
              value={formData.contactPhone}
              onChange={onChange}
              placeholder={t("phoneNumberPlaceholder")}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <Input
              label={t("website")}
              name="website"
              value={formData.website}
              onChange={onChange}
              placeholder={t("websitePlaceholder")}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <Input
              label={t("facebook")}
              name="facebook"
              value={formData.facebook}
              onChange={onChange}
              placeholder={t("facebookPlaceholder")}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <Input
              label={t("instagram")}
              name="instagram"
              value={formData.instagram}
              onChange={onChange}
              placeholder={t("instagramPlaceholder")}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <Input
              label={t("linkedin")}
              name="linkedin"
              value={formData.linkedin}
              onChange={onChange}
              placeholder={t("linkedinPlaceholder")}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
