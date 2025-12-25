"use client";

import { Input, Card } from "@/components/ui";
import { useTranslations } from "next-intl";

interface AddressFormData {
  country: string;
  city: string;
  location: string;
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
  translationNamespace?: string;
}

export function AddressStep({ formData, fieldErrors, isSubmitting, onChange, translationNamespace = "clubs.stepper" }: AddressStepProps) {
  const t = useTranslations(translationNamespace);
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

        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <Input
              label={t("fullAddress")}
              name="location"
              value={data.location}
              onChange={handleChange}
              placeholder={t("fullAddressPlaceholder")}
              disabled={isSubmitting}
            />
            {fieldErrors.location && (
              <span className="im-stepper-field-error">{fieldErrors.location}</span>
            )}
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
