"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, EmptyState } from "@/components/ui";
import { useCurrentLocale } from "@/hooks/useCurrentLocale";
import { useAuthGuardOnce } from "@/hooks";
import { formatDateWithWeekday, formatTime } from "@/utils/date";
import { useUserStore } from "@/stores/useUserStore";
import { PAYMENT_STATUS, type BookingStatus, type PaymentStatus } from "@/types/booking";
import { getPlayerBookingDisplayStatus } from "@/utils/bookingDisplayStatus";
import "./profile.css";

interface Booking {
  id: string;
  courtId: string;
  start: string;
  end: string;
  price: number;
  status: string;
  bookingStatus: string;
  paymentStatus: string;
  cancelReason?: string | null;
  reservationExpiresAt: string | null;
  court?: {
    id: string;
    name: string;
    club?: {
      id: string;
      name: string;
    };
  };
}

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

  // State for bookings
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [activityHistory, setActivityHistory] = useState<Booking[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [pastLoading, setPastLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [resumingPayment, setResumingPayment] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Pagination state
  const ITEMS_PER_PAGE = 5;
  const [hasMoreUpcoming, setHasMoreUpcoming] = useState(true);
  const [hasMorePast, setHasMorePast] = useState(true);
  const [hasMoreActivity, setHasMoreActivity] = useState(true);
  const [loadingMoreUpcoming, setLoadingMoreUpcoming] = useState(false);
  const [loadingMorePast, setLoadingMorePast] = useState(false);
  const [loadingMoreActivity, setLoadingMoreActivity] = useState(false);

  // Redirect root admins to admin dashboard
  useEffect(() => {
    if (!isHydrated || isLoading) return;
    if (user?.isRoot) {
      router.push("/admin/dashboard");
    }
  }, [isHydrated, isLoading, user, router]);

  // Fetch upcoming bookings
  const fetchUpcomingBookings = useCallback(async (loadMore = false) => {
    if (!user?.id) return;

    if (loadMore) {
      setLoadingMoreUpcoming(true);
    } else {
      setUpcomingLoading(true);
    }

    try {
      const skip = loadMore ? upcomingBookings.length : 0;
      const response = await fetch(`/api/bookings?upcoming=true&skip=${skip}&take=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        const newBookings = Array.isArray(data) ? data : [];
        
        if (loadMore) {
          setUpcomingBookings(prev => [...prev, ...newBookings]);
        } else {
          setUpcomingBookings(newBookings);
        }
        
        // If we got fewer items than requested, there are no more items
        setHasMoreUpcoming(newBookings.length === ITEMS_PER_PAGE);
      } else if (response.status === 401) {
        router.push("/auth/sign-in");
      }
    } catch (error) {
      console.error("Failed to fetch upcoming bookings:", error);
    } finally {
      if (loadMore) {
        setLoadingMoreUpcoming(false);
      } else {
        setUpcomingLoading(false);
      }
    }
  }, [user?.id, router, upcomingBookings.length]);

  // Fetch past bookings
  const fetchPastBookings = useCallback(async (loadMore = false) => {
    if (!user?.id) return;

    if (loadMore) {
      setLoadingMorePast(true);
    } else {
      setPastLoading(true);
    }

    try {
      const skip = loadMore ? pastBookings.length : 0;
      const response = await fetch(`/api/bookings?upcoming=false&skip=${skip}&take=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        const newBookings = Array.isArray(data) ? data : [];
        
        if (loadMore) {
          setPastBookings(prev => [...prev, ...newBookings]);
        } else {
          setPastBookings(newBookings);
        }
        
        // If we got fewer items than requested, there are no more items
        setHasMorePast(newBookings.length === ITEMS_PER_PAGE);
      } else if (response.status === 401) {
        router.push("/auth/sign-in");
      }
    } catch (error) {
      console.error("Failed to fetch past bookings:", error);
    } finally {
      if (loadMore) {
        setLoadingMorePast(false);
      } else {
        setPastLoading(false);
      }
    }
  }, [user?.id, router, pastBookings.length]);

  // Fetch activity history (cancelled unpaid bookings)
  const fetchActivityHistory = useCallback(async (loadMore = false) => {
    if (!user?.id) return;

    if (loadMore) {
      setLoadingMoreActivity(true);
    } else {
      setActivityLoading(true);
    }

    try {
      const skip = loadMore ? activityHistory.length : 0;
      const response = await fetch(`/api/activity-history?skip=${skip}&take=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        const newHistory = Array.isArray(data) ? data : [];
        
        if (loadMore) {
          setActivityHistory(prev => [...prev, ...newHistory]);
        } else {
          setActivityHistory(newHistory);
        }
        
        // If we got fewer items than requested, there are no more items
        setHasMoreActivity(newHistory.length === ITEMS_PER_PAGE);
      } else if (response.status === 401) {
        router.push("/auth/sign-in");
      }
    } catch (error) {
      console.error("Failed to fetch activity history:", error);
    } finally {
      if (loadMore) {
        setLoadingMoreActivity(false);
      } else {
        setActivityLoading(false);
      }
    }
  }, [user?.id, router, activityHistory.length]);

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
      
      // Refresh bookings to show updated expiration time
      await fetchUpcomingBookings();
    } catch (error) {
      console.error("Error resuming payment:", error);
      setPaymentError("An error occurred while resuming payment");
    } finally {
      setResumingPayment(null);
    }
  }, [fetchUpcomingBookings]);

  // Initial data fetch
  useEffect(() => {
    if (isLoggedIn && user && !user.isRoot) {
      fetchUpcomingBookings();
      fetchPastBookings();
      fetchActivityHistory();
    }
  }, [isLoggedIn, user, fetchUpcomingBookings, fetchPastBookings, fetchActivityHistory]);

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
            {upcomingLoading ? (
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
                            <span className={`im-status-badge ${getStatusBadgeClass(displayStatus)}`}>
                              {displayStatus}
                            </span>
                          </div>
                          {isUnpaid && (
                            <div className="im-booking-actions">
                              <Button
                                onClick={() => handleResumePayment(booking.id)}
                                disabled={resumingPayment === booking.id}
                                variant="primary"
                                size="small"
                              >
                                {resumingPayment === booking.id 
                                  ? t("playerProfile.resumingPayment") 
                                  : t("playerProfile.payNow")}
                              </Button>
                              {isExpired && (
                                <span className="im-booking-warning">
                                  {t("playerProfile.reservationExpired")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hasMoreUpcoming && (
                  <div style={{ marginTop: "1rem", textAlign: "center" }}>
                    <Button
                      onClick={() => fetchUpcomingBookings(true)}
                      disabled={loadingMoreUpcoming}
                      variant="outline"
                    >
                      {loadingMoreUpcoming ? t("playerProfile.loading") : t("playerProfile.loadMore")}
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
            {pastLoading ? (
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
                          <span className={`im-status-badge ${getStatusBadgeClass(displayStatus)}`}>
                            {displayStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hasMorePast && (
                  <div style={{ marginTop: "1rem", textAlign: "center" }}>
                    <Button
                      onClick={() => fetchPastBookings(true)}
                      disabled={loadingMorePast}
                      variant="outline"
                    >
                      {loadingMorePast ? t("playerProfile.loading") : t("playerProfile.loadMore")}
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
            {activityLoading ? (
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
                        <span className="im-status-badge im-status-badge--neutral">
                          {t("playerProfile.activityHistory.cancelledPaymentTimeout")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMoreActivity && (
                  <div style={{ marginTop: "1rem", textAlign: "center" }}>
                    <Button
                      onClick={() => fetchActivityHistory(true)}
                      disabled={loadingMoreActivity}
                      variant="outline"
                    >
                      {loadingMoreActivity ? t("playerProfile.loading") : t("playerProfile.loadMore")}
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
    </main>
  );
}
