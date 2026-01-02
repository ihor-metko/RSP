"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Input, Textarea, Card, Button } from "@/components/ui";

export interface DetailedInfoData {
  name: string;
  description: string | null;
}

interface DetailedInfoTabProps {
  initialData: DetailedInfoData;
  onSave: (data: DetailedInfoData) => Promise<void>;
  disabled?: boolean;
  translationNamespace?: string;
}

export function DetailedInfoTab({ initialData, onSave, disabled = false, translationNamespace = "courts.tabs" }: DetailedInfoTabProps) {
  const t = useTranslations(translationNamespace);
  const [formData, setFormData] = useState<DetailedInfoData>(initialData);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    if (!formData.name.trim()) {
      errors.name = t("validation.nameRequired");
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
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
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
          <h3 className="im-entity-tab-title">{t("detailedInfo.title")}</h3>
          <p className="im-entity-tab-description">{t("detailedInfo.description")}</p>
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
          <Input
            label={t("detailedInfo.courtName")}
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={t("detailedInfo.courtNamePlaceholder")}
            disabled={isSaving || disabled}
            required
          />
          {fieldErrors.name && (
            <span className="im-field-error">{fieldErrors.name}</span>
          )}
        </div>

        <div className="im-entity-tab-field">
          <Textarea
            label={t("detailedInfo.courtDescription")}
            name="description"
            value={formData.description || ""}
            onChange={handleChange}
            placeholder={t("detailedInfo.courtDescriptionPlaceholder")}
            disabled={isSaving || disabled}
            rows={4}
          />
          {fieldErrors.description && (
            <span className="im-field-error">{fieldErrors.description}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
