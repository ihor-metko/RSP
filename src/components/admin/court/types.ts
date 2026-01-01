import type { Court } from "@/types/court";

export interface CourtPriceRule {
  id: string;
  courtId: string;
  ruleType: string;
  dayOfWeek: number | null;
  date: string | null;
  holidayId: string | null;
  startTime: string;
  endTime: string;
  priceCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClubBusinessHour {
  id: string;
  clubId: string;
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export interface CourtClub {
  id: string;
  name: string;
  businessHours: ClubBusinessHour[];
}

export interface CourtDetail extends Court {
  club: CourtClub;
  courtPriceRules: CourtPriceRule[];
}
