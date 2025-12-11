import { SportType } from "@/constants/sports";

/**
 * Booking status types
 */
export type BookingStatus = "pending" | "paid" | "cancelled" | "reserved";

/**
 * Basic booking type
 */
export interface Booking {
  id: string;
  userId: string;
  courtId: string;
  coachId: string | null;
  start: string;
  end: string;
  price: number;
  sportType: SportType;
  status: BookingStatus;
  paymentId: string | null;
  createdAt: string;
}

/**
 * Booking with user and court information for display
 */
export interface BookingWithDetails extends Booking {
  userName: string | null;
  userEmail: string;
  courtName: string;
  clubId: string;
  clubName: string;
}

/**
 * Booking for operations calendar view
 */
export interface OperationsBooking {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  courtId: string;
  courtName: string;
  start: string;
  end: string;
  status: BookingStatus;
  price: number;
  sportType: SportType;
  coachId: string | null;
  coachName: string | null;
  createdAt: string;
}

/**
 * Request payload for creating a booking
 */
export interface CreateBookingPayload {
  userId: string;
  courtId: string;
  startTime: string;
  endTime: string;
  clubId?: string;
  coachId?: string;
}

/**
 * Response from creating a booking
 */
export interface CreateBookingResponse {
  bookingId: string;
  courtId: string;
  courtName: string;
  clubName: string;
  userName: string | null;
  userEmail: string;
  startTime: string;
  endTime: string;
  price: number;
  status: BookingStatus;
}

/**
 * Request payload for updating a booking
 */
export interface UpdateBookingPayload {
  status?: BookingStatus;
}
