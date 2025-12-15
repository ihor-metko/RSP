"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Modal, Button, Card, BookingStatusBadge } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import { formatDateTime, calculateDuration } from "@/utils/bookingFormatters";
import type { AdminBookingDetailResponse } from "@/app/api/admin/bookings/[id]/route";
import "./BookingDetailsModal.css";

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string | null;
  onBookingCancelled?: () => void;
}

/**
 * Booking Details Modal Component
 * 
 * Displays detailed information about a booking including:
 * - User information
 * - Court and club details
 * - Booking time and duration
 * - Payment information
 * - Dynamic status based on current time
 * 
 * Props:
 * - isOpen: Whether the modal is visible
 * - onClose: Callback when modal is closed
 * - bookingId: ID of the booking to display
 * - onBookingCancelled: Optional callback when booking is cancelled
 */
export function BookingDetailsModal({ 
  isOpen, 
  onClose, 
  bookingId,
  onBookingCancelled 
}: BookingDetailsModalProps) {
  const t = useTranslations();
  const [booking, setBooking] = useState<AdminBookingDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState("");

  // Fetch booking details when modal opens or booking ID changes
  useEffect(() => {
    if (!isOpen || !bookingId) {
      return;
    }

    const fetchBookingDetails = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/admin/bookings/${bookingId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(t("adminBookings.bookingNotFound"));
          }
          if (response.status === 403) {
            throw new Error(t("adminBookings.accessDenied"));
          }
          throw new Error(t("adminBookings.failedToLoadDetails"));
        }

        const data: AdminBookingDetailResponse = await response.json();
        setBooking(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("adminBookings.failedToLoadDetails"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [isOpen, bookingId, t]);

  // Handle booking cancellation
  const handleCancelBooking = async () => {
    if (!booking) return;
    if (!confirm(t("adminBookings.confirmCancel"))) return;

    setIsCancelling(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!response.ok) {
        throw new Error(t("adminBookings.failedToCancel"));
      }

      // Notify parent component
      if (onBookingCancelled) {
        onBookingCancelled();
      }

      // Close modal
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("adminBookings.failedToCancel"));
    } finally {
      setIsCancelling(false);
    }
  };

  // For legacy bookings, we may only have 'status', so we'll display that
  // For new bookings with dual-status, we'd need to update the API to return both fields
  // For now, display the status as-is using the legacy format
  
  // Check if booking can be cancelled based on the status
  const canCancelCurrentBooking = () => {
    if (!booking) return false;
    
    // Legacy: Check the status field
    // Can't cancel if already cancelled or completed or no-show
    const status = booking.status.toLowerCase();
    if (status === "cancelled" || status === "completed" || status === "no-show") {
      return false;
    }
    
    return true;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("adminBookings.bookingDetails")}
    >
      {isLoading ? (
        <div className="im-booking-modal-loading">
          <div className="im-booking-modal-spinner" />
          <span>{t("common.loading")}</span>
        </div>
      ) : error ? (
        <div className="im-booking-modal-error">
          <p>{error}</p>
          <Button variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      ) : booking ? (
        <div className="im-booking-modal">
          {/* User Information Card */}
          <Card className="im-booking-modal-card">
            <div className="im-booking-modal-card-header">
              <svg className="im-booking-modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <h4 className="im-booking-modal-section-title">{t("adminBookings.userInfo")}</h4>
            </div>
            <div className="im-booking-modal-grid">
              <div className="im-booking-modal-field">
                <span className="im-booking-modal-label">{t("common.name")}</span>
                <span className="im-booking-modal-value">{booking.userName || "—"}</span>
              </div>
              <div className="im-booking-modal-field">
                <span className="im-booking-modal-label">{t("common.email")}</span>
                <span className="im-booking-modal-value">{booking.userEmail}</span>
              </div>
            </div>
          </Card>

          {/* Court Information Card */}
          <Card className="im-booking-modal-card">
            <div className="im-booking-modal-card-header">
              <svg className="im-booking-modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              <h4 className="im-booking-modal-section-title">{t("adminBookings.courtInfo")}</h4>
            </div>
            <div className="im-booking-modal-grid">
              <div className="im-booking-modal-field">
                <span className="im-booking-modal-label">{t("adminBookings.court")}</span>
                <span className="im-booking-modal-value">{booking.courtName}</span>
              </div>
              <div className="im-booking-modal-field">
                <span className="im-booking-modal-label">{t("adminBookings.club")}</span>
                <span className="im-booking-modal-value">{booking.clubName}</span>
              </div>
              {booking.courtType && (
                <div className="im-booking-modal-field">
                  <span className="im-booking-modal-label">{t("admin.courts.type")}</span>
                  <span className="im-booking-modal-value">{booking.courtType}</span>
                </div>
              )}
              {booking.courtSurface && (
                <div className="im-booking-modal-field">
                  <span className="im-booking-modal-label">{t("admin.courts.surface")}</span>
                  <span className="im-booking-modal-value">{booking.courtSurface}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Booking Details Card */}
          <Card className="im-booking-modal-card">
            <div className="im-booking-modal-card-header">
              <svg className="im-booking-modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h4 className="im-booking-modal-section-title">{t("adminBookings.bookingInfo")}</h4>
            </div>
            <div className="im-booking-modal-grid">
              <div className="im-booking-modal-field">
                <span className="im-booking-modal-label">{t("adminBookings.bookingStatus")}</span>
                <span className="im-booking-modal-value">
                  <BookingStatusBadge status={booking.status} />
                </span>
              </div>
              <div className="im-booking-modal-field">
                <span className="im-booking-modal-label">{t("common.duration")}</span>
                <span className="im-booking-modal-value">
                  {calculateDuration(booking.start, booking.end)} {t("common.minutes")}
                </span>
              </div>
              <div className="im-booking-modal-field im-booking-modal-field-wide">
                <span className="im-booking-modal-label">{t("adminBookings.dateTime")}</span>
                <span className="im-booking-modal-value im-booking-modal-value-time">
                  {formatDateTime(booking.start)} — {formatDateTime(booking.end)}
                </span>
              </div>
              <div className="im-booking-modal-field">
                <span className="im-booking-modal-label">{t("common.price")}</span>
                <span className="im-booking-modal-value im-booking-modal-value-price">{formatPrice(booking.price)}</span>
              </div>
              {booking.coachName && (
                <div className="im-booking-modal-field im-booking-modal-field-wide">
                  <span className="im-booking-modal-label">{t("adminBookings.coach")}</span>
                  <span className="im-booking-modal-value">{booking.coachName}</span>
                </div>
              )}
              <div className="im-booking-modal-field">
                <span className="im-booking-modal-label">{t("adminBookings.createdAt")}</span>
                <span className="im-booking-modal-value im-booking-modal-value-muted">
                  {formatDateTime(booking.createdAt)}
                </span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="im-booking-modal-actions">
            <Button variant="outline" onClick={onClose}>
              {t("common.close")}
            </Button>
            {canCancelCurrentBooking() && (
              <Button
                variant="danger"
                onClick={handleCancelBooking}
                disabled={isCancelling}
              >
                {isCancelling ? t("adminBookings.cancelling") : t("adminBookings.cancelBooking")}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
