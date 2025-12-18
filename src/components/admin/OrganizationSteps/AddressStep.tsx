"use client";

import { Input, Card } from "@/components/ui";
import { useTranslations } from "next-intl";

interface AddressFormData {
  country: string;
  city: string;
  postalCode: string;
  street: string;
  latitude: string;
  longitude: string;
}

interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

interface AddressStepProps {
  formData: unknown;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onChange: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | ((field: string, value: UploadedFile | null) => void);
}

export function AddressStep({ formData, fieldErrors, isSubmitting, onChange }: AddressStepProps) {
  const t = useTranslations("organizations.stepper");
  const data = formData as AddressFormData;
  const handleChange = onChange as (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

  return (
    <Card className="im-stepper-section">
      <h2 className="im-stepper-section-title">{t("addressTitle")}</h2>
      <p className="im-stepper-section-description">
        {t("addressDescription")}
      </p>
      <div className="im-step-content">
        <div className="im-stepper-row im-stepper-row--two">
          <div className="im-stepper-field">
            <Input
              label={t("country")}
              name="country"
              value={data.country}
              onChange={handleChange}
              placeholder={t("countryPlaceholder")}
              disabled={isSubmitting}
            />
            {fieldErrors.country && (
              <span className="im-stepper-field-error">{fieldErrors.country}</span>
            )}
          </div>
          <div className="im-stepper-field">
            <Input
              label={t("city")}
              name="city"
              value={data.city}
              onChange={handleChange}
              placeholder={t("cityPlaceholder")}
              disabled={isSubmitting}
            />
            {fieldErrors.city && (
              <span className="im-stepper-field-error">{fieldErrors.city}</span>
            )}
          </div>
        </div>

        <div className="im-stepper-row im-stepper-row--two">
          <div className="im-stepper-field">
            <Input
              label={t("street")}
              name="street"
              value={data.street}
              onChange={handleChange}
              placeholder={t("streetPlaceholder")}
              disabled={isSubmitting}
            />
            {fieldErrors.street && (
              <span className="im-stepper-field-error">{fieldErrors.street}</span>
            )}
          </div>
          <div className="im-stepper-field">
            <Input
              label={t("postalCode")}
              name="postalCode"
              value={data.postalCode}
              onChange={handleChange}
              placeholder={t("postalCodePlaceholder")}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="im-stepper-row im-stepper-row--two">
          <div className="im-stepper-field">
            <Input
              label={t("latitude")}
              name="latitude"
              value={data.latitude}
              onChange={handleChange}
              placeholder={t("latitudePlaceholder")}
              disabled={isSubmitting}
              type="number"
              step="any"
            />
            {fieldErrors.latitude && (
              <span className="im-stepper-field-error">{fieldErrors.latitude}</span>
            )}
          </div>
          <div className="im-stepper-field">
            <Input
              label={t("longitude")}
              name="longitude"
              value={data.longitude}
              onChange={handleChange}
              placeholder={t("longitudePlaceholder")}
              disabled={isSubmitting}
              type="number"
              step="any"
            />
            {fieldErrors.longitude && (
              <span className="im-stepper-field-error">{fieldErrors.longitude}</span>
            )}
          </div>
        </div>

        <div className="im-stepper-row">
          <span className="im-stepper-field-hint">
            {t("mapTip")}
          </span>
        </div>
      </div>
    </Card>
  );
}
