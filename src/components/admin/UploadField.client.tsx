"use client";

import { useState, useRef, useCallback } from "react";
import "./UploadField.css";

interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

interface UploadFieldProps {
  label: string;
  value?: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  accept?: string;
  maxSizeMB?: number;
  required?: boolean;
  helperText?: string;
  aspectRatio?: "square" | "wide" | "auto";
  disabled?: boolean;
}

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function UploadField({
  label,
  value,
  onChange,
  accept = "image/jpeg,image/png,image/webp",
  maxSizeMB = 5,
  required = false,
  helperText,
  aspectRatio = "auto",
  disabled = false,
}: UploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Allowed: JPG, PNG, WebP";
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too large. Maximum size: ${maxSizeMB}MB`;
    }
    return null;
  }, [maxSizeMB]);

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const preview = URL.createObjectURL(file);
    
    // Create a pending upload object
    // The actual upload happens when form is submitted
    onChange({
      url: "", // Will be filled after upload
      key: "", // Will be filled after upload
      file,
      preview,
    });
  }, [validateFile, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [disabled, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    if (value?.preview) {
      URL.revokeObjectURL(value.preview);
    }
    onChange(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [value, onChange]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  const previewUrl = value?.preview || value?.url;
  const aspectClass = aspectRatio === "square" 
    ? "im-upload-field--square" 
    : aspectRatio === "wide" 
      ? "im-upload-field--wide" 
      : "";

  return (
    <div className="im-upload-field-wrapper">
      <label className="im-upload-field-label">
        {label}
        {required && <span className="im-upload-field-required">*</span>}
      </label>
      
      {helperText && (
        <p className="im-upload-field-helper">{helperText}</p>
      )}

      <div
        className={`im-upload-field ${aspectClass} ${isDragging ? "im-upload-field--dragging" : ""} ${disabled ? "im-upload-field--disabled" : ""} ${error ? "im-upload-field--error" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={`Upload ${label}`}
        aria-describedby={error ? `${label}-error` : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="im-upload-field-input"
          disabled={disabled}
          aria-hidden="true"
        />

        {previewUrl ? (
          <div className="im-upload-field-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`${label} preview`}
              className="im-upload-field-image"
            />
            <button
              type="button"
              className="im-upload-field-remove"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              aria-label={`Remove ${label}`}
              disabled={disabled}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="im-upload-field-placeholder">
            <span className="im-upload-field-icon" aria-hidden="true">📷</span>
            <span className="im-upload-field-text">
              Drop image here or click to upload
            </span>
            <span className="im-upload-field-hint">
              JPG, PNG, WebP (max {maxSizeMB}MB)
            </span>
          </div>
        )}
      </div>

      {error && (
        <p id={`${label}-error`} className="im-upload-field-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
