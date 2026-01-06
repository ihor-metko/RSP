/**
 * Types for QuickBookingWizard
 */

import { getTodayStr } from "@/utils/dateTime";

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

export interface WizardStep1Data {
  date: string;
  startTime: string;
  duration: number;
}

export interface WizardStep2Data {
  selectedCourtId: string | null;
  selectedCourt: WizardCourt | null;
}

export interface WizardStep3Data {
  paymentMethod: PaymentMethod | null;
}

export type PaymentMethod = "card" | "apple_pay" | "google_pay";

export interface WizardState {
  currentStep: number;
  step1: WizardStep1Data;
  step2: WizardStep2Data;
  step3: WizardStep3Data;
  availableCourts: WizardCourt[];
  isLoadingCourts: boolean;
  courtsError: string | null;
  estimatedPrice: number | null;
  isSubmitting: boolean;
  submitError: string | null;
  isComplete: boolean;
  bookingId: string | null;
}

export interface QuickBookingWizardProps {
  clubId: string;
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete?: (bookingId: string, courtId: string, date: string, startTime: string, endTime: string) => void;
}

export const WIZARD_STEPS = [
  { id: 1, label: "dateTime" },
  { id: 2, label: "selectCourt" },
  { id: 3, label: "payment" },
] as const;

// Business hours configuration
export const BUSINESS_START_HOUR = 9;
export const BUSINESS_END_HOUR = 22;
export const DURATION_OPTIONS = [60, 90, 120, 150, 180];
export const DEFAULT_DURATION = 120; // 2 hours

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
