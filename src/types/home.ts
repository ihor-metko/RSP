/**
 * Shared types for the Home page components
 */

import type { Address } from "./address";

/**
 * Public club card data with indoor/outdoor court counts for display
 * This matches the structure returned by /api/clubs endpoint and used by PublicClubCard
 */
export interface PublicClubCardData {
  id: string;
  name: string;
  shortDescription?: string | null;
  address?: Address | null;
  contactInfo?: string | null;
  openingHours?: string | null;
  logoData?: { url: string; altText?: string; thumbnailUrl?: string } | null;
  bannerData?: { url: string; altText?: string; description?: string; position?: string } | null;
  tags?: string | null;
  createdAt?: string;
  indoorCount?: number;
  outdoorCount?: number;
}

/**
 * Upcoming booking data for personalized section
 */
export interface UpcomingBooking {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  priceCents: number;
  court: {
    id: string;
    name: string;
  };
  club: {
    id: string;
    name: string;
  } | null;
  coach: {
    id: string;
    name: string | null;
  } | null;
}

/**
 * Notification data for personalized section
 */
export interface UserNotification {
  id: string;
  type: string;
  sessionDate: string | null;
  sessionTime: string | null;
  courtInfo: string | null;
  createdAt: string;
}

/**
 * Personalized home data for authenticated users
 */
export interface PersonalizedHomeData {
  upcomingBookings: UpcomingBooking[];
  notifications: UserNotification[];
}
