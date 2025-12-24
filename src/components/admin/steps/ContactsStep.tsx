"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui";

export interface ContactsData {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  latitude?: string;
  longitude?: string;
}

interface ContactsStepProps {
  data: ContactsData;
  onChange: (data: Partial<ContactsData>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function ContactsStep({
  data,
  onChange,
  errors = {},
  disabled = false,
}: ContactsStepProps) {
  const t = useTranslations("admin.clubs.stepper.contacts");
  
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      onChange({ [name]: value });
    },
    [onChange]
  );

  return (
    <div className="im-step-content">
      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <Input
            label={t("address")}
            name="address"
            value={data.address}
            onChange={handleInputChange}
            placeholder={t("addressPlaceholder")}
            disabled={disabled}
          />
          {errors.address && (
            <span className="im-stepper-field-error">{errors.address}</span>
          )}
        </div>
      </div>

      <div className="im-stepper-row im-stepper-row--two">
        <div className="im-stepper-field">
          <Input
            label={t("city")}
            name="city"
            value={data.city}
            onChange={handleInputChange}
            placeholder={t("cityPlaceholder")}
            disabled={disabled}
          />
        </div>
        <div className="im-stepper-field">
          <Input
            label={t("postalCode")}
            name="postalCode"
            value={data.postalCode}
            onChange={handleInputChange}
            placeholder={t("postalCodePlaceholder")}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <Input
            label={t("country")}
            name="country"
            value={data.country}
            onChange={handleInputChange}
            placeholder={t("countryPlaceholder")}
            disabled={true}
          />
        </div>
      </div>

      <div className="im-stepper-row im-stepper-row--two">
        <div className="im-stepper-field">
          <Input
            label={t("latitude")}
            name="latitude"
            value={data.latitude || ""}
            onChange={handleInputChange}
            placeholder={t("latitudePlaceholder")}
            disabled={disabled}
          />
          {errors.latitude && (
            <span className="im-stepper-field-error">{errors.latitude}</span>
          )}
        </div>
        <div className="im-stepper-field">
          <Input
            label={t("longitude")}
            name="longitude"
            value={data.longitude || ""}
            onChange={handleInputChange}
            placeholder={t("longitudePlaceholder")}
            disabled={disabled}
          />
          {errors.longitude && (
            <span className="im-stepper-field-error">{errors.longitude}</span>
          )}
        </div>
      </div>

      <div className="im-stepper-row im-stepper-row--two">
        <div className="im-stepper-field">
          <Input
            label={t("phone")}
            name="phone"
            value={data.phone}
            onChange={handleInputChange}
            placeholder={t("phonePlaceholder")}
            disabled={disabled}
          />
        </div>
        <div className="im-stepper-field">
          <Input
            label={t("email")}
            name="email"
            type="email"
            value={data.email}
            onChange={handleInputChange}
            placeholder={t("emailPlaceholder")}
            disabled={disabled}
          />
          {errors.email && (
            <span className="im-stepper-field-error">{errors.email}</span>
          )}
        </div>
      </div>

      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <Input
            label={t("website")}
            name="website"
            value={data.website}
            onChange={handleInputChange}
            placeholder={t("websitePlaceholder")}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
