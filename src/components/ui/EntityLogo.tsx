"use client";

/**
 * EntityLogo - Reusable logo component with metadata-based background logic
 *
 * This component handles:
 * - Theme-aware logo selection (switching between primary and secondary logos based on theme)
 * - Contrast enhancement (applying background styling when logo doesn't match current theme)
 * - Metadata-driven styling decisions
 *
 * Used by: EntityBanner, AdminOrganizationCard, AdminClubCard, PublicClubCard
 */

import React, { useMemo, useState, useEffect } from "react";
import { isValidImageUrl, getImageUrl } from "@/utils/image";

export interface EntityLogoMetadata {
  /**
   * Theme that the primary logo is designed for
   * - 'light': Logo designed for light backgrounds
   * - 'dark': Logo designed for dark backgrounds
   */
  logoTheme?: 'light' | 'dark';

  /**
   * Alternative logo URL for different theme
   */
  secondLogo?: string | null;

  /**
   * Theme that the secondary logo is designed for
   */
  secondLogoTheme?: 'light' | 'dark';
}

export interface EntityLogoProps {
  /**
   * Primary logo URL (required)
   */
  logoUrl: string | null | undefined;

  /**
   * Logo metadata for theme-aware display (optional)
   * When provided, the component will:
   * - Select appropriate logo based on current theme
   * - Apply contrast enhancement when needed
   */
  logoMetadata?: EntityLogoMetadata | null;

  /**
   * Alt text for the logo image
   */
  alt: string;

  /**
   * Additional CSS classes to apply to the logo
   */
  className?: string;
}

/**
 * EntityLogo component
 * Renders an entity logo with theme-aware selection and contrast enhancement
 */
export function EntityLogo({
  logoUrl,
  logoMetadata,
  alt,
  className = "",
}: EntityLogoProps) {
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

  // Convert stored path to display URL
  const logoFullUrl = useMemo(() => getImageUrl(effectiveLogoUrl), [effectiveLogoUrl]);

  // Validate logo URL
  const hasLogo = useMemo(() => isValidImageUrl(logoFullUrl), [logoFullUrl]);

  // Don't render if no valid logo
  if (!hasLogo || !logoFullUrl) {
    return null;
  }

  // Build complete class list: base logo class + contrast class + custom className
  const logoClasses = [
    'rsp-club-hero-logo', // Base logo styles
    logoContrastClass,    // Contrast enhancement if needed
    className             // Custom classes from parent
  ].filter(Boolean).join(' ');

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={logoFullUrl}
      alt={alt}
      className={logoClasses}
    />
  );
}
