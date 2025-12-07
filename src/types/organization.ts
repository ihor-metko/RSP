/**
 * Organization types for admin UI
 */

/**
 * Organization entity
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  address?: string | null;
  metadata?: Record<string, unknown> | null;
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
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payload for updating an organization
 */
export interface UpdateOrganizationPayload {
  name?: string;
  slug?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  address?: string | null;
  metadata?: Record<string, unknown> | null;
}
