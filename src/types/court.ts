export interface Court {
  id: string;
  name: string;
  slug?: string | null;
  type?: string | null;
  surface?: string | null;
  indoor: boolean;
  defaultPriceCents: number;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  status: "available" | "booked" | "partial" | "pending";
  priceCents?: number; // Optional price in cents for the slot
}

export interface AvailabilityResponse {
  date: string;
  slots: AvailabilitySlot[];
}

export interface PriceSegment {
  start: string; // "HH:MM" format
  end: string;   // "HH:MM" format
  priceCents: number;
}

export interface PriceTimelineResponse {
  date: string;
  courtId: string;
  defaultPriceCents: number;
  timeline: PriceSegment[];
}

// Weekly availability types
export interface CourtAvailabilityStatus {
  courtId: string;
  courtName: string;
  courtType: string | null;
  indoor: boolean;
  status: "available" | "booked" | "partial" | "pending";
}

export interface HourSlotAvailability {
  hour: number;
  courts: CourtAvailabilityStatus[];
  summary: {
    available: number;
    booked: number;
    partial: number;
    pending: number;
    total: number;
  };
  overallStatus: "available" | "partial" | "booked" | "pending";
}

export interface DayAvailability {
  date: string;
  dayOfWeek: number;
  dayName: string;
  hours: HourSlotAvailability[];
  isToday?: boolean;
}

export type AvailabilityMode = "rolling" | "calendar";

export interface WeeklyAvailabilityResponse {
  weekStart: string;
  weekEnd: string;
  days: DayAvailability[];
  courts: Array<{
    id: string;
    name: string;
    type: string | null;
    indoor: boolean;
  }>;
  mode?: AvailabilityMode;
}
