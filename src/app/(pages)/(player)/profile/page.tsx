"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, EmptyState } from "@/components/ui";
import { useCurrentLocale } from "@/hooks/useCurrentLocale";
import { useAuthGuardOnce } from "@/hooks";
import { formatDateWithWeekday, formatTime } from "@/utils/date";
import { useUserStore } from "@/stores/useUserStore";
import "./profile.css";

interface Booking {
  id: string;
  courtId: string;
  start: string;
  end: string;
  price: number;
  status: string;
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
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [pastLoading, setPastLoading] = useState(true);

  // Redirect root admins to admin dashboard
  useEffect(() => {
    if (!isHydrated || isLoading) return;
    if (user?.isRoot) {
      router.push("/admin/dashboard");
    }
  }, [isHydrated, isLoading, user, router]);

  // Fetch upcoming bookings
  const fetchUpcomingBookings = useCallback(async () => {
    if (!user?.id) return;

    setUpcomingLoading(true);

    try {
      const response = await fetch(`/api/bookings?upcoming=true`);
      if (response.ok) {
        const data = await response.json();
        setUpcomingBookings(Array.isArray(data) ? data : []);
      } else if (response.status === 401) {
        router.push("/auth/sign-in");
      }
    } catch (error) {
      console.error("Failed to fetch upcoming bookings:", error);
    } finally {
      setUpcomingLoading(false);
    }
  }, [user?.id, router]);

  // Fetch past bookings
  const fetchPastBookings = useCallback(async () => {
    if (!user?.id) return;

    setPastLoading(true);

    try {
      const response = await fetch(`/api/bookings?upcoming=false`);
      if (response.ok) {
        const data = await response.json();
        setPastBookings(Array.isArray(data) ? data : []);
      } else if (response.status === 401) {
        router.push("/auth/sign-in");
      }
    } catch (error) {
      console.error("Failed to fetch past bookings:", error);
    } finally {
      setPastLoading(false);
    }
  }, [user?.id, router]);

  // Initial data fetch
  useEffect(() => {
    if (isLoggedIn && user && !user.isRoot) {
      fetchUpcomingBookings();
      fetchPastBookings();
    }
  }, [isLoggedIn, user, fetchUpcomingBookings, fetchPastBookings]);

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "confirmed":
      case "completed":
        return "im-status-badge--success";
      case "reserved":
        return "im-status-badge--warning";
      case "cancelled":
        return "im-status-badge--error";
      default:
        return "im-status-badge--default";
    }
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
              <div className="im-bookings-list">
                {upcomingBookings.map((booking) => (
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
                      <span className={`im-status-badge ${getStatusBadgeClass(booking.status)}`}>
                        {t(`common.${booking.status}`) || booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="im-bookings-list">
                {pastBookings.map((booking) => (
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
                      <span className={`im-status-badge ${getStatusBadgeClass(booking.status)}`}>
                        {t(`common.${booking.status}`) || booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
