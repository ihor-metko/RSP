"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, Button, IMLink } from "@/components/ui";
import { BookingModal } from "@/components/booking/BookingModal";
import { AuthPromptModal } from "@/components/AuthPromptModal";
import { useUserStore } from "@/stores/useUserStore";
import { useBookingStore } from "@/stores/useBookingStore";
import { useCourtAvailability } from "@/hooks/useCourtAvailability";
import { formatPrice } from "@/utils/price";
import { isValidImageUrl, getImageUrl } from "@/utils/image";
import type { Court, AvailabilitySlot, AvailabilityResponse, PriceTimelineResponse, PriceSegment } from "@/types/court";

interface CourtWithClub extends Court {
  clubId?: string;
}

interface Slot {
  startTime: string;
  endTime: string;
  priceCents?: number;
}

// Helper to format date as YYYY-MM-DD
function formatDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Helper to format date for display
function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Helper to format time from ISO string for display
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

// Helper to extract HH:MM from ISO string for price matching
function extractTimeFromISO(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function getStatusColor(status: AvailabilitySlot["status"], isLocked?: boolean): string {
  if (isLocked) {
    return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700 cursor-not-allowed opacity-70";
  }
  
  switch (status) {
    case "available":
      return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-800 cursor-pointer";
    case "booked":
      return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700 cursor-not-allowed opacity-60";
    case "partial":
      return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-800 cursor-pointer";
    default:
      return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600";
  }
}

function getStatusLabel(status: AvailabilitySlot["status"], isLocked?: boolean, t?: (key: string) => string): string {
  if (isLocked) {
    return t ? t("courtDetail.availability.statusLocked") : "Locked";
  }
  
  switch (status) {
    case "available":
      return t ? t("courtDetail.availability.statusAvailable") : "Available";
    case "booked":
      return t ? t("courtDetail.availability.statusBooked") : "Booked";
    case "partial":
      return t ? t("courtDetail.availability.statusLimited") : "Limited";
    default:
      return t ? t("courtDetail.availability.statusUnknown") : "Unknown";
  }
}

export default function CourtDetailPage({
  params,
}: {
  params: Promise<{ courtId: string }>;
}) {
  // Use store for auth
  const user = useUserStore((state) => state.user);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const pathname = usePathname();
  const t = useTranslations();
  const [court, setCourt] = useState<CourtWithClub | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const userId = user?.id || "guest";
  const isAuthenticated = isLoggedIn && user;

  // Get locked slots from store
  const isSlotLocked = useBookingStore((state) => state.isSlotLocked);

  // Real-time availability updates via WebSocket  
  useCourtAvailability(
    court?.clubId || null,
    () => {
      // Refetch availability when WebSocket events occur
      if (court?.id) {
        fetchAvailability(court.id, selectedDate, court.defaultPriceCents);
      }
    }
  );

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Fetch court details using store
  useEffect(() => {
    async function fetchCourtData() {
      try {
        const resolvedParams = await params;
        // Import and use store method
        const { useCourtStore: courtStore } = await import("@/stores/useCourtStore");
        const ensureCourtById = courtStore.getState().ensureCourtById;
        
        // Try to get from cache first, then fetch if needed
        const courtData = await ensureCourtById(resolvedParams.courtId);
        setCourt(courtData);
      } catch (err) {
        if (err instanceof Error && err.message.includes("404")) {
          setError("Court not found");
        } else {
          setError("Failed to load court data");
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchCourtData();
  }, [params]);

  // Fetch availability when date changes
  const fetchAvailability = useCallback(async (courtId: string, date: Date, defaultPriceCents: number) => {
    setAvailabilityLoading(true);
    const dateStr = formatDateString(date);

    try {
      // Fetch both availability and price timeline in parallel
      const [availabilityResponse, priceResponse] = await Promise.all([
        fetch(`/api/courts/${courtId}/availability?date=${dateStr}`),
        fetch(`/api/courts/${courtId}/price-timeline?date=${dateStr}`),
      ]);

      let slots: AvailabilitySlot[] = [];
      let priceTimeline: PriceSegment[] = [];

      if (availabilityResponse.ok) {
        const data: AvailabilityResponse = await availabilityResponse.json();
        slots = data.slots;
      }

      if (priceResponse.ok) {
        const priceData: PriceTimelineResponse = await priceResponse.json();
        priceTimeline = priceData.timeline;
      }

      // Merge price info into slots
      const slotsWithPrices = slots.map((slot) => {
        const slotTime = extractTimeFromISO(slot.start);
        
        // Find matching price segment
        const priceSegment = priceTimeline.find((seg) => {
          return slotTime >= seg.start && slotTime < seg.end;
        });

        return {
          ...slot,
          priceCents: priceSegment?.priceCents ?? defaultPriceCents,
        };
      });

      setAvailability(slotsWithPrices);
    } catch {
      setAvailability([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (court?.id) {
      fetchAvailability(court.id, selectedDate, court.defaultPriceCents);
    }
  }, [court?.id, court?.defaultPriceCents, selectedDate, fetchAvailability]);

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  const handleSlotClick = (slot: AvailabilitySlot, isLocked: boolean) => {
    if (slot.status === "booked" || isLocked) return;
    
    // If user is not authenticated, show auth prompt modal
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }
    
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
  };

  const handleBookingSuccess = () => {
    setToast({ type: "success", message: t("booking.bookingSuccess") });
    // Refresh availability
    if (court?.id) {
      fetchAvailability(court.id, selectedDate, court.defaultPriceCents);
    }
    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    // Clear toast after 3 seconds
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  // Convert selected slot to BookingModal format
  const getAvailableSlots = (): Slot[] => {
    if (!selectedSlot) return [];
    return [
      {
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        priceCents: selectedSlot.priceCents,
      },
    ];
  };

  if (isLoading) {
    return (
      <main className="tm-court-page min-h-screen p-8">
        <div className="tm-loading-skeleton">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse mb-4" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse mb-6" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
        </div>
      </main>
    );
  }

  if (error || !court) {
    return (
      <main className="tm-court-page min-h-screen p-8">
        <div className="tm-error-banner text-center p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-sm">
          {error || "Court not found"}
        </div>
        <div className="mt-4 text-center">
          <IMLink href="/clubs">
            {t("common.backToClubs")}
          </IMLink>
        </div>
      </main>
    );
  }

  const hasAvailableSlots = availability.some((slot) => slot.status !== "booked");

  // Get image URL and validate
  const imageUrl = getImageUrl(court.imageUrl);
  const hasImage = isValidImageUrl(imageUrl);

  return (
    <main className="tm-court-page min-h-screen p-8">
      {/* Toast notification */}
      {toast && (
        <div
          className={`tm-toast fixed top-4 right-4 p-4 rounded shadow-lg z-50 ${
            toast.type === "success"
              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
              : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
          }`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      {/* Sign in prompt for unauthenticated users */}
      {!isAuthenticated && (
        <div className="tm-auth-cta mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <IMLink href={`/auth/sign-in?redirectTo=${encodeURIComponent(pathname)}`} className="font-semibold underline hover:no-underline">
              {t("auth.signInToBook")}
            </IMLink>
          </p>
        </div>
      )}

      {/* Court Image Section */}
      {hasImage && (
        <section className="tm-court-image-section mb-8">
          <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden">
            {/* Using img instead of Next.js Image to maintain consistency with existing CourtCard component styling */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl!}
              alt={court.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{court.name}</h1>
              <div className="flex flex-wrap gap-2">
                {court.type && (
                  <span className="inline-block px-3 py-1 text-sm rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/30">
                    {court.type}
                  </span>
                )}
                {court.surface && (
                  <span className="inline-block px-3 py-1 text-sm rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/30">
                    {court.surface}
                  </span>
                )}
                {court.indoor && (
                  <span className="inline-block px-3 py-1 text-sm rounded-full bg-blue-500/80 backdrop-blur-sm text-white border border-blue-400/50">
                    {t("common.indoor")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Header with court info - shown when no image or as additional info */}
      <header className="tm-court-header mb-8">
        <Card className="tm-court-info-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              {!hasImage && (
                <>
                  <h1 className="text-2xl font-bold">{court.name}</h1>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {court.type && (
                      <span className="tm-badge inline-block px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700">
                        {court.type}
                      </span>
                    )}
                    {court.surface && (
                      <span className="tm-badge inline-block px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700">
                        {court.surface}
                      </span>
                    )}
                    {court.indoor && (
                      <span className="tm-badge inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {t("common.indoor")}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">
                {formatPrice(court.defaultPriceCents)}
                <span className="text-sm text-gray-500 font-normal"> {t("common.perHour")}</span>
              </p>
            </div>
          </div>
        </Card>
      </header>

      {/* Description Section */}
      {court.description && (
        <section className="tm-court-description mb-8">
          <Card className="tm-court-description-card">
            <h2 className="text-lg font-semibold mb-3">{t("courtDetail.description.title")}</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{court.description}</p>
          </Card>
        </section>
      )}

      {/* Date navigation */}
      <section className="tm-date-picker mb-6">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button
            variant="outline"
            onClick={handlePrevDay}
            aria-label={t("courtDetail.availability.previousDayLabel")}
          >
            ← {t("courtDetail.availability.prevDay")}
          </Button>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={formatDateString(selectedDate)}
              onChange={handleDateChange}
              className="tm-date-input px-3 py-2 border rounded-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              aria-label={t("courtDetail.availability.selectDateLabel")}
            />
          </div>

          <Button
            variant="outline"
            onClick={handleNextDay}
            aria-label={t("courtDetail.availability.nextDayLabel")}
          >
            {t("courtDetail.availability.nextDay")} →
          </Button>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
          {formatDisplayDate(selectedDate)}
        </p>
      </section>

      {/* Slots legend */}
      <section className="tm-slots-legend mb-4">
        <div className="flex justify-center gap-4 text-sm flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-500" /> {t("courtDetail.availability.statusAvailable")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-500" /> {t("courtDetail.availability.statusBooked")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-yellow-500" /> {t("courtDetail.availability.statusLimited")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-orange-500" /> {t("courtDetail.availability.statusLocked")}
          </span>
        </div>
      </section>

      {/* Hourly slots grid */}
      <section className="tm-slots-grid">
        {availabilityLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"
              />
            ))}
          </div>
        ) : availability.length === 0 ? (
          <div className="tm-no-slots text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-sm">
            <p className="text-gray-500 dark:text-gray-400">
              {t("courtDetail.availability.noAvailabilityData")}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleNextDay}>
              {t("courtDetail.availability.checkAnotherDay")}
            </Button>
          </div>
        ) : !hasAvailableSlots ? (
          <div className="tm-no-slots text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-sm">
            <p className="text-gray-500 dark:text-gray-400">
              {t("courtDetail.availability.noSlotsAvailable")}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleNextDay}>
              {t("courtDetail.availability.checkAnotherDay")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {availability.map((slot) => {
              const locked = court?.id ? isSlotLocked(court.id, slot.start, slot.end) : false;
              return (
                <button
                  key={slot.start}
                  className={`tm-slot-button p-3 rounded-sm border text-center transition-colors ${getStatusColor(slot.status, locked)}`}
                  onClick={() => handleSlotClick(slot, locked)}
                  disabled={slot.status === "booked" || locked}
                  aria-label={`${formatTime(slot.start)} - ${formatTime(slot.end)}: ${getStatusLabel(slot.status, locked, t)}${slot.priceCents !== undefined ? `, ${formatPrice(slot.priceCents)}` : ""}`}
                >
                  <div className="font-semibold">{formatTime(slot.start)}</div>
                  <div className="text-xs">{formatTime(slot.end)}</div>
                  {slot.priceCents !== undefined && slot.status !== "booked" && !locked && (
                    <div className="text-xs font-medium mt-1">{formatPrice(slot.priceCents)}</div>
                  )}
                  <div className="text-xs mt-1 opacity-75">{getStatusLabel(slot.status, locked, t)}</div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Back link */}
      <div className="mt-8">
        {court.clubId ? (
          <IMLink href={`/clubs/${court.clubId}`}>
            {t("courtDetail.navigation.backToClub")}
          </IMLink>
        ) : (
          <IMLink href="/clubs">
            {t("common.backToClubs")}
          </IMLink>
        )}
      </div>

      {/* Booking modal - only rendered for authenticated users */}
      {isAuthenticated && selectedSlot && court && (
        <BookingModal
          courtId={court.id}
          availableSlots={getAvailableSlots()}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          userId={userId}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {/* Auth Prompt Modal for unauthenticated users */}
      <AuthPromptModal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
      />
    </main>
  );
}
