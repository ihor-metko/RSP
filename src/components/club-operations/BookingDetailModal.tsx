"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal, Button, BookingStatusBadge, PaymentStatusBadge } from "@/components/ui";
import { useBookingStore } from "@/stores/useBookingStore";
import { formatPrice } from "@/utils/price";
import { showToast } from "@/lib/toast";
import { canCancelBooking } from "@/utils/bookingStatus";
import type { OperationsBooking } from "@/types/booking";
import "./BookingDetailModal.css";

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: OperationsBooking | null;
  onSuccess: () => void;
}

/**
 * BookingDetailModal component
 * 
 * Displays detailed information about a booking.
 * Allows cancellation of non-cancelled bookings.
 */
export function BookingDetailModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: BookingDetailModalProps) {
  const t = useTranslations();
  const cancelBooking = useBookingStore((state) => state.cancelBooking);
  
  const [isCancelling, setIsCancelling] = useState(false);

  if (!booking) {
    return null;
  }

  const handleCancel = async () => {
    if (!confirm(t("operations.confirmCancel") || "Are you sure you want to cancel this booking?")) {
      return;
    }

    setIsCancelling(true);

    try {
      await cancelBooking(booking.id);
      showToast(t("operations.bookingCancelled") || "Booking cancelled successfully", {
        type: "success",
      });
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to cancel booking";
      showToast(errorMessage, { type: "error" });
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = () => {
    const start = new Date(booking.start).getTime();
    const end = new Date(booking.end).getTime();
    return Math.round((end - start) / (1000 * 60));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("operations.bookingDetails") || "Booking Details"}
    >
      <div className="im-booking-detail">
        {/* User Information */}
        <div className="im-booking-detail-section">
          <h4 className="im-booking-detail-section-title">
            {t("operations.userInfo") || "User Information"}
          </h4>
          <div className="im-booking-detail-grid">
            <div className="im-booking-detail-item">
              <span className="im-booking-detail-label">
                {t("common.name") || "Name"}
              </span>
              <span className="im-booking-detail-value">
                {booking.userName || "—"}
              </span>
            </div>
            <div className="im-booking-detail-item">
              <span className="im-booking-detail-label">
                {t("common.email") || "Email"}
              </span>
              <span className="im-booking-detail-value">{booking.userEmail}</span>
            </div>
          </div>
        </div>

        {/* Court Information */}
        <div className="im-booking-detail-section">
          <h4 className="im-booking-detail-section-title">
            {t("operations.courtInfo") || "Court Information"}
          </h4>
          <div className="im-booking-detail-grid">
            <div className="im-booking-detail-item">
              <span className="im-booking-detail-label">
                {t("operations.court") || "Court"}
              </span>
              <span className="im-booking-detail-value">{booking.courtName}</span>
            </div>
            <div className="im-booking-detail-item">
              <span className="im-booking-detail-label">
                {t("operations.sportType") || "Sport Type"}
              </span>
              <span className="im-booking-detail-value">{booking.sportType}</span>
            </div>
          </div>
        </div>

        {/* Booking Details */}
        <div className="im-booking-detail-section">
          <h4 className="im-booking-detail-section-title">
            {t("operations.bookingInfo") || "Booking Information"}
          </h4>
          <div className="im-booking-detail-grid">
            <div className="im-booking-detail-item">
              <span className="im-booking-detail-label">
                {t("operations.startTime") || "Start Time"}
              </span>
              <span className="im-booking-detail-value">
                {formatDateTime(booking.start)}
              </span>
            </div>
            <div className="im-booking-detail-item">
              <span className="im-booking-detail-label">
                {t("operations.endTime") || "End Time"}
              </span>
              <span className="im-booking-detail-value">
                {formatDateTime(booking.end)}
              </span>
            </div>
            <div className="im-booking-detail-item">
              <span className="im-booking-detail-label">
                {t("common.duration") || "Duration"}
              </span>
              <span className="im-booking-detail-value">
                {calculateDuration()} {t("common.minutes") || "minutes"}
              </span>
            </div>
            <div className="im-booking-detail-item">
              <span className="im-booking-detail-label">
                {t("adminBookings.bookingStatus") || "Booking Status"}
              </span>
              <span className="im-booking-detail-value">
                <BookingStatusBadge status={booking.bookingStatus} />
              </span>
            </div>
            <div className="im-booking-detail-item">
              <span className="im-booking-detail-label">
                {t("adminBookings.paymentStatus") || "Payment Status"}
              </span>
              <span className="im-booking-detail-value">
                <PaymentStatusBadge status={booking.paymentStatus} />
              </span>
            </div>
            <div className="im-booking-detail-item">
              <span className="im-booking-detail-label">
                {t("common.price") || "Price"}
              </span>
              <span className="im-booking-detail-value">
                {formatPrice(booking.price)}
              </span>
            </div>
            {booking.coachName && (
              <div className="im-booking-detail-item">
                <span className="im-booking-detail-label">
                  {t("operations.coach") || "Coach"}
                </span>
                <span className="im-booking-detail-value">{booking.coachName}</span>
              </div>
            )}
            <div className="im-booking-detail-item">
              <span className="im-booking-detail-label">
                {t("operations.createdAt") || "Created At"}
              </span>
              <span className="im-booking-detail-value">
                {formatDateTime(booking.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="im-booking-detail-actions">
          <Button variant="outline" onClick={onClose}>
            {t("common.close") || "Close"}
          </Button>
          {canCancelBooking(booking.bookingStatus) && (
            <Button
              variant="danger"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling
                ? t("operations.cancelling") || "Cancelling..."
                : t("operations.cancelBooking") || "Cancel Booking"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
