/**
 * Organization types for admin UI
 */

import { SportType } from "@/constants/sports";
import type { EntityLogoMetadata } from "@/components/ui/EntityLogo";

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
  logo?: string | null;
  heroImage?: string | null;
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
  logo?: string;
  heroImage?: string;
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
  logo?: string | null;
  heroImage?: string | null;
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
    // If metadata is already an object (from API response), validate and return it
    if (typeof metadata === 'object') {
      // Basic validation - ensure it's a plain object
      if (Object.prototype.toString.call(metadata) === '[object Object]') {
        return metadata as OrganizationMetadata;
      }
      return undefined;
    }
    
    // If metadata is a string (from database), parse it
    return JSON.parse(metadata) as OrganizationMetadata;
  } catch {
    // Invalid JSON
    return undefined;
  }
}
