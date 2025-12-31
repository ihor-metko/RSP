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

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { isValidImageUrl, getImageUrl } from "@/utils/image";
import { EntityLogo } from "./EntityLogo";
import type { EntityLogoMetadata } from "./EntityLogo";
import { Tooltip } from "./Tooltip";

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
   * Banner image alignment focus (optional)
   * Controls the vertical positioning of the background image
   * @default 'center'
   */
  bannerAlignment?: 'top' | 'center' | 'bottom';

  /**
   * Logo image URL (optional)
   * If logoMetadata is provided, this may be overridden based on current theme
   */
  logoUrl?: string | null;

  /**
   * Logo metadata for theme-aware display (optional)
   * Contains information about logo themes and alternate logos
   */
  logoMetadata?: EntityLogoMetadata | null;

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
   * When provided, EntityBanner will display a "Published" or "Unpublished" status badge
   * Note: This is now read-only. Publish/unpublish actions should be in DangerZone.
   */
  isPublished?: boolean | null;

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
   * Whether the edit button should be disabled (optional)
   * When true, the edit button will be shown but disabled with a tooltip
   */
  editDisabled?: boolean;

  /**
   * Tooltip message to show when edit button is disabled (optional)
   */
  editDisabledTooltip?: string;

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
  bannerAlignment = 'center',
  logoUrl,
  logoMetadata,
  imageAlt,
  logoAlt,
  isPublished,
  isArchived = false,
  status,
  className = "",
  actions,
  onEdit,
  editDisabled = false,
  editDisabledTooltip,
  hideAdminFeatures = false,
}: EntityBannerProps) {
  // Translations
  const t = useTranslations("entityBanner");

  // Convert stored paths to display URLs
  const heroImageFullUrl = useMemo(() => getImageUrl(imageUrl), [imageUrl]);

  // Memoize validation to avoid unnecessary calls on each render
  const hasHeroImage = useMemo(() => isValidImageUrl(heroImageFullUrl), [heroImageFullUrl]);

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

  // Map alignment to CSS object-position
  const objectPosition = bannerAlignment === 'top' ? 'top' : bannerAlignment === 'bottom' ? 'bottom' : 'center';

  return (
    <section className={`rsp-club-hero ${className}`} data-testid="entity-banner">
      {hasHeroImage && heroImageFullUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageFullUrl}
            alt={imageAlt || t('heroImageAlt', { name: title })}
            className="rsp-club-hero-image"
            style={{ objectPosition }}
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

      {/* Top-right actions (status badge only - destructive actions moved to DangerZone) */}
      {(actions || effectiveStatus) && (
        <div className="rsp-entity-banner-actions">
          {effectiveStatus && (
            <span className={`rsp-entity-status-badge rsp-entity-status-badge--${effectiveStatus.variant}`}>
              {effectiveStatus.label}
            </span>
          )}
          {actions}
        </div>
      )}

      <div className="rsp-club-hero-content">
        <div className="rsp-club-hero-main">
          <EntityLogo
            logoUrl={logoUrl}
            logoMetadata={logoMetadata}
            alt={logoAlt || t('logoAlt', { name: title })}
          />
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
          <Tooltip
            content={editDisabled && editDisabledTooltip ? editDisabledTooltip : ""}
            position="bottom"
          >
            <button
              onClick={editDisabled ? undefined : onEdit}
              className="rsp-entity-banner-edit-btn"
              aria-label={t('editDetails', { name: title })}
              disabled={editDisabled}
              style={editDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {t('edit')}
            </button>
          </Tooltip>
        )}
      </div>
    </section>
  );
}
