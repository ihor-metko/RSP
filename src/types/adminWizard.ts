/**
 * Types for the Universal Create Admin Wizard
 */

/**
 * Admin roles that can be assigned through the wizard
 */
export type AdminRole = "ORGANIZATION_ADMIN" | "CLUB_ADMIN" | "OWNER";

/**
 * Context type for admin creation
 */
export type AdminContext = "root" | "organization" | "club";

/**
 * Configuration props for the wizard
 */
export interface CreateAdminWizardConfig {
  /**
   * Pre-selected organization ID (when accessed from org context)
   */
  defaultOrgId?: string;
  
  /**
   * Pre-selected club ID (when accessed from club context)
   */
  defaultClubId?: string;
  
  /**
   * Roles that can be assigned based on the creator's permissions
   */
  allowedRoles: AdminRole[];
  
  /**
   * Current context (determines pre-selection behavior)
   */
  context: AdminContext;
  
  /**
   * Callback when admin is successfully created
   */
  onSuccess?: (userId: string) => void;
  
  /**
   * Callback when wizard is cancelled
   */
  onCancel?: () => void;
}

/**
 * Step 1: Context selection data
 */
export interface ContextSelectionData {
  organizationId: string;
  clubId?: string;
  role: AdminRole;
}

/**
 * Step 2: User data entry
 */
export interface UserData {
  name: string;
  email: string;
  phone: string;
}

/**
 * Complete form data for admin creation
 */
export interface AdminCreationData extends UserData {
  organizationId: string;
  clubId?: string;
  role: AdminRole;
}

/**
 * Organization option for dropdown
 */
export interface OrganizationOption {
  id: string;
  name: string;
  slug: string;
}

/**
 * Club option for dropdown
 */
export interface ClubOption {
  id: string;
  name: string;
  organizationId: string;
}

/**
 * Validation errors for form fields
 */
export interface AdminWizardErrors {
  organizationId?: string;
  clubId?: string;
  role?: string;
  name?: string;
  email?: string;
  phone?: string;
  general?: string;
}
