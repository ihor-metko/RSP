"use client";

import { useState } from "react";
import Image from "next/image";
import "./DocsScreenshot.css";

export type UserRole = "root-admin" | "org-owner" | "org-admin" | "club-owner" | "club-admin" | "player";

export interface DocsImagePlaceholderProps {
  /** User role for the screenshot */
  role: UserRole;
  /** Step name (filename without extension) */
  step: string;
  /** Alt text for the screenshot */
  alt: string;
  /** Optional caption below the screenshot */
  caption?: string;
  /** Additional CSS classes */
  className?: string;
  /** Image format extension (defaults to png) */
  format?: "png" | "webp";
}

/**
 * DocsImagePlaceholder Component
 *
 * Automatically loads screenshots from Storage/docs-screenshots based on role and step.
 * If the screenshot doesn't exist, displays a placeholder.
 *
 * @example
 * <DocsImagePlaceholder
 *   role="club-admin"
 *   step="quick-booking"
 *   alt="Quick booking process"
 *   caption="The quick booking interface for club administrators"
 * />
 */
export function DocsImagePlaceholder({
  role,
  step,
  alt,
  caption,
  className = "",
  format = "png",
}: DocsImagePlaceholderProps) {
  const [imageLoadError, setImageLoadError] = useState(false);

  // Generate the image path based on role and step
  const imagePath = `/docs-screenshots/${role}/${step}.${format}`;

  return (
    <figure className={`im-docs-screenshot ${className}`.trim()}>
      <div className="im-docs-screenshot-container">
        {!imageLoadError ? (
          <Image
            src={imagePath}
            alt={alt}
            className="im-docs-screenshot-image"
            width={800}
            height={600}
            style={{ objectFit: 'contain' }}
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <div className="im-docs-screenshot-placeholder">
            <span className="im-docs-screenshot-placeholder-icon">🖼️</span>
            <span className="im-docs-screenshot-placeholder-text">{alt}</span>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="im-docs-screenshot-caption">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
