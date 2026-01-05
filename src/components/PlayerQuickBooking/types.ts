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
  bannerData?: { url: string; altText?: string; description?: string; position?: string } | null;
}

export interface BookingCourt {
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
}

export interface PlayerBookingStep2Data {
  selectedCourtId: string | null;
  selectedCourt: BookingCourt | null;
}

export interface PlayerBookingStep3Data {
  paymentMethod: PaymentMethod | null;
}

export interface PlayerBookingStep4Data {
  bookingId: string | null;
  confirmed: boolean;
}

export type PaymentMethod = "card" | "apple_pay" | "google_pay";

export interface PlayerQuickBookingState {
  currentStep: number;
  step0: PlayerBookingStep0Data;
  step1: PlayerBookingStep1Data;
  step2: PlayerBookingStep2Data;
  step3: PlayerBookingStep3Data;
  step4: PlayerBookingStep4Data;
  availableClubs: BookingClub[];
  availableCourts: BookingCourt[];
  alternativeDurations: number[];
  isLoadingClubs: boolean;
  isLoadingCourts: boolean;
  clubsError: string | null;
  courtsError: string | null;
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
  };
}

export interface BookingStepConfig {
  id: number;
  label: string;
  isRequired: boolean;
}

// Business hours configuration
export const BUSINESS_START_HOUR = 8;
export const BUSINESS_END_HOUR = 22;
export const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180];

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
  
  // Step 3: Payment (always required for players)
  steps.push({ id: 3, label: "payment", isRequired: true });
  
  // Step 4: Confirmation (always shown)
  steps.push({ id: 4, label: "confirmation", isRequired: true });
  
  return steps;
}
