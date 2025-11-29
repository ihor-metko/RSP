export interface Court {
  id: string;
  name: string;
  slug?: string | null;
  type?: string | null;
  surface?: string | null;
  indoor: boolean;
  defaultPriceCents: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  status: "available" | "booked" | "partial";
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
