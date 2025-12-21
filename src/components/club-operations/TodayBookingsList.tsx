"use client";

import { useTranslations } from "next-intl";
import { Button, BookingStatusBadge, PaymentStatusBadge } from "@/components/ui";
import type { OperationsBooking } from "@/types/booking";
import { formatPrice } from "@/utils/price";
import { canCancelBooking } from "@/utils/bookingStatus";
import "./TodayBookingsList.css";

interface TodayBookingsListProps {
  bookings: OperationsBooking[];
  onViewBooking: (booking: OperationsBooking) => void;
  onCancelBooking: (bookingId: string) => void;
  loading?: boolean;
  clubId?: string;
  onRefresh?: () => void;
}

/**
 * TodayBookingsList component
 * 
 * Displays a list of all bookings for the selected day in a side panel.
 * Shows time, court, customer, status, and action buttons.
 * 
 * Real-time updates are handled by GlobalSocketListener which updates the booking store.
 * This component reactively displays the latest bookings from props.
 */
export function TodayBookingsList({
  bookings,
  onViewBooking,
  onCancelBooking,
  loading = false,
}: TodayBookingsListProps) {
  const t = useTranslations();

  // Sort bookings by start time
  const sortedBookings = [...bookings].sort((a, b) => {
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });

  // Format time
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="im-today-bookings-list">
      <div className="im-today-bookings-header">
        <h3 className="im-today-bookings-title">
          {t("operations.todayBookings")}
        </h3>
        <div className="im-today-bookings-count">
          {bookings.length} {bookings.length === 1 ? t("operations.booking") : t("operations.bookings")}
        </div>
      </div>

      {loading ? (
        <div className="im-today-bookings-loading">
          <div className="im-today-bookings-loading-spinner" />
          <span>{t("common.loading")}</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="im-today-bookings-empty">
          <svg
            className="im-today-bookings-empty-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="im-today-bookings-empty-text">
            {t("operations.noBookingsToday")}
          </p>
        </div>
      ) : (
        <div className="im-today-bookings-items">
          {sortedBookings.map((booking) => (
            <div key={booking.id} className="im-today-booking-item">
              <div className="im-today-booking-time">
                {formatTime(booking.start)} - {formatTime(booking.end)}
              </div>
              <div className="im-today-booking-court">{booking.courtName}</div>
              <div className="im-today-booking-customer">
                {booking.userName || booking.userEmail}
              </div>
              <div className="im-today-booking-details">
                <div className="im-today-booking-statuses">
                  <BookingStatusBadge status={booking.bookingStatus} />
                  <PaymentStatusBadge status={booking.paymentStatus} />
                </div>
                <span className="im-today-booking-price">
                  {formatPrice(booking.price)}
                </span>
              </div>
              <div className="im-today-booking-actions">
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => onViewBooking(booking)}
                >
                  {t("common.view")}
                </Button>
                {canCancelBooking(booking.bookingStatus) && (
                  <Button
                    variant="danger"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(t("operations.confirmCancel"))) {
                        onCancelBooking(booking.id);
                      }
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
