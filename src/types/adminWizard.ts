/**
 * Types for the Universal Create Admin Wizard
 */

/**
 * Admin roles that can be assigned through the wizard
 */
export type AdminRole = "ORGANIZATION_OWNER" | "ORGANIZATION_ADMIN" | "CLUB_OWNER" | "CLUB_ADMIN";

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
 * User source type
 */
export type UserSource = "existing" | "new";

/**
 * Step 2: User source selection
 */
export interface UserSourceData {
  userSource: UserSource;
}

/**
 * Step 3: User data (for existing user search)
 */
export interface ExistingUserData {
  userId: string;
  email: string;
  name: string;
}

/**
 * Step 3: User data (for new user)
 */
export interface NewUserData {
  name: string;
  email: string;
  phone: string;
}

/**
 * Combined user data for the wizard
 */
export type UserData = ExistingUserData | NewUserData;

/**
 * Complete form data for admin creation
 */
export interface AdminCreationData {
  organizationId: string;
  clubId?: string;
  role: AdminRole;
  userSource: UserSource;
  // For existing users
  userId?: string;
  // For new users
  name?: string;
  email?: string;
  phone?: string;
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
  userSource?: string;
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  general?: string;
}
