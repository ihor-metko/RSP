"use client";

import { useCallback, useRef } from "react";
import { UploadField } from "@/components/admin/UploadField.client";
import type { UploadedFile } from "@/types/admin";

export type { UploadedFile };

export interface GalleryData {
  logo: UploadedFile | null;
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
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = useCallback(
    (file: UploadedFile | null) => {
      onChange({ logo: file });
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

  return (
    <div className="im-step-content">
      <div className="im-stepper-row">
        <div className="im-stepper-field">
          <UploadField
            label="Club Logo"
            value={data.logo}
            onChange={handleLogoChange}
            aspectRatio="square"
            helperText="Recommended: 512x512 square image"
            disabled={disabled}
          />
          {errors.logo && (
            <span className="im-stepper-field-error">{errors.logo}</span>
          )}
        </div>
      </div>

      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <label className="im-stepper-label">Gallery Photos</label>
          <p className="im-stepper-field-hint" style={{ marginBottom: "0.5rem" }}>
            Add photos of your club facilities
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
              <span>Add Image</span>
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
