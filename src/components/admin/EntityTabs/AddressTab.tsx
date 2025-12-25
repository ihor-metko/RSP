"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Input, Card, Button } from "@/components/ui";

export interface AddressData {
  country: string;
  city: string;
  postalCode: string;
  street: string;
  latitude: number | null;
  longitude: number | null;
}

interface AddressTabProps {
  initialData: AddressData;
  onSave: (data: AddressData) => Promise<void>;
  disabled?: boolean;
}

export function AddressTab({ initialData, onSave, disabled = false }: AddressTabProps) {
  const t = useTranslations("organizations.tabs");
  const [formData, setFormData] = useState({
    country: initialData.country,
    city: initialData.city,
    postalCode: initialData.postalCode,
    street: initialData.street,
    latitude: initialData.latitude?.toString() || "",
    longitude: initialData.longitude?.toString() || "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [fieldErrors]);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.country.trim()) {
      errors.country = t("validation.countryRequired");
    }
    if (!formData.city.trim()) {
      errors.city = t("validation.cityRequired");
    }
    if (!formData.street.trim()) {
      errors.street = t("validation.streetRequired");
    }
    if (!formData.latitude.trim()) {
      errors.latitude = t("validation.latitudeRequired");
    } else if (isNaN(parseFloat(formData.latitude))) {
      errors.latitude = t("validation.latitudeInvalid");
    } else {
      const lat = parseFloat(formData.latitude);
      if (lat < -90 || lat > 90) {
        errors.latitude = t("validation.latitudeRange");
      }
    }
    if (!formData.longitude.trim()) {
      errors.longitude = t("validation.longitudeRequired");
    } else if (isNaN(parseFloat(formData.longitude))) {
      errors.longitude = t("validation.longitudeInvalid");
    } else {
      const lng = parseFloat(formData.longitude);
      if (lng < -180 || lng > 180) {
        errors.longitude = t("validation.longitudeRange");
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, t]);

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        country: formData.country.trim(),
        city: formData.city.trim(),
        postalCode: formData.postalCode.trim(),
        street: formData.street.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      });
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
          <h3 className="im-entity-tab-title">{t("address.title")}</h3>
          <p className="im-entity-tab-description">{t("address.description")}</p>
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
        <div className="im-entity-tab-row">
          <div className="im-entity-tab-field">
            <Input
              label={t("address.street")}
              name="street"
              value={formData.street}
              onChange={handleChange}
              placeholder={t("address.streetPlaceholder")}
              disabled={isSaving || disabled}
              required
            />
            {fieldErrors.street && (
              <span className="im-field-error">{fieldErrors.street}</span>
            )}
          </div>
        </div>

        <div className="im-entity-tab-row">
          <div className="im-entity-tab-field im-entity-tab-field--half">
            <Input
              label={t("address.city")}
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder={t("address.cityPlaceholder")}
              disabled={isSaving || disabled}
              required
            />
            {fieldErrors.city && (
              <span className="im-field-error">{fieldErrors.city}</span>
            )}
          </div>

          <div className="im-entity-tab-field im-entity-tab-field--half">
            <Input
              label={t("address.postalCode")}
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder={t("address.postalCodePlaceholder")}
              disabled={isSaving || disabled}
            />
            {fieldErrors.postalCode && (
              <span className="im-field-error">{fieldErrors.postalCode}</span>
            )}
          </div>
        </div>

        <div className="im-entity-tab-row">
          <div className="im-entity-tab-field">
            <Input
              label={t("address.country")}
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder={t("address.countryPlaceholder")}
              disabled={isSaving || disabled}
              required
            />
            {fieldErrors.country && (
              <span className="im-field-error">{fieldErrors.country}</span>
            )}
          </div>
        </div>

        <div className="im-entity-tab-row">
          <div className="im-entity-tab-field im-entity-tab-field--half">
            <Input
              label={t("address.latitude")}
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              placeholder={t("address.latitudePlaceholder")}
              disabled={isSaving || disabled}
              required
              type="number"
              step="any"
            />
            {fieldErrors.latitude && (
              <span className="im-field-error">{fieldErrors.latitude}</span>
            )}
          </div>

          <div className="im-entity-tab-field im-entity-tab-field--half">
            <Input
              label={t("address.longitude")}
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              placeholder={t("address.longitudePlaceholder")}
              disabled={isSaving || disabled}
              required
              type="number"
              step="any"
            />
            {fieldErrors.longitude && (
              <span className="im-field-error">{fieldErrors.longitude}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
