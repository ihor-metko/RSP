"use client";

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

import React, { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { isValidImageUrl, getImageUrl } from "@/utils/image";

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
   * If logoMetadata is provided, this may be overridden based on current theme
   */
  logoUrl?: string | null;

  /**
   * Logo metadata for theme-aware display (optional)
   * Contains information about logo themes and alternate logos
   */
  logoMetadata?: {
    logoTheme?: 'light' | 'dark';
    secondLogo?: string | null;
    secondLogoTheme?: 'light' | 'dark';
  } | null;

  /**
   * Alt text for the hero image
   */
  imageAlt?: string;

  /**
   * Alt text for the logo
   */
  logoAlt?: string;

  /**
   * Whether the entity is currently published/public (optional)
   * When provided along with onTogglePublish, EntityBanner will automatically:
   * - Display "Published" or "Unpublished" status badge
   * - Show a "Publish" or "Unpublish" button (opposite of current status)
   */
  isPublished?: boolean | null;

  /**
   * Handler for toggling publish/unpublish status (optional)
   * Required if isPublished is provided and entity is not archived
   */
  onTogglePublish?: () => void | Promise<void>;

  /**
   * Whether the publish/unpublish action is currently processing
   */
  isTogglingPublish?: boolean;

  /**
   * Whether the entity is archived (optional)
   * When true, disables publish/unpublish functionality
   */
  isArchived?: boolean;

  /**
   * Status badge (optional) - displays a status indicator
   * If isPublished is provided, this will be auto-generated unless explicitly set
   */
  status?: {
    label: string;
    variant: 'published' | 'draft' | 'active' | 'inactive' | 'archived';
  } | null;

  /**
   * Custom CSS class for the banner container
   */
  className?: string;

  /**
   * Additional actions to display in the top-right corner (optional)
   * These will be shown alongside the publish/unpublish button if applicable
   */
  actions?: React.ReactNode;

  /**
   * Edit button handler (optional)
   */
  onEdit?: () => void;

  /**
   * Hide admin features (status badge, publish/unpublish button, edit button)
   * When true, the component will only show basic entity information
   * Use this for player/public views where admin controls shouldn't be visible
   */
  hideAdminFeatures?: boolean;
}

/**
 * EntityBanner component
 * Displays a hero/banner section with background image, logo, title, subtitle, and location
 * Includes built-in publish/unpublish functionality when isPublished prop is provided
 * Supports theme-aware logo display when logoMetadata is provided
 */
export function EntityBanner({
  title,
  subtitle,
  location,
  imageUrl,
  logoUrl,
  logoMetadata,
  imageAlt,
  logoAlt,
  isPublished,
  onTogglePublish,
  isTogglingPublish = false,
  isArchived = false,
  status,
  className = "",
  actions,
  onEdit,
  hideAdminFeatures = false,
}: EntityBannerProps) {
  // Translations
  const t = useTranslations("entityBanner");

  // Detect current theme
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    // Initial theme detection
    const checkTheme = () => {
      setIsDarkTheme(document.documentElement.classList.contains("dark"));
    };

    checkTheme();

    // Set up observer to watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Determine which logo to display based on theme and metadata
  const effectiveLogoUrl = useMemo(() => {
    if (!logoMetadata) {
      return logoUrl; // No metadata, use the primary logo
    }

    const currentTheme = isDarkTheme ? 'dark' : 'light';

    // If we have a second logo with theme info
    if (logoMetadata.secondLogo && logoMetadata.secondLogoTheme) {
      // Check if second logo matches current theme
      if (logoMetadata.secondLogoTheme === currentTheme) {
        return logoMetadata.secondLogo;
      }
      // Check if primary logo matches current theme
      if (logoMetadata.logoTheme === currentTheme) {
        return logoUrl;
      }
    }

    // Only one logo, or no theme match - use primary logo
    return logoUrl;
  }, [logoUrl, logoMetadata, isDarkTheme]);

  /**
   * Determine if we need to apply contrast enhancement styles for a universal logo
   * Returns CSS class name for contrast adjustment or empty string
   */
  const logoContrastClass = useMemo(() => {
    // Only apply contrast styles when we have a single universal logo
    if (!logoMetadata || !logoMetadata.logoTheme) {
      return ''; // No metadata, no special styling
    }

    // If we have two separate logos (theme-specific), no contrast adjustment needed
    if (logoMetadata.secondLogo && logoMetadata.secondLogoTheme) {
      return ''; // Theme-specific logos handle this themselves
    }

    const currentTheme = isDarkTheme ? 'dark' : 'light';
    const logoTheme = logoMetadata.logoTheme;

    // Apply contrast enhancement when logo theme doesn't match current theme
    if (logoTheme === 'light' && currentTheme === 'dark') {
      // Light logo on dark background needs a light background for visibility
      return 'rsp-club-hero-logo--contrast-light';
    } else if (logoTheme === 'dark' && currentTheme === 'light') {
      // Dark logo on light background needs a dark background for visibility
      return 'rsp-club-hero-logo--contrast-dark';
    }

    // Logo theme matches current theme, no contrast adjustment needed
    return '';
  }, [logoMetadata, isDarkTheme]);

  // Convert stored paths to display URLs
  const heroImageFullUrl = useMemo(() => getImageUrl(imageUrl), [imageUrl]);
  const logoFullUrl = useMemo(() => getImageUrl(effectiveLogoUrl), [effectiveLogoUrl]);

  // Memoize validation to avoid unnecessary calls on each render
  const hasHeroImage = useMemo(() => isValidImageUrl(heroImageFullUrl), [heroImageFullUrl]);
  const hasLogo = useMemo(() => isValidImageUrl(logoFullUrl), [logoFullUrl]);

  // Generate initials for placeholder if no image
  const placeholderInitial = title ? title.charAt(0).toUpperCase() : "";

  // Auto-generate status badge based on isPublished if not explicitly provided
  const effectiveStatus = useMemo(() => {
    if (hideAdminFeatures) return null; // Don't show status when hiding admin features
    if (status) return status;
    if (isArchived) return { label: t('archived'), variant: 'archived' as const };
    if (isPublished !== null && isPublished !== undefined) {
      return isPublished
        ? { label: t('published'), variant: 'published' as const }
        : { label: t('unpublished'), variant: 'draft' as const };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isArchived, isPublished, hideAdminFeatures]);

  // Determine if we should show the publish/unpublish button
  const showPublishButton = !hideAdminFeatures && !isArchived && isPublished !== null && isPublished !== undefined && onTogglePublish;

  return (
    <section className={`rsp-club-hero ${className}`} data-testid="entity-banner">
      {hasHeroImage && heroImageFullUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageFullUrl}
            alt={imageAlt || t('heroImageAlt', { name: title })}
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

      {/* Top-right actions (status and toggle) */}
      {(actions || effectiveStatus || showPublishButton) && (
        <div className="rsp-entity-banner-actions">
          {effectiveStatus && (
            <span className={`rsp-entity-status-badge rsp-entity-status-badge--${effectiveStatus.variant}`}>
              {effectiveStatus.label}
            </span>
          )}
          {showPublishButton && (
            <button
              onClick={onTogglePublish}
              disabled={isTogglingPublish}
              className={`rsp-entity-banner-toggle-btn ${isPublished ? 'rsp-entity-banner-toggle-btn--unpublish' : 'rsp-entity-banner-toggle-btn--publish'}`}
              aria-label={isPublished ? t('unpublishEntity', { name: title }) : t('publishEntity', { name: title })}
            >
              {isTogglingPublish ? t('processing') : (isPublished ? t('unpublish') : t('publish'))}
            </button>
          )}
          {actions}
        </div>
      )}

      <div className="rsp-club-hero-content">
        <div className="rsp-club-hero-main">
          {hasLogo && logoFullUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoFullUrl}
              alt={logoAlt || t('logoAlt', { name: title })}
              className={`rsp-club-hero-logo ${logoContrastClass}`.trim()}
            />
          )}
          <div className="rsp-club-hero-info">
            <h1 className="rsp-club-hero-name">{title}</h1>
            {location && (
              <p className="rsp-club-hero-location">
                <LocationIcon />
                {location}
              </p>
            )}
            {subtitle && (
              <p className="rsp-club-hero-short-desc">{subtitle}</p>
            )}
          </div>
        </div>
        {onEdit && !hideAdminFeatures && (
          <button
            onClick={onEdit}
            className="rsp-entity-banner-edit-btn"
            aria-label={t('editDetails', { name: title })}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {t('edit')}
          </button>
        )}
      </div>
    </section>
  );
}
