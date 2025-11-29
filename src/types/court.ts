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
}

export interface AvailabilityResponse {
  date: string;
  slots: AvailabilitySlot[];
}
