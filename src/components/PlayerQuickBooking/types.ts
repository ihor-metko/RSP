import { filterPastTimeSlots, getTodayStr } from "@/utils/dateTime";

/**
 * Types for PlayerQuickBooking
 * Universal booking mechanism for player users with support for preselected data
 */

export interface BookingClub {
  id: string;
  name: string;
  slug: string | null;
  location: string;
  city?: string | null;
  timezone?: string | null; // IANA timezone string (e.g., "Europe/Kyiv")
  bannerData?: { url: string; altText?: string; description?: string; position?: string } | null;
  businessHours?: ClubBusinessHours[];
}

export interface ClubBusinessHours {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  openTime: string | null; // "HH:mm" format
  closeTime: string | null; // "HH:mm" format
  isClosed: boolean;
}

export interface BookingCourt {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  surface: string | null;
  indoor: boolean;
  courtFormat?: "SINGLE" | "DOUBLE" | null; // Court format for Padel courts
  defaultPriceCents: number;
  priceCents?: number; // Resolved price for the selected slot
  available?: boolean;
  unavailableReason?: string;
}

export interface BookingDateTime {
  date: string;
  startTime: string;
  duration: number;
}

export interface PlayerBookingStep0Data {
  selectedClubId: string | null;
  selectedClub: BookingClub | null;
}

export interface PlayerBookingStep1Data {
  date: string;
  startTime: string;
  duration: number;
  courtType: "SINGLE" | "DOUBLE";
}

export interface PlayerBookingStep2Data {
  selectedCourtId: string | null;
  selectedCourt: BookingCourt | null;
}

export interface PlayerBookingStep3Data {
  paymentProvider: PaymentProviderInfo | null;
  reservationId: string | null;
  reservationExpiresAt: string | null;
}

export interface PlayerBookingStep4Data {
  bookingId: string | null;
  confirmed: boolean;
}

export interface PaymentProviderInfo {
  id: string;
  name: string;
  displayName: string;
  logoLight: string;
  logoDark: string;
}

// Legacy type for backwards compatibility
export type PaymentMethod = "card" | "apple_pay" | "google_pay";

export interface AlternativeTimeSlot {
  startTime: string;
  availableCourtCount: number;
}

export interface AlternativeDuration {
  duration: number;
  availableCourtCount: number;
}

export interface PlayerQuickBookingState {
  currentStep: number;
  step0: PlayerBookingStep0Data;
  step1: PlayerBookingStep1Data;
  step2: PlayerBookingStep2Data;
  step3: PlayerBookingStep3Data;
  step4: PlayerBookingStep4Data;
  availableClubs: BookingClub[];
  availableCourts: BookingCourt[];
  availableCourtTypes: ("SINGLE" | "DOUBLE")[];
  availablePaymentProviders: PaymentProviderInfo[];
  alternativeDurations: AlternativeDuration[];
  alternativeTimeSlots: AlternativeTimeSlot[];
  isLoadingClubs: boolean;
  isLoadingCourts: boolean;
  isLoadingCourtTypes: boolean;
  isLoadingPaymentProviders: boolean;
  clubsError: string | null;
  courtsError: string | null;
  paymentProvidersError: string | null;
  estimatedPrice: number | null;
  estimatedPriceRange: { min: number; max: number } | null;
  isSubmitting: boolean;
  submitError: string | null;
}

export interface PlayerQuickBookingProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete?: (bookingId: string, courtId: string, date: string, startTime: string, endTime: string) => void;
  // Preselected data to skip steps
  preselectedClubId?: string;
  preselectedCourtId?: string;
  preselectedDateTime?: {
    date: string;
    startTime: string;
    duration: number;
    courtType?: "SINGLE" | "DOUBLE";
  };
  // Optional club data (with business hours) to avoid fetching it again
  preselectedClubData?: BookingClub;
  // Available court types derived from courts (to avoid separate API call)
  availableCourtTypes?: ("SINGLE" | "DOUBLE")[];
}

export interface BookingStepConfig {
  id: number;
  label: string;
  isRequired: boolean;
}

// Default court type - Double courts are most common in Padel
export const DEFAULT_COURT_TYPE: "SINGLE" | "DOUBLE" = "DOUBLE";
export const DEFAULT_DURATION = 120; // 2 hours

// Business hours configuration
export const BUSINESS_START_HOUR = 8;
export const BUSINESS_END_HOUR = 22;
export const DURATION_OPTIONS = [60, 90, 120, 150, 180];

// Get business hours for a specific date
export function getBusinessHoursForDate(
  date: string,
  businessHours?: ClubBusinessHours[]
): { openTime: string; closeTime: string } | null {
  if (!businessHours || businessHours.length === 0) {
    // Fallback to default hours if no business hours configured
    return {
      openTime: `${BUSINESS_START_HOUR.toString().padStart(2, "0")}:00`,
      closeTime: `${BUSINESS_END_HOUR.toString().padStart(2, "0")}:00`,
    };
  }

  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay(); // 0=Sunday, 1=Monday, etc.

  const hoursForDay = businessHours.find((h) => h.dayOfWeek === dayOfWeek);

  if (!hoursForDay || hoursForDay.isClosed || !hoursForDay.openTime || !hoursForDay.closeTime) {
    return null; // Club is closed on this day
  }

  return {
    openTime: hoursForDay.openTime,
    closeTime: hoursForDay.closeTime,
  };
}

// Generate time options based on business hours for a specific date
export function generateTimeOptionsForDate(
  date: string,
  businessHours?: ClubBusinessHours[]
): string[] {
  const hours = getBusinessHoursForDate(date, businessHours);

  if (!hours) {
    return []; // Club is closed
  }

  const [openHour, openMinute] = hours.openTime.split(":").map(Number);
  const [closeHour, closeMinute] = hours.closeTime.split(":").map(Number);

  const options: string[] = [];
  let currentHour = openHour;
  let currentMinute = openMinute;

  while (
    currentHour < closeHour ||
    (currentHour === closeHour && currentMinute < closeMinute)
  ) {
    const hourStr = currentHour.toString().padStart(2, "0");
    const minuteStr = currentMinute.toString().padStart(2, "0");
    options.push(`${hourStr}:${minuteStr}`);

    // Increment by 30 minutes
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour += 1;
    }
  }

  // Filter out past times if the date is today using centralized utility
  return filterPastTimeSlots(options, date);
}

// Check if a booking would end after closing time
export function wouldEndAfterClosing(
  date: string,
  startTime: string,
  durationMinutes: number,
  businessHours?: ClubBusinessHours[]
): boolean {
  const hours = getBusinessHoursForDate(date, businessHours);

  if (!hours) {
    return true; // Club is closed
  }

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [closeHour, closeMinute] = hours.closeTime.split(":").map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = startTotalMinutes + durationMinutes;
  const closeTotalMinutes = closeHour * 60 + closeMinute;

  return endTotalMinutes > closeTotalMinutes;
}

// Get valid duration options for a given start time and date
export function getValidDurations(
  date: string,
  startTime: string,
  businessHours?: ClubBusinessHours[]
): number[] {
  return DURATION_OPTIONS.filter(
    (duration) => !wouldEndAfterClosing(date, startTime, duration, businessHours)
  );
}

// Peak hours (17:00 - 21:00 weekdays, 10:00 - 14:00 weekends)
export function isPeakHour(date: string, time: string): boolean {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  const hour = parseInt(time.split(":")[0], 10);

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return hour >= 10 && hour < 14;
  }

  return hour >= 17 && hour < 21;
}

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
  return getTodayStr();
}

// Calculate end time based on start time and duration
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const totalMinutes = startHour * 60 + startMinute + durationMinutes;
  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinute = totalMinutes % 60;
  return `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;
}

// Determine which steps should be visible based on preselected data
export function determineVisibleSteps(
  preselectedClubId?: string,
  preselectedCourtId?: string,
  preselectedDateTime?: { date: string; startTime: string; duration: number }
): BookingStepConfig[] {
  const steps: BookingStepConfig[] = [];

  // Step 0: Club Selection (skip if preselected)
  if (!preselectedClubId) {
    steps.push({ id: 0, label: "selectClub", isRequired: true });
  }

  // Step 1: Date & Time (skip if preselected)
  if (!preselectedDateTime) {
    steps.push({ id: 1, label: "dateTime", isRequired: true });
  }

  // Step 2: Court Selection (skip if preselected)
  if (!preselectedCourtId) {
    steps.push({ id: 2, label: "selectCourt", isRequired: true });
  }

  // Step 2.5: Confirmation (always required before payment)
  steps.push({ id: 2.5, label: "confirmation", isRequired: true });

  // Step 3: Payment (always required for players)
  steps.push({ id: 3, label: "payment", isRequired: true });

  // Step 4: Confirmation (always shown)
  steps.push({ id: 4, label: "finalConfirmation", isRequired: true });

  return steps;
}

// Format date for display (e.g., "Monday, January 6, 2026")
export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

// Format time range for display (e.g., "10:00 - 12:00")
export function formatTimeDisplay(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}
