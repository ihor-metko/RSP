"use client";

import type { OperationsBooking } from "@/types/booking";
import "./BookingBlock.css";

interface BookingBlockProps {
  booking: OperationsBooking;
  onClick: (booking: OperationsBooking) => void;
  startHour: number;
  endHour: number;
  slotMinutes: number;
}

/**
 * BookingBlock component
 * 
 * Displays a booking as a colored block in the calendar grid.
 * The block size and position are calculated based on the booking time and duration.
 * 
 * Color coding by status:
 * - pending: yellow/warning
 * - paid: green/success
 * - reserved: blue/info
 * - cancelled: gray/muted
 */
export function BookingBlock({
  booking,
  onClick,
  startHour,
  endHour,
  slotMinutes,
}: BookingBlockProps) {
  const startTime = new Date(booking.start);
  const endTime = new Date(booking.end);

  // Calculate position and height
  const bookingStartMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const bookingEndMinutes = endTime.getHours() * 60 + endTime.getMinutes();
  const gridStartMinutes = startHour * 60;
  const gridEndMinutes = endHour * 60;

  // Clamp booking to grid boundaries
  const clampedStart = Math.max(bookingStartMinutes, gridStartMinutes);
  const clampedEnd = Math.min(bookingEndMinutes, gridEndMinutes);

  // Calculate position as percentage of total grid height
  const totalMinutes = gridEndMinutes - gridStartMinutes;
  const topOffset = ((clampedStart - gridStartMinutes) / totalMinutes) * 100;
  const height = ((clampedEnd - clampedStart) / totalMinutes) * 100;

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const statusClass = `im-booking-block--${booking.status}`;

  return (
    <div
      className={`im-booking-block ${statusClass}`}
      style={{
        top: `${topOffset}%`,
        height: `${height}%`,
      }}
      onClick={() => onClick(booking)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(booking);
        }
      }}
      aria-label={`Booking for ${booking.userName || booking.userEmail} from ${formatTime(startTime)} to ${formatTime(endTime)}`}
    >
      <div className="im-booking-block-content">
        <div className="im-booking-block-time">
          {formatTime(startTime)} - {formatTime(endTime)}
        </div>
        <div className="im-booking-block-customer">
          {booking.userName || booking.userEmail}
        </div>
        <div className="im-booking-block-status-badge">
          {booking.status}
        </div>
      </div>
    </div>
  );
}
