/**
 * Organization types for admin UI
 */

import { SportType } from "@/constants/sports";

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
  metadata?: Record<string, unknown> | null;
  supportedSports?: SportType[];
  isPublic?: boolean;
}

/**
 * Helper function to parse organization metadata from JSON string or object
 * 
 * @param metadata - Can be a JSON string (from database) or already parsed object (from API)
 * @returns Parsed metadata or undefined if invalid
 */
export function parseOrganizationMetadata(metadata: string | Record<string, unknown> | null | undefined): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  try {
    // If metadata is already an object (from API response), validate and return it
    if (typeof metadata === 'object') {
      // Basic validation - ensure it's a plain object
      if (Object.prototype.toString.call(metadata) === '[object Object]') {
        return metadata;
      }
      return undefined;
    }
    
    // If metadata is a string (from database), parse it
    return JSON.parse(metadata);
  } catch {
    // Invalid JSON
    return undefined;
  }
}
