"use client";

import { useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { UploadField } from "@/components/admin/UploadField.client";
import { RadioGroup, Select } from "@/components/ui";
import type { UploadedFile } from "@/types/admin";
import type { RadioOption } from "@/components/ui/RadioGroup";
import type { SelectOption } from "@/components/ui/Select";

export type { UploadedFile };

export interface GalleryData {
  logoCount?: 'one' | 'two';
  logo: UploadedFile | null;
  logoTheme?: 'light' | 'dark';
  logoBackground?: 'light' | 'dark';
  secondLogo?: UploadedFile | null;
  secondLogoTheme?: 'light' | 'dark';
  gallery: UploadedFile[];
}

interface GalleryStepProps {
  data: GalleryData;
  onChange: (data: Partial<GalleryData>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function GalleryStep({
  data,
  onChange,
  errors = {},
  disabled = false,
}: GalleryStepProps) {
  const t = useTranslations("admin.clubs.stepper.gallery");
  const tCommon = useTranslations("organizations.stepper");
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = useCallback(
    (file: UploadedFile | null) => {
      onChange({ logo: file });
    },
    [onChange]
  );

  const handleSecondLogoChange = useCallback(
    (file: UploadedFile | null) => {
      onChange({ secondLogo: file });
    },
    [onChange]
  );

  const handleGalleryAdd = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const newItems: UploadedFile[] = files.map((file) => ({
        url: "",
        key: "",
        file,
        preview: URL.createObjectURL(file),
      }));
      onChange({ gallery: [...data.gallery, ...newItems] });
    },
    [data.gallery, onChange]
  );

  const handleGalleryRemove = useCallback(
    (index: number) => {
      const item = data.gallery[index];
      if (item.preview) {
        URL.revokeObjectURL(item.preview);
      }
      onChange({ gallery: data.gallery.filter((_, i) => i !== index) });
    },
    [data.gallery, onChange]
  );

  // Default to 'one' if logoCount is not provided (for backward compatibility)
  const logoCount = data.logoCount || 'one';
  const logoTheme = data.logoTheme || 'light';
  const logoBackground = data.logoBackground || 'light';
  const secondLogoTheme = data.secondLogoTheme || 'dark';

  const logoCountOptions: RadioOption[] = [
    { 
      value: 'one', 
      label: tCommon("logoCountOne"),
      description: tCommon("logoCountOneDescription")
    },
    { 
      value: 'two', 
      label: tCommon("logoCountTwo"),
      description: tCommon("logoCountTwoDescription")
    },
  ];

  const themeOptions: SelectOption[] = [
    { value: 'light', label: tCommon("logoThemeLight") },
    { value: 'dark', label: tCommon("logoThemeDark") },
  ];

  const backgroundOptions: RadioOption[] = [
    { 
      value: 'light', 
      label: tCommon("logoBackgroundLight"),
      description: tCommon("logoBackgroundLightDescription")
    },
    { 
      value: 'dark', 
      label: tCommon("logoBackgroundDark"),
      description: tCommon("logoBackgroundDarkDescription")
    },
  ];

  return (
    <div className="im-step-content">
      {/* Logo Count Selection */}
      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <RadioGroup
            label={tCommon("logoCountLabel")}
            name="logoCount"
            options={logoCountOptions}
            value={logoCount}
            onChange={(value) => onChange({ logoCount: value as 'one' | 'two' })}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Primary Logo Upload */}
      <div className="im-stepper-row">
        <div className="im-stepper-field">
          <UploadField
            label={logoCount === 'one' ? t("clubLogo") : tCommon("firstLogo")}
            value={data.logo}
            onChange={handleLogoChange}
            aspectRatio="square"
            helperText={tCommon("primaryLogoHelperText")}
            disabled={disabled}
            allowSVG={true}
            themeBackground={logoCount === 'one' ? logoBackground : logoTheme}
          />
          {errors.logo && (
            <span className="im-stepper-field-error">{errors.logo}</span>
          )}
        </div>
      </div>

      {/* Background Preview Switcher - Only show for single logo */}
      {logoCount === 'one' && (
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <RadioGroup
              label={tCommon("logoBackgroundLabel")}
              name="logoBackground"
              options={backgroundOptions}
              value={logoBackground}
              onChange={(value) => onChange({ logoBackground: value as 'light' | 'dark' })}
              disabled={disabled}
            />
            <p className="im-upload-field-helper im-logo-helper-spacing">
              {tCommon("logoBackgroundHelperText")}
            </p>
          </div>
        </div>
      )}

      {/* Theme Selection for Primary Logo - Only show for dual logos */}
      {logoCount === 'two' && (
        <div className="im-stepper-row">
          <div className="im-stepper-field">
            <Select
              label={tCommon("firstLogoThemeLabel")}
              options={themeOptions}
              value={logoTheme}
              onChange={(value) => onChange({ logoTheme: value as 'light' | 'dark' })}
              disabled={disabled}
            />
            <p className="im-upload-field-helper im-logo-helper-spacing">
              {tCommon("logoThemeHelperText")}
            </p>
          </div>
        </div>
      )}

      {/* Second Logo Upload (conditional) */}
      {logoCount === 'two' && (
        <>
          <div className="im-stepper-row">
            <div className="im-stepper-field im-stepper-field--full">
              <UploadField
                label={tCommon("secondLogo")}
                value={data.secondLogo || null}
                onChange={handleSecondLogoChange}
                aspectRatio="square"
                helperText={tCommon("secondLogoHelperText")}
                disabled={disabled}
                allowSVG={true}
                themeBackground={secondLogoTheme}
              />
              {errors.secondLogo && (
                <span className="im-stepper-field-error">{errors.secondLogo}</span>
              )}
            </div>
          </div>

          {/* Theme Selection for Second Logo */}
          <div className="im-stepper-row">
            <div className="im-stepper-field">
              <Select
                label={tCommon("secondLogoThemeLabel")}
                options={themeOptions}
                value={secondLogoTheme}
                onChange={(value) => onChange({ secondLogoTheme: value as 'light' | 'dark' })}
                disabled={disabled}
              />
              <p className="im-upload-field-helper im-logo-helper-spacing">
                {tCommon("logoThemeHelperText")}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <label className="im-stepper-label">{t("galleryPhotos")}</label>
          <p className="im-stepper-field-hint" style={{ marginBottom: "0.5rem" }}>
            {t("galleryHint")}
          </p>

          <div className="im-stepper-gallery-grid">
            {data.gallery.map((item, index) => (
              <div key={index} className="im-stepper-gallery-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview || item.url}
                  alt={`Gallery image ${index + 1}`}
                  className="im-stepper-gallery-image"
                />
                <button
                  type="button"
                  className="im-stepper-gallery-remove"
                  onClick={() => handleGalleryRemove(index)}
                  disabled={disabled}
                  aria-label={`Remove gallery image ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              type="button"
              className="im-stepper-gallery-add"
              onClick={() => galleryInputRef.current?.click()}
              disabled={disabled}
            >
              <span className="im-stepper-gallery-add-icon">+</span>
              <span>{t("addImage")}</span>
            </button>
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleGalleryAdd}
            style={{ display: "none" }}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
