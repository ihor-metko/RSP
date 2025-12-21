"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, Modal, IMLink, Select } from "@/components/ui";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";
import { QuickBookingModal } from "@/components/QuickBookingModal";
import { RequestTrainingModal } from "../../../../../archived_features/components/training/RequestTrainingModal";
import { DarkModeToggle, LanguageSwitcher } from "@/components/ui";
import { useClubStore } from "@/stores/useClubStore";
import { useUserStore } from "@/stores/useUserStore";
import { useCurrentLocale } from "@/hooks/useCurrentLocale";
import { formatPrice } from "@/utils/price";
import "./player-dashboard.css";

interface Club {
  id: string;
  name: string;
  location: string;
  logo?: string | null;
}

interface ClubCoach {
  id: string;
  user: { name: string };
}

interface ClubWithCoaches extends Club {
  coaches?: ClubCoach[];
}

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

interface Coach {
  id: string;
  name: string;
  clubId: string;
  clubName?: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  clubId: string;
  clubName?: string;
  type: "tournament" | "promotion" | "event";
}

// Get today's date string in YYYY-MM-DD format
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

// Get date string for N days from now
function getDateString(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
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

export default function PlayerDashboardPage() {
  const router = useRouter();
  const t = useTranslations();
  const currentLocale = useCurrentLocale();
  
  // Use store for auth
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const user = useUserStore((state) => state.user);

  // Use centralized club store
  const clubsFromStore = useClubStore((state) => state.clubs);
  const clubsLoading = useClubStore((state) => state.loading);
  const fetchClubsFromStore = useClubStore((state) => state.fetchClubs);
  
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  
  // Map store clubs to local Club type (memoized to avoid unnecessary re-renders)
  const clubs: Club[] = useMemo(() => clubsFromStore.map((club) => ({
    id: club.id,
    name: club.name,
    location: club.location,
    logo: club.logo,
  })), [clubsFromStore]);

  // State for bookings
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  // State for coaches
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [coachesLoading, setCoachesLoading] = useState(true);

  // State for events (placeholder for now)
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Modal states
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [isRequestTrainingOpen, setIsRequestTrainingOpen] = useState(false);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  // Calendar state for quick book
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // Get user info
  const userName = user?.name || t("playerDashboard.player");
  const userId = user?.id || "";

  // Redirect logic for authentication and role
  useEffect(() => {
    if (!isHydrated || isLoading) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Root admins should go to admin dashboard
    if (user?.isRoot) {
      router.push("/admin/dashboard");
    }
  }, [isLoggedIn, isLoading, router, user, isHydrated]);

  // Fetch clubs from store
  const fetchClubs = useCallback(async () => {
    try {
      await fetchClubsFromStore();
    } catch (error) {
      // Non-critical: clubs list will show as empty, user can still navigate
      console.warn("Error fetching clubs:", error);
    }
  }, [fetchClubsFromStore]);
  
  // Set first club as default when clubs are loaded
  useEffect(() => {
    if (clubs.length > 0 && !selectedClubId) {
      setSelectedClubId(clubs[0].id);
    }
  }, [clubs, selectedClubId]);

  // Fetch upcoming bookings
  const fetchUpcomingBookings = useCallback(async () => {
    if (!userId) return;

    setBookingsLoading(true);
    setBookingsError(null);

    try {
      const response = await fetch(`/api/bookings?userId=${userId}&upcoming=true`);
      if (response.ok) {
        const data = await response.json();
        setUpcomingBookings(Array.isArray(data) ? data : data.bookings || []);
      } else if (response.status === 401) {
        router.push("/auth/sign-in");
      } else {
        setBookingsError(t("playerDashboard.bookingsError"));
      }
    } catch {
      setBookingsError(t("playerDashboard.bookingsError"));
    } finally {
      setBookingsLoading(false);
    }
  }, [userId, router, t]);

  // Fetch coaches the user has trained with
  const fetchCoaches = useCallback(async () => {
    try {
      const response = await fetch("/api/clubs");
      if (response.ok) {
        const clubsData: ClubWithCoaches[] = await response.json();
        // Flatten coaches from all clubs
        const allCoaches: Coach[] = [];
        for (const club of clubsData) {
          if (club.coaches) {
            for (const coach of club.coaches) {
              allCoaches.push({
                id: coach.id,
                name: coach.user?.name || "Coach",
                clubId: club.id,
                clubName: club.name,
              });
            }
          }
        }
        setCoaches(allCoaches.slice(0, 5)); // Limit to 5 coaches
      }
    } catch {
      // Silently fail
    } finally {
      setCoachesLoading(false);
    }
  }, []);

  // Fetch events (placeholder - events API would be needed)
  const fetchEvents = useCallback(async () => {
    // Placeholder - in a real implementation, this would call an events API
    setEvents([]);
    setEventsLoading(false);
  }, []);

  // Initial data fetch
  useEffect(() => {
    // Fetch data when user is authenticated and not a root admin
    if (isLoggedIn && user && !user.isRoot) {
      fetchClubs();
      fetchUpcomingBookings();
      fetchCoaches();
      fetchEvents();
    }
  }, [isLoggedIn, user, fetchClubs, fetchUpcomingBookings, fetchCoaches, fetchEvents]);

  // Handle Quick Book button click
  const handleQuickBookClick = () => {
    if (!selectedClubId) return;
    setIsQuickBookingOpen(true);
  };

  // Handle court selection from quick booking
  // Note: priceCents is provided by QuickBookingModal but not used in navigation
  const handleQuickBookingSelectCourt = (courtId: string, date: string, startTime: string, endTime: string) => {
    // Navigate to club page with booking parameters
    router.push(`/clubs/${selectedClubId}?courtId=${courtId}&date=${date}&start=${startTime}&end=${endTime}`);
    setIsQuickBookingOpen(false);
  };

  // Handle booking view details
  const handleViewBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsBookingDetailsOpen(true);
  };

  // Handle booking cancellation
  const handleCancelBooking = async () => {
    if (!cancellingBookingId) return;

    try {
      const response = await fetch(`/api/bookings/${cancellingBookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (response.ok) {
        // Refresh bookings list
        fetchUpcomingBookings();
        setIsCancelConfirmOpen(false);
        setCancellingBookingId(null);
      }
    } catch {
      // Handle error silently
    }
  };

  // Handle repeat booking
  const handleRepeatBooking = (booking: Booking) => {
    if (booking.court?.club?.id) {
      router.push(`/clubs/${booking.court.club.id}`);
    }
  };

  // Handle coach training request
  const handleRequestTraining = (_coachId: string, clubId: string) => {
    setSelectedClubId(clubId);
    setIsRequestTrainingOpen(true);
  };

  // Generate calendar days for next 7 days
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const dateStr = getDateString(i);
    return {
      date: dateStr,
      label: formatDate(dateStr, currentLocale),
      isSelected: dateStr === selectedDate,
    };
  });

  // Loading state
  if (status === "loading") {
    return (
      <main className="tm-player-dashboard min-h-screen p-4 md:p-8">
        <div className="tm-loading-skeleton">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse mb-4" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
        </div>
      </main>
    );
  }

  // Guard check - show null for root admins (they get redirected) and unauthenticated users
  if (!user || user.isRoot) {
    return null;
  }

  return (
    <main className="tm-player-dashboard min-h-screen">
      {/* Header */}
      <header className="tm-dashboard-header flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-8 gap-4">
        <div>
          <h1 className="tm-dashboard-greeting text-2xl md:text-3xl font-bold">
            {t("playerDashboard.greeting", { name: userName })}
          </h1>
          <p className="tm-dashboard-subtitle text-gray-500 dark:text-gray-400 mt-1">
            {t("playerDashboard.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <UserRoleIndicator />
          <LanguageSwitcher currentLocale={currentLocale} />
          <DarkModeToggle />
        </div>
      </header>

      <div className="tm-dashboard-content p-4 md:p-8 space-y-8">
        {/* Quick Book Section */}
        <section className="tm-quick-book-section" aria-labelledby="quick-book-heading">
          <Card title={t("playerDashboard.quickBook.title")}>
            <div className="tm-quick-book-content">
              {/* Club Selection */}
              <div className="tm-club-selector mb-4">
                {clubsLoading ? (
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
                ) : (
                  <Select
                    id="club-select"
                    label={t("playerDashboard.quickBook.selectClub")}
                    options={
                      clubs.length === 0
                        ? [{ value: "", label: t("playerDashboard.quickBook.noClubs") }]
                        : clubs.map((club) => ({
                          value: club.id,
                          label: `${club.name} - ${club.location}`,
                        }))
                    }
                    value={selectedClubId}
                    onChange={(value) => setSelectedClubId(value)}
                    aria-label={t("playerDashboard.quickBook.selectClub")}
                    className="tm-booking-select w-full"
                  />
                )}
              </div>

              {/* Calendar View */}
              <div className="tm-calendar-view mb-4">
                <p className="text-sm font-medium mb-2">{t("playerDashboard.quickBook.selectDate")}</p>
                <div className="tm-calendar-days flex gap-2 overflow-x-auto pb-2" role="listbox" aria-label={t("playerDashboard.quickBook.selectDate")}>
                  {calendarDays.map((day) => (
                    <button
                      key={day.date}
                      onClick={() => setSelectedDate(day.date)}
                      className={`tm-calendar-day shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${day.isSelected
                        ? "bg-(--rsp-primary) text-white"
                        : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      role="option"
                      aria-selected={day.isSelected}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Book Button */}
              <Button
                onClick={handleQuickBookClick}
                disabled={!selectedClubId || clubsLoading}
                className="w-full md:w-auto"
                aria-label={t("playerDashboard.quickBook.bookNow")}
              >
                {t("playerDashboard.quickBook.bookNow")}
              </Button>
            </div>
          </Card>
        </section>

        {/* Upcoming Bookings Section */}
        <section className="tm-bookings-section" aria-labelledby="bookings-heading">
          <Card title={t("playerDashboard.upcomingBookings.title")}>
            {bookingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
                ))}
              </div>
            ) : bookingsError ? (
              <div className="tm-error-banner p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-sm" role="alert">
                {bookingsError}
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="tm-empty-state text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  {t("playerDashboard.upcomingBookings.noBookings")}
                </p>
                <IMLink href="/clubs" className="mt-2 inline-block">
                  {t("playerDashboard.upcomingBookings.browseClubs")}
                </IMLink>
              </div>
            ) : (
              <div className="tm-bookings-list space-y-3" role="list">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="tm-booking-item flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg gap-3"
                    role="listitem"
                  >
                    <div className="tm-booking-info">
                      <p className="font-medium">
                        {formatDate(booking.start, currentLocale)} • {formatTime(booking.start)} - {formatTime(booking.end)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {booking.court?.club?.name || ""} - {booking.court?.name || ""}
                      </p>
                      <span className={`tm-booking-status inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${booking.status === "paid" || booking.status === "confirmed"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : booking.status === "reserved"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400"
                        }`}>
                        {t(`common.${booking.status}`) || booking.status}
                      </span>
                    </div>
                    <div className="tm-booking-actions flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleViewBookingDetails(booking)}
                        aria-label={t("playerDashboard.upcomingBookings.viewDetails")}
                      >
                        {t("playerDashboard.upcomingBookings.viewDetails")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCancellingBookingId(booking.id);
                          setIsCancelConfirmOpen(true);
                        }}
                        aria-label={t("common.cancel")}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleRepeatBooking(booking)}
                        aria-label={t("playerDashboard.upcomingBookings.repeat")}
                      >
                        {t("playerDashboard.upcomingBookings.repeat")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* Coaches Section */}
        <section className="tm-coaches-section" aria-labelledby="coaches-heading">
          <Card title={t("playerDashboard.coaches.title")}>
            {coachesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
                ))}
              </div>
            ) : coaches.length === 0 ? (
              <div className="tm-empty-state text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  {t("playerDashboard.coaches.noCoaches")}
                </p>
              </div>
            ) : (
              <div className="tm-coaches-list space-y-3" role="list">
                {coaches.map((coach) => (
                  <div
                    key={coach.id}
                    className="tm-coach-item flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg gap-3"
                    role="listitem"
                  >
                    <div className="tm-coach-info">
                      <p className="font-medium">{coach.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {coach.clubName}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRequestTraining(coach.id, coach.clubId)}
                      aria-label={`${t("playerDashboard.coaches.requestTraining")} - ${coach.name}`}
                    >
                      {t("playerDashboard.coaches.requestTraining")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* Events Section */}
        <section className="tm-events-section" aria-labelledby="events-heading">
          <Card title={t("playerDashboard.events.title")}>
            {eventsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="tm-empty-state text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  {t("playerDashboard.events.noEvents")}
                </p>
              </div>
            ) : (
              <div className="tm-events-list space-y-3" role="list">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="tm-event-item p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    role="listitem"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {event.description}
                        </p>
                        <p className="text-sm mt-1">
                          {formatDate(event.date, currentLocale)} • {event.clubName}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${event.type === "tournament"
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                        : event.type === "promotion"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400"
                        }`}>
                        {event.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* Quick Navigation Section */}
        <section className="tm-navigation-section" aria-labelledby="navigation-heading">
          <Card title={t("playerDashboard.navigation.title")}>
            <div className="tm-nav-links grid grid-cols-2 md:grid-cols-4 gap-4">
              <IMLink
                href="/trainings"
                className="tm-nav-link flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-2xl mb-2">📋</span>
                <span className="text-sm font-medium text-center">
                  {t("playerDashboard.navigation.myTrainings")}
                </span>
              </IMLink>
              <IMLink
                href="/clubs"
                className="tm-nav-link flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-2xl mb-2">🏟️</span>
                <span className="text-sm font-medium text-center">
                  {t("playerDashboard.navigation.browseClubs")}
                </span>
              </IMLink>
              <IMLink
                href="/"
                className="tm-nav-link flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-2xl mb-2">🏠</span>
                <span className="text-sm font-medium text-center">
                  {t("playerDashboard.navigation.home")}
                </span>
              </IMLink>
              <button
                onClick={() => {
                  // TODO: Navigate to profile page when implemented
                  // For now, show user is already logged in
                }}
                className="tm-nav-link flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-default opacity-50"
                disabled
                aria-label={t("playerDashboard.navigation.profile")}
              >
                <span className="text-2xl mb-2">👤</span>
                <span className="text-sm font-medium text-center">
                  {t("playerDashboard.navigation.profile")}
                </span>
              </button>
            </div>
          </Card>
        </section>
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

      {/* Request Training Modal */}
      {selectedClubId && coaches.length > 0 && (
        <RequestTrainingModal
          clubId={selectedClubId}
          trainers={coaches.map((c) => ({ id: c.id, name: c.name }))}
          playerId={userId}
          isOpen={isRequestTrainingOpen}
          onClose={() => {
            setIsRequestTrainingOpen(false);
          }}
          onSuccess={() => {
            setIsRequestTrainingOpen(false);
          }}
        />
      )}

      {/* Booking Details Modal */}
      <Modal
        isOpen={isBookingDetailsOpen}
        onClose={() => {
          setIsBookingDetailsOpen(false);
          setSelectedBooking(null);
        }}
        title={t("playerDashboard.bookingDetails.title")}
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("common.date")}
              </label>
              <p className="text-lg">{formatDate(selectedBooking.start, currentLocale)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("common.time")}
              </label>
              <p>{formatTime(selectedBooking.start)} - {formatTime(selectedBooking.end)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("training.history.club")}
              </label>
              <p>{selectedBooking.court?.club?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("training.history.court")}
              </label>
              <p>{selectedBooking.court?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("common.status")}
              </label>
              <p className="capitalize">{selectedBooking.status}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("common.price")}
              </label>
              <p className="font-semibold">{formatPrice(selectedBooking.price)}</p>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setIsBookingDetailsOpen(false)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={() => {
          setIsCancelConfirmOpen(false);
          setCancellingBookingId(null);
        }}
        title={t("playerDashboard.cancelConfirm.title")}
      >
        <div className="space-y-4">
          <p>{t("playerDashboard.cancelConfirm.message")}</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelConfirmOpen(false);
                setCancellingBookingId(null);
              }}
            >
              {t("common.back")}
            </Button>
            <Button onClick={handleCancelBooking} className="bg-red-500 hover:bg-red-600">
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
