/**
 * Shared types for the Home page components
 */

/**
 * Club data with indoor/outdoor court counts for display
 */
export interface ClubWithCounts {
  id: string;
  name: string;
  location: string;
  contactInfo?: string | null;
  openingHours?: string | null;
  logo?: string | null;
  indoorCount: number;
  outdoorCount: number;
  shortDescription: string;
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
