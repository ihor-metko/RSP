"use client";

import { Card, RadioGroup, Select } from "@/components/ui";
import { UploadField } from "../UploadField.client";
import { useTranslations } from "next-intl";
import type { SelectOption } from "@/components/ui/Select";
import type { RadioOption } from "@/components/ui/RadioGroup";
import "./LogoStep.css";

interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

interface LogoFormData {
  logoCount: 'one' | 'two';
  logo: UploadedFile | null;
  logoTheme: 'light' | 'dark';
  logoBackground: 'light' | 'dark';
  secondLogo: UploadedFile | null;
  secondLogoTheme: 'light' | 'dark';
}

interface LogoStepProps {
  formData: unknown;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onChange: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | ((field: string, value: UploadedFile | null | boolean | string) => void);
  translationNamespace?: string;
}

export function LogoStep({ formData, fieldErrors, isSubmitting, onChange, translationNamespace = "organizations.stepper" }: LogoStepProps) {
  const t = useTranslations(translationNamespace);
  const data = formData as LogoFormData;
  const handleChange = onChange as (field: string, value: UploadedFile | null | boolean | string) => void;

  const logoCountOptions: RadioOption[] = [
    { 
      value: 'one', 
      label: t("logoCountOne"),
      description: t("logoCountOneDescription")
    },
    { 
      value: 'two', 
      label: t("logoCountTwo"),
      description: t("logoCountTwoDescription")
    },
  ];

  const themeOptions: SelectOption[] = [
    { value: 'light', label: t("logoThemeLight") },
    { value: 'dark', label: t("logoThemeDark") },
  ];

  const backgroundOptions: RadioOption[] = [
    { 
      value: 'light', 
      label: t("logoBackgroundLight"),
      description: t("logoBackgroundLightDescription")
    },
    { 
      value: 'dark', 
      label: t("logoBackgroundDark"),
      description: t("logoBackgroundDarkDescription")
    },
  ];

  return (
    <Card className="im-stepper-section">
      <h2 className="im-stepper-section-title">{t("logoTitle")}</h2>
      <p className="im-stepper-section-description">
        {t("logoDescription")}
      </p>
      <div className="im-step-content">
        {/* Logo Count Selection */}
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <RadioGroup
              label={t("logoCountLabel")}
              name="logoCount"
              options={logoCountOptions}
              value={data.logoCount}
              onChange={(value) => handleChange('logoCount', value as 'one' | 'two')}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Primary Logo Upload */}
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <UploadField
              label={data.logoCount === 'one' ? t("primaryLogo") : t("firstLogo")}
              value={data.logo}
              onChange={(file) => handleChange('logo', file)}
              aspectRatio="square"
              helperText={t("primaryLogoHelperText")}
              disabled={isSubmitting}
              allowSVG={true}
              themeBackground={data.logoTheme}
            />
            {fieldErrors.logo && (
              <span className="im-stepper-field-error">{fieldErrors.logo}</span>
            )}
          </div>
        </div>

        {/* Logo Background Selection - for display in banners and cards */}
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <RadioGroup
              label={t("logoBackgroundLabel")}
              name="logoBackground"
              options={backgroundOptions}
              value={data.logoBackground}
              onChange={(value) => handleChange('logoBackground', value as 'light' | 'dark')}
              disabled={isSubmitting}
            />
            <p className="im-upload-field-helper im-logo-helper-spacing">
              {t("logoBackgroundHelperText")}
            </p>
          </div>
        </div>

        {/* Theme Selection for Primary Logo - Only show for dual logos */}
        {data.logoCount === 'two' && (
          <div className="im-stepper-row">
            <div className="im-stepper-field">
              <Select
                label={t("firstLogoThemeLabel")}
                options={themeOptions}
                value={data.logoTheme}
                onChange={(value) => handleChange('logoTheme', value)}
                disabled={isSubmitting}
              />
              <p className="im-upload-field-helper im-logo-helper-spacing">
                {t("logoThemeHelperText")}
              </p>
            </div>
          </div>
        )}

        {/* Second Logo Upload (conditional) */}
        {data.logoCount === 'two' && (
          <>
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
                  themeBackground={data.secondLogoTheme}
                />
                {fieldErrors.secondLogo && (
                  <span className="im-stepper-field-error">{fieldErrors.secondLogo}</span>
                )}
              </div>
            </div>

            {/* Theme Selection for Second Logo */}
            <div className="im-stepper-row">
              <div className="im-stepper-field">
                <Select
                  label={t("secondLogoThemeLabel")}
                  options={themeOptions}
                  value={data.secondLogoTheme}
                  onChange={(value) => handleChange('secondLogoTheme', value)}
                  disabled={isSubmitting}
                />
                <p className="im-upload-field-helper im-logo-helper-spacing">
                  {t("logoThemeHelperText")}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
