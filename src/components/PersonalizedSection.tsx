"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, Button } from "@/components/ui";
import { QuickBookingModal } from "@/components/QuickBookingModal";
import { useCurrentLocale } from "@/hooks/useCurrentLocale";

interface UpcomingBooking {
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

interface Notification {
  id: string;
  type: string;
  sessionDate: string | null;
  sessionTime: string | null;
  courtInfo: string | null;
  createdAt: string;
}

interface HomeData {
  upcomingBookings: UpcomingBooking[];
  notifications: Notification[];
}

interface Club {
  id: string;
  name: string;
  location: string;
}

interface PersonalizedSectionProps {
  userName: string;
}

// Format date for display
function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === "uk" ? "uk-UA" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Format time for display
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Map notification types to readable text
function getNotificationMessage(type: string, t: (key: string) => string): string {
  switch (type) {
    case "REQUESTED":
      return t("home.personalized.notificationRequested");
    case "ACCEPTED":
      return t("home.personalized.notificationAccepted");
    case "DECLINED":
      return t("home.personalized.notificationDeclined");
    case "CANCELED":
      return t("home.personalized.notificationCanceled");
    default:
      return type;
  }
}

export function PersonalizedSection({ userName }: PersonalizedSectionProps) {
  const router = useRouter();
  const t = useTranslations();
  const currentLocale = useCurrentLocale();

  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clubs for quick booking
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [clubsLoading, setClubsLoading] = useState(true);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);

  // Fetch personalized home data
  const fetchHomeData = useCallback(async () => {
    try {
      const response = await fetch("/api/home");
      if (response.ok) {
        const data = await response.json();
        setHomeData(data);
      } else if (response.status === 401) {
        // Not authenticated - this shouldn't happen as component is only shown for auth users
        setError("Unauthorized");
      } else {
        setError(t("auth.errorOccurred"));
      }
    } catch {
      setError(t("auth.errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Fetch clubs for quick booking
  const fetchClubs = useCallback(async () => {
    try {
      const response = await fetch("/api/clubs?limit=10");
      if (response.ok) {
        const data = await response.json();
        setClubs(data);
        if (data.length > 0 && !selectedClubId) {
          setSelectedClubId(data[0].id);
        }
      }
    } catch {
      // Silently fail - not critical
    } finally {
      setClubsLoading(false);
    }
  }, [selectedClubId]);

  useEffect(() => {
    fetchHomeData();
    fetchClubs();
  }, [fetchHomeData, fetchClubs]);

  // Handle quick booking court selection
  // Note: priceCents is passed by QuickBookingModal but not used in navigation
  const handleQuickBookingSelectCourt = (courtId: string, date: string, startTime: string, endTime: string) => {
    router.push(`/clubs/${selectedClubId}?courtId=${courtId}&date=${date}&start=${startTime}&end=${endTime}`);
    setIsQuickBookingOpen(false);
  };

  // Handle booking click - navigate to club page
  const handleBookingClick = (booking: UpcomingBooking) => {
    if (booking.club?.id) {
      router.push(`/clubs/${booking.club.id}`);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="tm-personalized-section py-8 px-4 md:px-8" aria-label={t("home.personalized.title")}>
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="tm-personalized-block">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
                <div className="space-y-3">
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="tm-personalized-section py-8 px-4 md:px-8" aria-label={t("home.personalized.title")}>
        <div className="max-w-6xl mx-auto">
          <div className="tm-error-banner p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded" role="alert">
            {error}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="tm-personalized-section bg-gray-50 dark:bg-gray-900/50 py-8 px-4 md:px-8" aria-label={t("home.personalized.title")}>
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          {t("home.personalized.greeting", { name: userName })}
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Upcoming Bookings Block */}
          <Card title={t("home.personalized.upcomingBookings")} className="tm-personalized-bookings">
            {homeData?.upcomingBookings && homeData.upcomingBookings.length > 0 ? (
              <div className="space-y-3" role="list" aria-label={t("home.personalized.upcomingBookings")}>
                {homeData.upcomingBookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => handleBookingClick(booking)}
                    className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--rsp-primary)]"
                    role="listitem"
                    aria-label={`${t("booking.book")} - ${formatDate(booking.startTime, currentLocale)} ${formatTime(booking.startTime)}`}
                  >
                    <div className="font-medium text-sm">
                      {formatDate(booking.startTime, currentLocale)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {booking.club?.name} - {booking.court.name}
                    </div>
                    {booking.coach?.name && (
                      <div className="text-sm text-[var(--rsp-primary)]">
                        {t("training.history.trainer")}: {booking.coach.name}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="tm-empty-state text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t("home.personalized.noUpcomingBookings")}
                </p>
              </div>
            )}
          </Card>

          {/* Quick Booking Block */}
          <Card title={t("home.personalized.quickBooking")} className="tm-personalized-quick-booking">
            <div className="space-y-4">
              {clubsLoading ? (
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                <>
                  <div>
                    <label htmlFor="quick-club-select" className="block text-sm font-medium mb-2">
                      {t("playerDashboard.quickBook.selectClub")}
                    </label>
                    <select
                      id="quick-club-select"
                      className="tm-booking-select w-full"
                      value={selectedClubId}
                      onChange={(e) => setSelectedClubId(e.target.value)}
                      aria-label={t("playerDashboard.quickBook.selectClub")}
                    >
                      {clubs.length === 0 ? (
                        <option value="">{t("playerDashboard.quickBook.noClubs")}</option>
                      ) : (
                        clubs.map((club) => (
                          <option key={club.id} value={club.id}>
                            {club.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <Button
                    onClick={() => setIsQuickBookingOpen(true)}
                    disabled={!selectedClubId || clubs.length === 0}
                    className="w-full"
                    aria-label={t("home.personalized.findCourt")}
                  >
                    {t("home.personalized.findCourt")}
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Notifications Block */}
          <Card title={t("home.personalized.notifications")} className="tm-personalized-notifications">
            {homeData?.notifications && homeData.notifications.length > 0 ? (
              <div className="space-y-3" role="list" aria-label={t("home.personalized.notifications")}>
                {homeData.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 bg-white dark:bg-gray-800 rounded-lg"
                    role="listitem"
                  >
                    <div className="font-medium text-sm">
                      {getNotificationMessage(notification.type, t)}
                    </div>
                    {notification.sessionDate && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(notification.sessionDate, currentLocale)}
                        {notification.sessionTime && ` - ${notification.sessionTime}`}
                      </div>
                    )}
                    {notification.courtInfo && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {notification.courtInfo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="tm-empty-state text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t("home.personalized.noNotifications")}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Quick Booking Modal */}
      {selectedClubId && (
        <QuickBookingModal
          clubId={selectedClubId}
          isOpen={isQuickBookingOpen}
          onClose={() => setIsQuickBookingOpen(false)}
          onSelectCourt={handleQuickBookingSelectCourt}
        />
      )}
    </section>
  );
}
