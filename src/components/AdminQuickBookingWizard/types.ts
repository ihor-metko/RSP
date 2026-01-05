/**
 * Types for AdminQuickBookingWizard
 *
 * This wizard supports multi-step booking flow for admins:
 * - RootAdmin: All steps including organization selection
 * - SuperAdmin (OrgAdmin): All steps except organization (preselected)
 * - ClubAdmin: Skips organization and club selection (preselected)
 */

export interface WizardCourt {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  surface: string | null;
  indoor: boolean;
  defaultPriceCents: number;
  priceCents?: number; // Resolved price for the selected slot
  available?: boolean;
  unavailableReason?: string;
}

export interface WizardOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface WizardClub {
  id: string;
  name: string;
  organizationId: string;
  organizationName?: string;
}

export interface WizardUser {
  id: string;
  name: string | null;
  email: string | null;
}

export interface WizardStepOrganization {
  selectedOrganizationId: string | null;
  selectedOrganization: WizardOrganization | null;
}

export interface WizardStepClub {
  selectedClubId: string | null;
  selectedClub: WizardClub | null;
}

export interface WizardStepUser {
  selectedUserId: string | null;
  selectedUser: WizardUser | null;
  isCreatingNewUser: boolean;
  newUserName: string;
  newUserEmail: string;
  isGuestBooking: boolean;
  guestName: string;
}

export interface WizardStepDateTime {
  date: string;
  startTime: string;
  duration: number;
}

export interface WizardStepCourt {
  selectedCourtId: string | null;
  selectedCourt: WizardCourt | null;
}

export interface WizardStepConfirmation {
  notes: string;
}

/**
 * Admin type for the wizard
 */
export type AdminType = "root_admin" | "organization_admin" | "club_admin";

/**
 * Predefined data for cancel/reschedule or repeated bookings
 */
export interface PredefinedData {
  organizationId?: string;
  clubId?: string;
  userId?: string;
  date?: string;
  startTime?: string;
  duration?: number;
  courtId?: string;
}

export interface WizardState {
  currentStep: number;
  adminType: AdminType;
  stepOrganization: WizardStepOrganization;
  stepClub: WizardStepClub;
  stepUser: WizardStepUser;
  stepDateTime: WizardStepDateTime;
  stepCourt: WizardStepCourt;
  stepConfirmation: WizardStepConfirmation;

  availableOrganizations: WizardOrganization[];
  availableClubs: WizardClub[];
  availableUsers: WizardUser[];
  availableCourts: WizardCourt[];

  isLoadingOrganizations: boolean;
  isLoadingClubs: boolean;
  isLoadingUsers: boolean;
  isLoadingCourts: boolean;

  organizationsError: string | null;
  clubsError: string | null;
  usersError: string | null;
  courtsError: string | null;

  isSubmitting: boolean;
  submitError: string | null;
  isComplete: boolean;
  bookingId: string | null;
}

export interface AdminQuickBookingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete?: (bookingId: string, courtId: string, date: string, startTime: string, endTime: string) => void;
  predefinedData?: PredefinedData;
  adminType: AdminType;
  managedIds: string[]; // Organization IDs for org admin, Club IDs for club admin
}

/**
 * Step configuration for the wizard
 */
export interface WizardStepConfig {
  id: number;
  label: string;
  // Determines if this step should be shown for the admin type
  shouldShow: (adminType: AdminType, predefinedData?: PredefinedData) => boolean;
}

/**
 * Admin wizard steps in order
 * Flow: Organization → Club → DateTime → Court → User → Confirmation
 * This order allows admins to check availability before selecting users
 */
export const ADMIN_WIZARD_STEPS: WizardStepConfig[] = [
  {
    id: 1,
    label: "organization", // Step 1: Select Organization
    shouldShow: (adminType, predefinedData) =>
      adminType === "root_admin" && !predefinedData?.organizationId,
  },
  {
    id: 2,
    label: "club", // Step 2: Select Club
    shouldShow: (adminType, predefinedData) =>
      (adminType === "root_admin" || adminType === "organization_admin") &&
      !predefinedData?.clubId,
  },
  {
    id: 3,
    label: "dateTime", // Step 3: Select Date & Time (check availability first)
    shouldShow: (_, predefinedData) => {
      // If predefined court exists, always show datetime to allow confirmation/adjustment
      if (predefinedData?.courtId) {
        return true;
      }
      // Otherwise, show if date/time is not fully predefined
      return !predefinedData?.date || !predefinedData?.startTime || !predefinedData?.duration;
    },
  },
  {
    id: 4,
    label: "selectCourt", // Step 4: Select Court (from available courts)
    shouldShow: (_, predefinedData) => !predefinedData?.courtId,
  },
  {
    id: 5,
    label: "user", // Step 5: Select/Create User or Guest (after confirming availability)
    shouldShow: (_, predefinedData) => !predefinedData?.userId,
  },
  {
    id: 6,
    label: "confirmation", // Step 6: Review and Confirm
    shouldShow: () => true, // Always show confirmation
  },
];

// Business hours configuration
export const BUSINESS_START_HOUR = 9;
export const BUSINESS_END_HOUR = 22;
export const DURATION_OPTIONS = [60, 90, 120, 150, 180];
export const DEFAULT_DURATION = 120; // 2 hours

// Generate time options for the dropdown
export function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
    const hourStr = hour.toString().padStart(2, "0");
    options.push(`${hourStr}:00`);
    options.push(`${hourStr}:30`);
  }
  return options;
}

// Get today's date in YYYY-MM-DD format
export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

// Calculate end time based on start time and duration
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const totalMinutes = startHour * 60 + startMinute + durationMinutes;
  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinute = totalMinutes % 60;
  return `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;
}

// Format date for display
export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format time for display
export function formatTimeDisplay(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

/**
 * Get the visible steps for the current admin type and predefined data
 */
export function getVisibleSteps(
  adminType: AdminType,
  predefinedData?: PredefinedData
): WizardStepConfig[] {
  return ADMIN_WIZARD_STEPS.filter((step) => step.shouldShow(adminType, predefinedData));
}

/**
 * Get the step number in the visible steps array
 */
export function getVisibleStepNumber(
  stepId: number,
  adminType: AdminType,
  predefinedData?: PredefinedData
): number {
  const visibleSteps = getVisibleSteps(adminType, predefinedData);
  const index = visibleSteps.findIndex((s) => s.id === stepId);
  return index + 1; // 1-based indexing
}

/**
 * Get the next step ID
 */
export function getNextStepId(
  currentStepId: number,
  adminType: AdminType,
  predefinedData?: PredefinedData
): number | null {
  const visibleSteps = getVisibleSteps(adminType, predefinedData);
  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStepId);

  if (currentIndex === -1 || currentIndex === visibleSteps.length - 1) {
    return null;
  }

  return visibleSteps[currentIndex + 1].id;
}

/**
 * Get the previous step ID
 */
export function getPreviousStepId(
  currentStepId: number,
  adminType: AdminType,
  predefinedData?: PredefinedData
): number | null {
  const visibleSteps = getVisibleSteps(adminType, predefinedData);
  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStepId);

  if (currentIndex <= 0) {
    return null;
  }

  return visibleSteps[currentIndex - 1].id;
}

/**
 * Get the first visible step ID
 */
export function getFirstVisibleStepId(
  adminType: AdminType,
  predefinedData?: PredefinedData
): number {
  const visibleSteps = getVisibleSteps(adminType, predefinedData);
  return visibleSteps[0].id;
}
