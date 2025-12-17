"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "./Button";
import "./ImageUpload.css";

export interface ImageUploadProps {
  /**
   * Current image URL (if any)
   */
  currentImage?: string | null;
  
  /**
   * Label for the upload section
   */
  label: string;
  
  /**
   * Callback when image is selected/changed
   * Returns the data URL of the selected image
   */
  onChange: (imageDataUrl: string | null) => void;
  
  /**
   * Whether the upload is in a loading/saving state
   */
  isLoading?: boolean;
  
  /**
   * Optional error message to display
   */
  error?: string;
  
  /**
   * Aspect ratio hint (e.g., "16:9" for banner, "1:1" for logo)
   */
  aspectRatio?: string;
  
  /**
   * Maximum file size in MB (default: 5)
   */
  maxSizeMB?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * ImageUpload - Component for uploading and previewing images
 * Supports drag-and-drop and click-to-upload
 */
export function ImageUpload({
  currentImage,
  label,
  onChange,
  isLoading = false,
  error,
  aspectRatio,
  maxSizeMB = 5,
  className = "",
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (file: File) => {
      setLocalError("");

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setLocalError("Please select an image file");
        return;
      }

      // Validate file size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        setLocalError(`File size must be less than ${maxSizeMB}MB`);
        return;
      }

      // Read and preview the file
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreview(dataUrl);
        onChange(dataUrl);
      };
      reader.onerror = () => {
        setLocalError("Failed to read file");
      };
      reader.readAsDataURL(file);
    },
    [maxSizeMB, onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onChange]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const displayError = error || localError;

  return (
    <div className={`im-image-upload ${className}`.trim()}>
      <label className="im-image-upload-label">{label}</label>
      {aspectRatio && (
        <p className="im-image-upload-hint">Recommended aspect ratio: {aspectRatio}</p>
      )}

      <div
        className={`im-image-upload-area ${isDragging ? "im-image-upload-area--dragging" : ""} ${
          preview ? "im-image-upload-area--has-image" : ""
        }`.trim()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!preview ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="im-image-upload-input"
          disabled={isLoading}
        />

        {preview ? (
          <div className="im-image-upload-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="im-image-upload-preview-img" />
            <div className="im-image-upload-overlay">
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={handleClick}
                disabled={isLoading}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="danger"
                size="small"
                onClick={handleRemove}
                disabled={isLoading}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="im-image-upload-placeholder">
            <svg
              className="im-image-upload-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className="im-image-upload-text">
              Drag and drop an image here, or click to select
            </p>
            <p className="im-image-upload-size">Max size: {maxSizeMB}MB</p>
          </div>
        )}
      </div>

      {displayError && <p className="im-image-upload-error">{displayError}</p>}
    </div>
  );
}
