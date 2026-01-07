"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, EmptyState } from "@/components/ui";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useCurrentLocale } from "@/hooks/useCurrentLocale";
import { useAuthGuardOnce } from "@/hooks";
import { formatDateWithWeekday, formatTime, formatPaymentDeadline } from "@/utils/date";
import { formatPrice } from "@/utils/price";
import { useUserStore } from "@/stores/useUserStore";
import { ProfileBooking, useProfileStore } from "@/stores/useProfileStore";
import { PAYMENT_STATUS, type BookingStatus, type PaymentStatus } from "@/types/booking";
import { getPlayerBookingDisplayStatus } from "@/utils/bookingDisplayStatus";
import "./profile.css";

export default function PlayerProfilePage() {
  const router = useRouter();
  const t = useTranslations();
  const currentLocale = useCurrentLocale();

  // Auth guard: Require authentication, redirect root admins to admin dashboard
  const { isHydrated, isLoading, isLoggedIn, user } = useAuthGuardOnce({
    requireAuth: true,
  });

  // Get user info from store
  const userEmail = useUserStore((state) => state.user?.email);

  // Get profile data from store
  const upcomingBookings = useProfileStore((state) => state.upcomingBookings);
  const pastBookings = useProfileStore((state) => state.pastBookings);
  const activityHistory = useProfileStore((state) => state.activityHistory);
  const loading = useProfileStore((state) => state.loading);
  const upcomingLoading = useProfileStore((state) => state.upcomingLoading);
  const pastLoading = useProfileStore((state) => state.pastLoading);
  const activityLoading = useProfileStore((state) => state.activityLoading);
  const hasMoreUpcoming = useProfileStore((state) => state.hasMoreUpcoming);
  const hasMorePast = useProfileStore((state) => state.hasMorePast);
  const hasMoreActivity = useProfileStore((state) => state.hasMoreActivity);
  const fetchProfileDataIfNeeded = useProfileStore((state) => state.fetchProfileDataIfNeeded);
  const invalidateProfile = useProfileStore((state) => state.invalidateProfile);
  const loadMoreUpcoming = useProfileStore((state) => state.loadMoreUpcoming);
  const loadMorePast = useProfileStore((state) => state.loadMorePast);
  const loadMoreActivity = useProfileStore((state) => state.loadMoreActivity);

  // Local state for payment operations
  const [resumingPayment, setResumingPayment] = useState<string | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<ProfileBooking | null>(null);

  // Redirect root admins to admin dashboard
  useEffect(() => {
    if (!isHydrated || isLoading) return;
    if (user?.isRoot) {
      router.push("/admin/dashboard");
    }
  }, [isHydrated, isLoading, user, router]);

  // Resume payment for unpaid booking
  const handleResumePayment = useCallback(async (bookingId: string) => {
    setResumingPayment(bookingId);
    setPaymentError(null);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/resume-payment`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        setPaymentError(errorData.error || "Failed to resume payment");
        return;
      }

      const data = await response.json();

      // NOTE: Payment flow integration is intentionally left as a TODO
      // This PR implements the backend API and UI for resuming payment.
      // The actual payment provider integration (WayForPay/LiqPay) will be
      // implemented in a separate task as it requires additional payment
      // gateway configuration and testing.
      // For now, successfully calling resume-payment extends the reservation
      // by 5 minutes, allowing users to complete payment when the payment
      // flow is integrated.
      console.log("Payment resumed:", data);

      // Invalidate profile data to trigger refresh on next access
      invalidateProfile();

      // Refresh profile data to show updated expiration time
      await fetchProfileDataIfNeeded({ force: true });
    } catch (error) {
      console.error("Error resuming payment:", error);
      setPaymentError("An error occurred while resuming payment");
    } finally {
      setResumingPayment(null);
    }
  }, [invalidateProfile, fetchProfileDataIfNeeded]);

  // Handle cancel booking button click
  const handleCancelClick = useCallback((booking: ProfileBooking) => {
    setBookingToCancel(booking);
    setShowCancelModal(true);
  }, []);

  // Handle confirm cancel booking
  const handleConfirmCancel = useCallback(async () => {
    if (!bookingToCancel) return;

    setCancellingBooking(bookingToCancel.id);
    setPaymentError(null);

    try {
      const response = await fetch(`/api/bookings/${bookingToCancel.id}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        setPaymentError(errorData.error || "Failed to cancel booking");
        return;
      }

      // Close modal and refresh bookings
      setShowCancelModal(false);
      setBookingToCancel(null);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      setPaymentError("An error occurred while cancelling the booking");
    } finally {
      setCancellingBooking(null);
    }
  }, [bookingToCancel]);

  // Handle close cancel modal
  const handleCloseCancelModal = useCallback(() => {
    setShowCancelModal(false);
    setBookingToCancel(null);
  }, []);

  // Initial data fetch - only fetch if user is logged in and not root admin
  useEffect(() => {
    if (isLoggedIn && user && !user.isRoot) {
      fetchProfileDataIfNeeded();
    }
  }, [isLoggedIn, user, fetchProfileDataIfNeeded]);

  // Get status badge class based on combined display status
  const getStatusBadgeClass = (displayStatus: string) => {
    const status = displayStatus.toLowerCase();

    // Error states (cancelled, no-show, missed) - highest priority
    // Note: "Cancelled (Refunded)" will match here and show as error, which is correct
    if (status.includes("cancelled") ||
      status.includes("no-show") ||
      status.includes("missed")) {
      return "im-status-badge--error";
    }

    // Info states (refunded) - for standalone refunded status
    if (status.includes("refunded")) {
      return "im-status-badge--info";
    }

    // Warning states (awaiting payment, payment pending)
    if (status.includes("awaiting payment") ||
      status.includes("payment pending")) {
      return "im-status-badge--warning";
    }

    // Success states (completed, booked, confirmed without payment issues)
    if (status.includes("completed") ||
      status.includes("booked") ||
      status === "confirmed") {
      return "im-status-badge--success";
    }

    return "im-status-badge--default";
  };

  // Loading state
  if (!isHydrated || isLoading) {
    return (
      <main className="im-player-profile min-h-screen p-4 md:p-8">
        <div className="im-loading-skeleton">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse mb-4" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
        </div>
      </main>
    );
  }

  // Guard check - show null for root admins and unauthenticated users
  if (!user || user.isRoot) {
    return null;
  }

  // Get user initials for avatar
  const userInitials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <main className="im-player-profile">
      <div className="im-player-profile-container">
        {/* Header */}
        <header className="im-player-profile-header">
          <h1 className="im-player-profile-title">{t("playerProfile.title")}</h1>
        </header>

        {/* Basic Information Block */}
        <section className="im-profile-section">
          <Card>
            <div className="im-profile-basic-info">
              <div className="im-profile-avatar">
                {userInitials}
              </div>
              <div className="im-profile-info">
                <h2 className="im-profile-name">{user.name || t("users.unnamed")}</h2>
                <p className="im-profile-email">{userEmail || user.email}</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Upcoming Bookings Section */}
        <section className="im-profile-section">
          <Card title={t("playerProfile.upcomingBookings.title")}>
            {loading && upcomingBookings.length === 0 ? (
              <div className="im-bookings-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="im-booking-skeleton" />
                ))}
              </div>
            ) : upcomingBookings.length === 0 ? (
              <EmptyState
                title={t("playerProfile.upcomingBookings.noBookings")}
              />
            ) : (
              <>
                <div className="im-bookings-list">
                  {paymentError && (
                    <div className="im-error-message" role="alert">
                      {paymentError}
                    </div>
                  )}
                  {upcomingBookings.map((booking) => {
                    const isUnpaid = booking.paymentStatus === PAYMENT_STATUS.UNPAID;
                    const isExpired = booking.reservationExpiresAt
                      ? new Date(booking.reservationExpiresAt) < new Date()
                      : false;

                    // Get combined display status
                    const displayStatus = getPlayerBookingDisplayStatus(
                      booking.bookingStatus as BookingStatus,
                      booking.paymentStatus as PaymentStatus
                    );

                    return (
                      <div key={booking.id} className="im-booking-item">
                        <div className="im-booking-details">
                          <div className="im-booking-time">
                            <span className="im-booking-time-range">
                              {formatTime(booking.start, currentLocale)} - {formatTime(booking.end, currentLocale)}
                            </span>

                            <span className="im-booking-date">
                              {formatDateWithWeekday(booking.start, currentLocale)}
                            </span>
                          </div>
                          <div className="im-booking-location">
                            <span className="im-booking-club">{booking.court?.club?.name || ""}</span>
                            <span className="im-booking-court">{booking.court?.name || ""}</span>
                          </div>
                          <div className="im-booking-price">
                            <span className="im-booking-price-label">Price:</span>
                            <span className="im-booking-price-value">{formatPrice(booking.price)}</span>
                          </div>
                          <div className="im-booking-status-row">
                            <span className={`im-status-badge ${getStatusBadgeClass(displayStatus)}`}>
                              {displayStatus}
                            </span>
                          </div>
                        </div>
                        {isUnpaid && (
                          <div className="im-booking-actions">
                            {booking.reservationExpiresAt && (
                              <div className="im-payment-deadline">
                                <span className="im-payment-deadline-label">
                                  {t("playerProfile.payBy", {
                                    deadline: formatPaymentDeadline(booking.reservationExpiresAt, currentLocale)
                                  })}
                                </span>
                              </div>
                            )}
                            <div className="im-booking-action-buttons">
                              <Button
                                onClick={() => handleResumePayment(booking.id)}
                                disabled={resumingPayment === booking.id || isExpired}
                                variant="primary"
                                size="small"
                              >
                                {resumingPayment === booking.id
                                  ? t("playerProfile.resumingPayment")
                                  : t("playerProfile.payNow")}
                              </Button>
                              <Button
                                onClick={() => handleCancelClick(booking)}
                                disabled={cancellingBooking === booking.id || resumingPayment === booking.id}
                                variant="outline"
                                size="small"
                              >
                                {cancellingBooking === booking.id
                                  ? t("playerProfile.cancellingBooking")
                                  : t("playerProfile.cancelBooking")}
                              </Button>
                            </div>
                            <p className="im-warning-text-base im-payment-warning">
                              {t("playerProfile.paymentWarning")}
                            </p>
                            {isExpired && (
                              <span className="im-warning-text-base im-booking-warning">
                                {t("playerProfile.reservationExpired")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {hasMoreUpcoming && (
                  <div style={{ marginTop: "1rem", textAlign: "center" }}>
                    <Button
                      onClick={() => loadMoreUpcoming()}
                      disabled={upcomingLoading}
                      variant="outline"
                    >
                      {upcomingLoading ? t("playerProfile.loading") : t("playerProfile.loadMore")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </section>

        {/* Past Bookings Section */}
        <section className="im-profile-section">
          <Card title={t("playerProfile.pastBookings.title")}>
            {loading && pastBookings.length === 0 ? (
              <div className="im-bookings-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="im-booking-skeleton" />
                ))}
              </div>
            ) : pastBookings.length === 0 ? (
              <EmptyState
                title={t("playerProfile.pastBookings.noBookings")}
              />
            ) : (
              <>
                <div className="im-bookings-list">
                  {pastBookings.map((booking) => {
                    // Get combined display status
                    const displayStatus = getPlayerBookingDisplayStatus(
                      booking.bookingStatus as BookingStatus,
                      booking.paymentStatus as PaymentStatus
                    );

                    return (
                      <div key={booking.id} className="im-booking-item">
                        <div className="im-booking-details">
                          <div className="im-booking-time">
                            <span className="im-booking-date">
                              {formatDateWithWeekday(booking.start, currentLocale)}
                            </span>
                            <span className="im-booking-time-range">
                              {formatTime(booking.start, currentLocale)} - {formatTime(booking.end, currentLocale)}
                            </span>
                          </div>
                          <div className="im-booking-location">
                            <span className="im-booking-club">{booking.court?.club?.name || ""}</span>
                            <span className="im-booking-court">{booking.court?.name || ""}</span>
                          </div>
                          <div className="im-booking-price">
                            <span className="im-booking-price-label">Price:</span>
                            <span className="im-booking-price-value">{formatPrice(booking.price)}</span>
                          </div>
                          <div className="im-booking-status-row">
                            <span className={`im-status-badge ${getStatusBadgeClass(displayStatus)}`}>
                              {displayStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hasMorePast && (
                  <div style={{ marginTop: "1rem", textAlign: "center" }}>
                    <Button
                      onClick={() => loadMorePast()}
                      disabled={pastLoading}
                      variant="outline"
                    >
                      {pastLoading ? t("playerProfile.loading") : t("playerProfile.loadMore")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </section>

        {/* Activity History Section */}
        <section className="im-profile-section">
          <Card title={t("playerProfile.activityHistory.title")}>
            {loading && activityHistory.length === 0 ? (
              <div className="im-bookings-loading">
                {[1, 2].map((i) => (
                  <div key={i} className="im-booking-skeleton" />
                ))}
              </div>
            ) : activityHistory.length === 0 ? (
              <EmptyState
                title={t("playerProfile.activityHistory.noHistory")}
              />
            ) : (
              <>
                <div className="im-bookings-list">
                  {activityHistory.map((booking) => (
                    <div key={booking.id} className="im-booking-item im-booking-item--muted">
                      <div className="im-booking-details">
                        <div className="im-booking-time">
                          <span className="im-booking-date">
                            {formatDateWithWeekday(booking.start, currentLocale)}
                          </span>
                          <span className="im-booking-time-range">
                            {formatTime(booking.start, currentLocale)} - {formatTime(booking.end, currentLocale)}
                          </span>
                        </div>
                        <div className="im-booking-location">
                          <span className="im-booking-club">{booking.court?.club?.name || ""}</span>
                          <span className="im-booking-court">{booking.court?.name || ""}</span>
                        </div>
                        <div className="im-booking-status-row">
                          <span className="im-status-badge im-status-badge--neutral">
                            {t("playerProfile.activityHistory.cancelledPaymentTimeout")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMoreActivity && (
                  <div style={{ marginTop: "1rem", textAlign: "center" }}>
                    <Button
                      onClick={() => loadMoreActivity()}
                      disabled={activityLoading}
                      variant="outline"
                    >
                      {activityLoading ? t("playerProfile.loading") : t("playerProfile.loadMore")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </section>

        {/* Navigation / Actions */}
        <section className="im-profile-actions">
          <Button variant="outline" onClick={() => router.push("/clubs")}>
            {t("playerProfile.actions.backToClubs")}
          </Button>
          <Button onClick={() => router.push("/clubs")}>
            {t("playerProfile.actions.bookNewCourt")}
          </Button>
        </section>
      </div>

      {/* Cancel Booking Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        title={t("playerProfile.cancelConfirmation.title")}
        message={t("playerProfile.cancelConfirmation.message")}
        confirmText={t("playerProfile.cancelConfirmation.confirm")}
        cancelText={t("playerProfile.cancelConfirmation.keep")}
        variant="danger"
        isProcessing={cancellingBooking !== null}
      >
        {bookingToCancel && (
          <div className="im-cancel-booking-details">
            <p><strong>{bookingToCancel.court?.club?.name}</strong> - {bookingToCancel.court?.name}</p>
            <p>{formatDateWithWeekday(bookingToCancel.start, currentLocale)}</p>
            <p>{formatTime(bookingToCancel.start, currentLocale)} - {formatTime(bookingToCancel.end, currentLocale)}</p>
            <p>{formatPrice(bookingToCancel.price)}</p>
          </div>
        )}
      </ConfirmationModal>
    </main>
  );
}
