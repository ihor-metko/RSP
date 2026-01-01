import { SportType } from "@/constants/sports";

export interface Court {
  id: string;
  name: string;
  clubId?: string; // Optional for backward compatibility
  slug?: string | null;
  type?: string | null;
  surface?: string | null;
  indoor: boolean;
  sportType?: SportType | null;
  defaultPriceCents: number;
  imageUrl?: string | null;
  bannerData?: { url: string; altText?: string; description?: string; position?: string } | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Court with club information for admin listings
 */
export interface CourtWithClubInfo extends Court {
  clubId: string;
  isActive?: boolean;
  sportType?: SportType | null;
  club: {
    id: string;
    name: string;
  };
  organization?: {
    id: string;
    name: string;
  } | null;
  bookingCount?: number;
}

/**
 * Detailed court information with price rules
 */
export interface CourtDetail extends Court {
  clubId: string;
  isActive?: boolean;
  club?: {
    id: string;
    name: string;
    businessHours?: Array<{
      id: string;
      dayOfWeek: number;
      openTime: string | null;
      closeTime: string | null;
      isClosed: boolean;
    }>;
  };
  courtPriceRules?: Array<{
    id: string;
    courtId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    priceCents: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

/**
 * Payload for creating a new court
 */
export interface CreateCourtPayload {
  name: string;
  slug?: string | null;
  type?: string | null;
  surface?: string | null;
  indoor?: boolean;
  sportType?: SportType;
  defaultPriceCents?: number;
}

/**
 * Payload for updating a court
 */
export interface UpdateCourtPayload {
  name?: string;
  slug?: string | null;
  type?: string | null;
  surface?: string | null;
  indoor?: boolean;
  sportType?: SportType;
  defaultPriceCents?: number;
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
    sportType?: string;
  }>;
  mode?: AvailabilityMode;
}
