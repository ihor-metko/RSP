/**
 * EntityBanner - Reusable banner/hero component for entity detail pages
 * Used for Club Detail and Organization Detail pages
 * 
 * Features:
 * - Sport-agnostic, generic entity banner
 * - Image background with overlay
 * - Optional logo display
 * - Title, subtitle, and location
 * - Responsive and accessible
 * - Placeholder when no image provided
 */

import React from "react";
import { isValidImageUrl } from "@/utils/image";

export interface EntityBannerProps {
  /**
   * Entity name (required)
   */
  title: string;
  
  /**
   * Short description or tagline (optional)
   */
  subtitle?: string | null;
  
  /**
   * Location string (optional)
   */
  location?: string | null;
  
  /**
   * Hero/banner background image URL (optional)
   */
  imageUrl?: string | null;
  
  /**
   * Logo image URL (optional)
   */
  logoUrl?: string | null;
  
  /**
   * Alt text for the hero image
   */
  imageAlt?: string;
  
  /**
   * Alt text for the logo
   */
  logoAlt?: string;
  
  /**
   * Custom CSS class for the banner container
   */
  className?: string;
}

/**
 * EntityBanner component
 * Displays a hero/banner section with background image, logo, title, subtitle, and location
 */
export function EntityBanner({
  title,
  subtitle,
  location,
  imageUrl,
  logoUrl,
  imageAlt,
  logoAlt,
  className = "",
}: EntityBannerProps) {
  const hasHeroImage = isValidImageUrl(imageUrl);
  const hasLogo = isValidImageUrl(logoUrl);
  
  // Generate initials for placeholder if no image
  const placeholderInitial = title ? title.charAt(0).toUpperCase() : "";

  return (
    <section className={`rsp-club-hero ${className}`} data-testid="entity-banner">
      {hasHeroImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl as string}
            alt={imageAlt || `${title} hero image`}
            className="rsp-club-hero-image"
          />
          <div className="rsp-club-hero-overlay" />
        </>
      ) : (
        <div className="rsp-club-hero-placeholder">
          <span className="rsp-club-hero-placeholder-text">
            {placeholderInitial}
          </span>
        </div>
      )}
      <div className="rsp-club-hero-content">
        {hasLogo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={logoUrl as string}
            alt={logoAlt || `${title} logo`}
            className="rsp-club-hero-logo"
          />
        )}
        <h1 className="rsp-club-hero-name">{title}</h1>
        {subtitle && (
          <p className="rsp-club-hero-short-desc">{subtitle}</p>
        )}
        {location && (
          <p className="rsp-club-hero-location">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {location}
          </p>
        )}
      </div>
    </section>
  );
}
