/**
 * Organization types for admin UI
 */

import { SportType } from "@/constants/sports";
import type { EntityLogoMetadata } from "@/components/ui/EntityLogo";

/**
 * Logo data structure
 */
export interface LogoData {
  url: string;
  altText?: string;
  thumbnailUrl?: string;
}

/**
 * Banner data structure
 */
export interface BannerData {
  url: string;
  altText?: string;
  description?: string;
  position?: 'top' | 'center' | 'bottom';
}

/**
 * Organization entity
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  address?: string | null;
  metadata?: Record<string, unknown> | null;
  isPublic: boolean;
  supportedSports?: SportType[];
  clubCount?: number;
  logoData?: LogoData | null;
  bannerData?: BannerData | null;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  };
  superAdmin?: {
    id: string;
    name: string | null;
    email: string;
    isPrimaryOwner?: boolean;
  } | null;
  superAdmins?: Array<{
    id: string;
    name: string | null;
    email: string;
    isPrimaryOwner: boolean;
  }>;
}

/**
 * Payload for creating a new organization
 */
export interface CreateOrganizationPayload {
  name: string;
  slug?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  logoData?: LogoData;
  bannerData?: BannerData;
  metadata?: Record<string, unknown>;
  supportedSports?: SportType[];
}

/**
 * Payload for updating an organization
 */
export interface UpdateOrganizationPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  address?: string | null;
  logoData?: LogoData | null;
  bannerData?: BannerData | null;
  metadata?: Record<string, unknown> | null;
  supportedSports?: SportType[];
  isPublic?: boolean;
}

/**
 * Organization metadata type extending EntityLogoMetadata
 */
export interface OrganizationMetadata extends EntityLogoMetadata {
  /** Banner image vertical alignment */
  bannerAlignment?: 'top' | 'center' | 'bottom';
}

/**
 * Helper function to parse organization metadata from JSON string or object
 * 
 * @param metadata - Can be a JSON string (from database) or already parsed object (from API)
 * @returns Parsed metadata or undefined if invalid
 */
export function parseOrganizationMetadata(metadata: string | Record<string, unknown> | null | undefined): OrganizationMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  try {
    let parsed: Record<string, unknown>;
    
    // If metadata is already an object (from API response), validate and use it
    if (typeof metadata === 'object') {
      // Basic validation - ensure it's a plain object
      if (Object.prototype.toString.call(metadata) === '[object Object]') {
        parsed = metadata;
      } else {
        return undefined;
      }
    } else {
      // If metadata is a string (from database), parse it
      parsed = JSON.parse(metadata) as Record<string, unknown>;
    }
    
    // Handle backward compatibility: migrate old nested logoMetadata structure
    // Old format: { logoMetadata: { secondLogo, logoTheme, secondLogoTheme } }
    // New format: { secondLogo, logoTheme, secondLogoTheme } (at top level)
    if (parsed.logoMetadata && typeof parsed.logoMetadata === 'object') {
      const logoMetadata = parsed.logoMetadata as Record<string, unknown>;
      
      // Migrate nested properties to top level if not already there
      if (logoMetadata.secondLogo && !parsed.secondLogo) {
        parsed.secondLogo = logoMetadata.secondLogo;
      }
      if (logoMetadata.logoTheme && !parsed.logoTheme) {
        parsed.logoTheme = logoMetadata.logoTheme;
      }
      if (logoMetadata.secondLogoTheme && !parsed.secondLogoTheme) {
        parsed.secondLogoTheme = logoMetadata.secondLogoTheme;
      }
      if (logoMetadata.logoCount && !parsed.logoCount) {
        parsed.logoCount = logoMetadata.logoCount;
      }
    }
    
    return parsed as OrganizationMetadata;
  } catch {
    // Invalid JSON
    return undefined;
  }
}

/**
 * Helper function to parse logo data from JSON string
 * 
 * @param logoData - JSON string from database
 * @returns Parsed logo data or undefined if invalid
 */
export function parseLogoData(logoData: string | null | undefined): LogoData | undefined {
  if (!logoData) {
    return undefined;
  }

  try {
    return JSON.parse(logoData) as LogoData;
  } catch {
    return undefined;
  }
}

/**
 * Helper function to parse banner data from JSON string
 * 
 * @param bannerData - JSON string from database
 * @returns Parsed banner data or undefined if invalid
 */
export function parseBannerData(bannerData: string | null | undefined): BannerData | undefined {
  if (!bannerData) {
    return undefined;
  }

  try {
    return JSON.parse(bannerData) as BannerData;
  } catch {
    return undefined;
  }
}
