"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, Button, RadioGroup, Select } from "@/components/ui";
import { UploadField } from "@/components/admin/UploadField.client";
import type { SelectOption } from "@/components/ui/Select";
import type { RadioOption } from "@/components/ui/RadioGroup";

interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

export interface LogoData {
  logoCount: 'one' | 'two';
  logo: UploadedFile | null;
  logoTheme: 'light' | 'dark';
  secondLogo: UploadedFile | null;
  secondLogoTheme: 'light' | 'dark';
}

interface LogoTabProps {
  initialData: LogoData;
  onSave: (files: { logo?: File | null; secondLogo?: File | null; metadata: Record<string, unknown> }) => Promise<void>;
  disabled?: boolean;
  translationNamespace?: string;
}

export function LogoTab({ initialData, onSave, disabled = false, translationNamespace = "organizations.tabs" }: LogoTabProps) {
  const t = useTranslations(translationNamespace);
  const [formData, setFormData] = useState<LogoData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = useCallback((field: string, value: UploadedFile | null | string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const metadata: Record<string, unknown> = {
        logoTheme: formData.logoTheme,
        secondLogoTheme: formData.secondLogoTheme,
        logoCount: formData.logoCount,
      };

      await onSave({
        logo: formData.logo?.file || null,
        secondLogo: formData.secondLogo?.file || null,
        metadata,
      });
      setHasChanges(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.saveFailed");
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const logoCountOptions: RadioOption[] = [
    {
      value: 'one',
      label: t("logo.logoCountOne"),
      description: t("logo.logoCountOneDescription")
    },
    {
      value: 'two',
      label: t("logo.logoCountTwo"),
      description: t("logo.logoCountTwoDescription")
    },
  ];

  const themeOptions: SelectOption[] = [
    { value: 'light', label: t("logo.logoThemeLight") },
    { value: 'dark', label: t("logo.logoThemeDark") },
  ];

  const previewBackgroundOptions: RadioOption[] = [
    {
      value: 'light',
      label: t("logo.logoBackgroundLight"),
      description: t("logo.previewLightDescription")
    },
    {
      value: 'dark',
      label: t("logo.logoBackgroundDark"),
      description: t("logo.previewDarkDescription")
    },
  ];

  // Determine which background to use for preview
  const effectivePreviewBackground = formData.logoCount === 'one'
    ? (formData.logoTheme || 'light')
    : formData.logoTheme;

  return (
    <Card className="im-entity-tab-card">
      <div className="im-entity-tab-header">
        <div>
          <h3 className="im-entity-tab-title">{t("logo.title")}</h3>
          <p className="im-entity-tab-description">{t("logo.description")}</p>
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
          <RadioGroup
            label={t("logo.logoCountLabel")}
            name="logoCount"
            options={logoCountOptions}
            value={formData.logoCount}
            onChange={(value) => handleChange('logoCount', value as 'one' | 'two')}
            disabled={isSaving || disabled}
          />
        </div>

        <div className="im-entity-tab-field">
          <UploadField
            label={formData.logoCount === 'one' ? t("logo.primaryLogo") : t("logo.firstLogo")}
            value={formData.logo}
            onChange={(file) => handleChange('logo', file)}
            aspectRatio="square"
            helperText={t("logo.primaryLogoHelperText")}
            disabled={isSaving || disabled}
            allowSVG={true}
            themeBackground={effectivePreviewBackground}
          />
        </div>

        {/* Preview Background Control - Only show for single logo */}
        {formData.logoCount === 'one' && (
          <div className="im-entity-tab-field">
            <RadioGroup
              label={t("logo.logoBackgroundLabel")}
              name="previewBackground"
              options={previewBackgroundOptions}
              value={formData.logoTheme || 'light'}
              onChange={(value) => handleChange('logoTheme', value as 'light' | 'dark')}
              disabled={isSaving || disabled}
            />
            <p className="im-field-hint">
              {t("logo.logoBackgroundHelperText")}
            </p>
          </div>
        )}

        {/* Theme Selection for Primary Logo - Only show for dual logos */}
        {formData.logoCount === 'two' && (
          <div className="im-entity-tab-field">
            <Select
              label={t("logo.firstLogoThemeLabel")}
              options={themeOptions}
              value={formData.logoTheme}
              onChange={(value) => handleChange('logoTheme', value)}
              disabled={isSaving || disabled}
            />
            <p className="im-field-hint">
              {t("logo.logoThemeHelperText")}
            </p>
          </div>
        )}

        {formData.logoCount === 'two' && (
          <>
            <div className="im-entity-tab-field">
              <UploadField
                label={t("logo.secondLogo")}
                value={formData.secondLogo}
                onChange={(file) => handleChange('secondLogo', file)}
                aspectRatio="square"
                helperText={t("logo.secondLogoHelperText")}
                disabled={isSaving || disabled}
                allowSVG={true}
                themeBackground={formData.secondLogoTheme}
              />
            </div>

            <div className="im-entity-tab-field">
              <Select
                label={t("logo.secondLogoThemeLabel")}
                options={themeOptions}
                value={formData.secondLogoTheme}
                onChange={(value) => handleChange('secondLogoTheme', value)}
                disabled={isSaving || disabled}
              />
              <p className="im-field-hint">
                {t("logo.logoThemeHelperText")}
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
