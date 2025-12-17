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

import React, { useMemo } from "react";
import { isValidImageUrl, getSupabaseStorageUrl } from "@/utils/image";

/**
 * Location pin icon - reusable SVG component
 */
const LocationIcon = () => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    aria-hidden="true"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

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
   * Status badge (optional) - displays a status indicator
   */
  status?: {
    label: string;
    variant: 'published' | 'draft' | 'active' | 'inactive' | 'archived';
  } | null;
  
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
  status,
  className = "",
}: EntityBannerProps) {
  // Convert stored paths to full Supabase Storage URLs
  const heroImageFullUrl = useMemo(() => getSupabaseStorageUrl(imageUrl), [imageUrl]);
  const logoFullUrl = useMemo(() => getSupabaseStorageUrl(logoUrl), [logoUrl]);
  
  // Memoize validation to avoid unnecessary calls on each render
  const hasHeroImage = useMemo(() => isValidImageUrl(heroImageFullUrl), [heroImageFullUrl]);
  const hasLogo = useMemo(() => isValidImageUrl(logoFullUrl), [logoFullUrl]);
  
  // Generate initials for placeholder if no image
  const placeholderInitial = title ? title.charAt(0).toUpperCase() : "";

  return (
    <section className={`rsp-club-hero ${className}`} data-testid="entity-banner">
      {hasHeroImage && heroImageFullUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageFullUrl}
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
        {hasLogo && logoFullUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={logoFullUrl}
            alt={logoAlt || `${title} logo`}
            className="rsp-club-hero-logo"
          />
        )}
        <h1 className="rsp-club-hero-name">{title}</h1>
        {status && (
          <span className={`rsp-entity-status-badge rsp-entity-status-badge--${status.variant}`}>
            {status.label}
          </span>
        )}
        {subtitle && (
          <p className="rsp-club-hero-short-desc">{subtitle}</p>
        )}
        {location && (
          <p className="rsp-club-hero-location">
            <LocationIcon />
            {location}
          </p>
        )}
      </div>
    </section>
  );
}
