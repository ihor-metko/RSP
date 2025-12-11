"use client";

import { useMemo } from "react";
import type { Court } from "@/types/court";
import type { OperationsBooking } from "@/types/booking";
import { BookingBlock } from "./BookingBlock";
import "./DayCalendar.css";

interface DayCalendarProps {
  courts: Court[];
  bookings: OperationsBooking[];
  selectedDate: string;
  startHour?: number;
  endHour?: number;
  slotMinutes?: number;
  onBookingClick: (booking: OperationsBooking) => void;
  onSlotClick: (courtId: string, startTime: Date) => void;
}

/**
 * DayCalendar component
 * 
 * Displays a calendar grid showing all courts as columns and time slots as rows.
 * Bookings are rendered as colored blocks overlaying the grid.
 * 
 * Features:
 * - Configurable time range (default 08:00 - 23:00)
 * - Configurable slot interval (default 30 minutes)
 * - Click on booking to view details
 * - Click on empty slot to create new booking
 * - Responsive grid layout
 */
export function DayCalendar({
  courts,
  bookings,
  selectedDate,
  startHour = 8,
  endHour = 23,
  slotMinutes = 30,
  onBookingClick,
  onSlotClick,
}: DayCalendarProps) {
  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: { hour: number; minute: number; label: string }[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotMinutes) {
        if (hour === endHour && minute > 0) break; // Don't add slots after end hour
        
        const label = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push({ hour, minute, label });
      }
    }
    return slots;
  }, [startHour, endHour, slotMinutes]);

  // Group bookings by court
  const bookingsByCourtId = useMemo(() => {
    const grouped: Record<string, OperationsBooking[]> = {};
    courts.forEach((court) => {
      grouped[court.id] = [];
    });
    bookings.forEach((booking) => {
      if (grouped[booking.courtId]) {
        grouped[booking.courtId].push(booking);
      }
    });
    return grouped;
  }, [courts, bookings]);

  // Handle slot click
  const handleSlotClick = (courtId: string, hour: number, minute: number) => {
    const slotDate = new Date(selectedDate);
    slotDate.setHours(hour, minute, 0, 0);
    onSlotClick(courtId, slotDate);
  };

  return (
    <div className="im-day-calendar">
      <div className="im-day-calendar-grid">
        {/* Header row with court names */}
        <div className="im-day-calendar-header">
          <div className="im-day-calendar-time-header">Time</div>
          {courts.map((court) => (
            <div key={court.id} className="im-day-calendar-court-header">
              <div className="im-day-calendar-court-name">{court.name}</div>
              <div className="im-day-calendar-court-type">
                {court.indoor !== undefined ? (court.indoor ? "Indoor" : "Outdoor") : "Court"}
                {court.type && ` • ${court.type}`}
              </div>
            </div>
          ))}
        </div>

        {/* Time column and court columns */}
        <div className="im-day-calendar-body">
          {/* Time labels column */}
          <div className="im-day-calendar-time-column">
            {timeSlots.map((slot, index) => (
              <div key={index} className="im-day-calendar-time-slot">
                <span className="im-day-calendar-time-label">{slot.label}</span>
              </div>
            ))}
          </div>

          {/* Court columns */}
          {courts.map((court) => (
            <div key={court.id} className="im-day-calendar-court-column">
              {/* Background slots for clicking */}
              {timeSlots.map((slot, index) => (
                <div
                  key={index}
                  className="im-day-calendar-slot"
                  onClick={() => handleSlotClick(court.id, slot.hour, slot.minute)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSlotClick(court.id, slot.hour, slot.minute);
                    }
                  }}
                  aria-label={`Create booking for ${court.name} at ${slot.label}`}
                />
              ))}

              {/* Booking blocks - positioned absolutely within the column */}
              <div className="im-day-calendar-bookings-container">
                {bookingsByCourtId[court.id]?.map((booking) => (
                  <BookingBlock
                    key={booking.id}
                    booking={booking}
                    onClick={onBookingClick}
                    startHour={startHour}
                    endHour={endHour}
                    slotMinutes={slotMinutes}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {courts.length === 0 && (
        <div className="im-day-calendar-empty">
          <p>No courts available for this club.</p>
        </div>
      )}
    </div>
  );
}
