"use client";

import { Card, Checkbox, Select } from "@/components/ui";
import { UploadField } from "../UploadField.client";
import { useTranslations } from "next-intl";
import type { SelectOption } from "@/components/ui/Select";
import "./LogoStep.css";

interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

interface LogoFormData {
  logo: UploadedFile | null;
  logoTheme: 'light' | 'dark';
  logoBackground: 'light' | 'dark';
  hasSecondLogo: boolean;
  secondLogo: UploadedFile | null;
}

interface LogoStepProps {
  formData: unknown;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onChange: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | ((field: string, value: UploadedFile | null | boolean | string) => void);
}

export function LogoStep({ formData, fieldErrors, isSubmitting, onChange }: LogoStepProps) {
  const t = useTranslations("organizations.stepper");
  const data = formData as LogoFormData;
  const handleChange = onChange as (field: string, value: UploadedFile | null | boolean | string) => void;

  const themeOptions: SelectOption[] = [
    { value: 'light', label: t("logoThemeLight") },
    { value: 'dark', label: t("logoThemeDark") },
  ];

  const backgroundOptions: SelectOption[] = [
    { value: 'light', label: t("logoBackgroundLight") },
    { value: 'dark', label: t("logoBackgroundDark") },
  ];

  // Determine which logo to show in preview based on current theme selection
  const previewLogo = data.logoTheme === 'light' ? data.logo : (data.hasSecondLogo ? data.secondLogo : data.logo);

  return (
    <Card className="im-stepper-section">
      <h2 className="im-stepper-section-title">{t("logoTitle")}</h2>
      <p className="im-stepper-section-description">
        {t("logoDescription")}
      </p>
      <div className="im-step-content">
        {/* Primary Logo Upload */}
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <UploadField
              label={t("primaryLogo")}
              value={data.logo}
              onChange={(file) => handleChange('logo', file)}
              aspectRatio="square"
              helperText={t("primaryLogoHelperText")}
              disabled={isSubmitting}
              allowSVG={true}
            />
            {fieldErrors.logo && (
              <span className="im-stepper-field-error">{fieldErrors.logo}</span>
            )}
          </div>
        </div>

        {/* Theme and Background Selectors */}
        <div className="im-stepper-row im-logo-step-grid">
          <div className="im-stepper-field">
            <Select
              label={t("logoThemeLabel")}
              options={themeOptions}
              value={data.logoTheme}
              onChange={(value) => handleChange('logoTheme', value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="im-stepper-field">
            <Select
              label={t("logoBackgroundLabel")}
              options={backgroundOptions}
              value={data.logoBackground}
              onChange={(value) => handleChange('logoBackground', value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Live Preview */}
        {previewLogo && (
          <div className="im-stepper-row">
            <div className="im-stepper-field im-stepper-field--full">
              <label className="im-upload-field-label">{t("logoPreview")}</label>
              <div
                className={`im-logo-preview-container ${
                  data.logoBackground === 'light' 
                    ? 'im-logo-preview-container--light' 
                    : 'im-logo-preview-container--dark'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewLogo.preview || previewLogo.url}
                  alt={t("logoPreviewAlt")}
                  className="im-logo-preview-image"
                />
              </div>
              <p className="im-upload-field-helper im-logo-helper-spacing">
                {t("logoPreviewHelperText")}
              </p>
            </div>
          </div>
        )}

        {/* Second Logo Checkbox */}
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <Checkbox
              label={t("hasSecondLogoLabel")}
              checked={data.hasSecondLogo}
              onChange={(e) => handleChange('hasSecondLogo', e.target.checked)}
              disabled={isSubmitting}
            />
            <p className="im-upload-field-helper im-logo-checkbox-helper">
              {t("hasSecondLogoHelperText")}
            </p>
          </div>
        </div>

        {/* Second Logo Upload (conditional) */}
        {data.hasSecondLogo && (
          <div className="im-stepper-row">
            <div className="im-stepper-field im-stepper-field--full">
              <UploadField
                label={t("secondLogo")}
                value={data.secondLogo}
                onChange={(file) => handleChange('secondLogo', file)}
                aspectRatio="square"
                helperText={t("secondLogoHelperText")}
                disabled={isSubmitting}
                allowSVG={true}
              />
              {fieldErrors.secondLogo && (
                <span className="im-stepper-field-error">{fieldErrors.secondLogo}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
