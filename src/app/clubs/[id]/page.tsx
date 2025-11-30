"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { BookingModal } from "@/components/booking/BookingModal";
import { QuickBookingModal } from "@/components/QuickBookingModal";
import { CourtCard } from "@/components/CourtCard";
import { CourtSlotsToday } from "@/components/CourtSlotsToday";
import { WeeklyAvailabilityTimeline } from "@/components/WeeklyAvailabilityTimeline";
import { CourtAvailabilityModal } from "@/components/CourtAvailabilityModal";
import { Button } from "@/components/ui";
import type { Court, AvailabilitySlot, AvailabilityResponse, CourtAvailabilityStatus } from "@/types/court";

interface Coach {
  id: string;
  name: string;
}

interface Club {
  id: string;
  name: string;
  location: string;
}

interface ClubWithDetails extends Club {
  courts: Court[];
  coaches: Coach[];
}

interface Slot {
  startTime: string;
  endTime: string;
}

// Helper to get today's date in YYYY-MM-DD format
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export default function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [club, setClub] = useState<ClubWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [courtAvailability, setCourtAvailability] = useState<Record<string, AvailabilitySlot[]>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [preselectedSlot, setPreselectedSlot] = useState<Slot | null>(null);
  const [isCourtAvailabilityOpen, setIsCourtAvailabilityOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    date: string;
    hour: number;
    courts: CourtAvailabilityStatus[];
  } | null>(null);
  const [timelineKey, setTimelineKey] = useState(0);

  // Get user ID from session, or use a placeholder for unauthenticated users
  const userId = session?.user?.id || "guest";

  // Fetch availability for all courts
  const fetchAvailability = useCallback(async (courts: Court[]) => {
    const today = getTodayDateString();
    setAvailabilityLoading(true);

    try {
      const results = await Promise.all(
        courts.map(async (court) => {
          try {
            const response = await fetch(`/api/courts/${court.id}/availability?date=${today}`);
            if (response.ok) {
              const data: AvailabilityResponse = await response.json();
              return { courtId: court.id, slots: data.slots };
            }
          } catch {
            // Ignore individual court availability errors
          }
          return { courtId: court.id, slots: [] };
        })
      );

      const availabilityMap: Record<string, AvailabilitySlot[]> = {};
      results.forEach(({ courtId, slots }) => {
        availabilityMap[courtId] = slots;
      });
      setCourtAvailability(availabilityMap);
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchClubData() {
      try {
        const resolvedParams = await params;
        const response = await fetch(`/api/clubs/${resolvedParams.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Club not found");
          } else {
            setError("Failed to load club data");
          }
          return;
        }
        const data = await response.json();
        setClub(data);
        // Fetch availability for all courts
        if (data.courts && data.courts.length > 0) {
          fetchAvailability(data.courts);
        } else {
          setAvailabilityLoading(false);
        }
      } catch {
        setError("Failed to load club data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchClubData();
  }, [params, fetchAvailability]);

  const handleBookClick = (courtId: string) => {
    setSelectedCourtId(courtId);
    setIsModalOpen(true);
  };

  const handleViewSchedule = (courtId: string) => {
    router.push(`/courts/${courtId}`);
  };

  const handleBookingSuccess = () => {
    // Refresh availability after successful booking
    if (club?.courts) {
      fetchAvailability(club.courts);
    }
    // Also reset preselected slot
    setPreselectedSlot(null);
    // Trigger timeline refresh
    setTimelineKey((prev) => prev + 1);
  };

  // Convert availability slots to BookingModal format
  const getAvailableSlotsForCourt = (courtId: string): Slot[] => {
    const slots = courtAvailability[courtId] || [];
    return slots
      .filter((slot) => slot.status === "available")
      .map((slot) => ({
        startTime: slot.start,
        endTime: slot.end,
      }));
  };

  // Handle Quick Booking button click
  const handleQuickBookingClick = () => {
    // If user is not authenticated, trigger login flow
    if (authStatus === "unauthenticated") {
      signIn();
      return;
    }
    setIsQuickBookingOpen(true);
  };

  // Handle court selection from QuickBookingModal
  const handleQuickBookingSelectCourt = (courtId: string, date: string, startTime: string, endTime: string) => {
    // If user is not authenticated, trigger login flow
    if (authStatus === "unauthenticated") {
      signIn();
      return;
    }

    // Create the preselected slot with ISO datetime strings
    // Note: Using UTC format (with Z suffix) to be consistent with the availability API
    const startDateTime = `${date}T${startTime}:00.000Z`;
    const endDateTime = `${date}T${endTime}:00.000Z`;
    
    setPreselectedSlot({
      startTime: startDateTime,
      endTime: endDateTime,
    });
    setSelectedCourtId(courtId);
    setIsQuickBookingOpen(false);
    setIsModalOpen(true);
  };

  // Handle closing the Quick Booking modal
  const handleQuickBookingClose = () => {
    setIsQuickBookingOpen(false);
  };

  // Handle closing the Booking modal
  const handleCloseBookingModal = () => {
    setIsModalOpen(false);
    setSelectedCourtId(null);
    setPreselectedSlot(null);
  };

  // Handle timeline slot click - opens court availability modal
  const handleTimelineSlotClick = (
    date: string,
    hour: number,
    courts: CourtAvailabilityStatus[]
  ) => {
    setSelectedTimeSlot({ date, hour, courts });
    setIsCourtAvailabilityOpen(true);
  };

  // Handle closing the court availability modal
  const handleCloseCourtAvailability = () => {
    setIsCourtAvailabilityOpen(false);
    setSelectedTimeSlot(null);
  };

  // Handle court selection from court availability modal
  const handleSelectCourtFromTimeline = (
    courtId: string,
    date: string,
    startTime: string,
    endTime: string
  ) => {
    // If user is not authenticated, trigger login flow
    if (authStatus === "unauthenticated") {
      signIn();
      return;
    }

    // Create the preselected slot with ISO datetime strings
    const startDateTime = `${date}T${startTime}:00.000Z`;
    const endDateTime = `${date}T${endTime}:00.000Z`;

    setPreselectedSlot({
      startTime: startDateTime,
      endTime: endDateTime,
    });
    setSelectedCourtId(courtId);
    setIsCourtAvailabilityOpen(false);
    setSelectedTimeSlot(null);
    setIsModalOpen(true);
  };

  // Get slots for BookingModal - either preselected or from availability
  const getSlotsForBookingModal = (courtId: string): Slot[] => {
    if (preselectedSlot) {
      return [preselectedSlot];
    }
    return getAvailableSlotsForCourt(courtId);
  };

  if (isLoading) {
    return (
      <main className="tm-club-page min-h-screen p-8">
        <div className="tm-loading-skeleton">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error || !club) {
    return (
      <main className="tm-club-page min-h-screen p-8">
        <div className="tm-error-banner text-center p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
          {error || "Club not found"}
        </div>
        <div className="mt-4 text-center">
          <Link href="/clubs" className="text-blue-500 hover:underline">
            ← Back to Clubs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="tm-club-page min-h-screen p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{club.name}</h1>
          <p className="text-gray-500 mt-2">{club.location}</p>
        </div>
        {session?.user?.role === "admin" && (
          <Link
            href={`/admin/clubs/${club.id}/courts`}
            className="rsp-link text-blue-500 hover:underline"
          >
            Admin → Courts
          </Link>
        )}
      </header>

      {/* Quick booking button - above courts list */}
      <div className="tm-quick-booking-action mb-6">
        <Button
          onClick={handleQuickBookingClick}
          className="tm-quick-booking-btn"
          aria-label="Quick booking"
        >
          Quick booking
        </Button>
      </div>

      {/* Weekly Availability Timeline */}
      {club.courts.length > 0 && (
        <section className="mb-8">
          <WeeklyAvailabilityTimeline
            key={timelineKey}
            clubId={club.id}
            onSlotClick={handleTimelineSlotClick}
          />
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {club.courts.length === 0 ? (
          <div className="tm-empty-state col-span-full text-center p-8 bg-gray-50 dark:bg-gray-800 rounded">
            <p className="text-gray-500 dark:text-gray-400">
              No courts defined for this club yet. Contact admin.
            </p>
          </div>
        ) : (
          club.courts.map((court) => (
            <CourtCard
              key={court.id}
              court={court}
              onBook={handleBookClick}
              onViewSchedule={handleViewSchedule}
              todaySlots={
                <CourtSlotsToday
                  slots={courtAvailability[court.id] || []}
                  isLoading={availabilityLoading}
                  maxSlots={6}
                />
              }
            />
          ))
        )}
      </section>

      <div className="mt-8">
        <Link href="/clubs" className="text-blue-500 hover:underline">
          ← Back to Clubs
        </Link>
      </div>

      {selectedCourtId && (
        <BookingModal
          courtId={selectedCourtId}
          availableSlots={getSlotsForBookingModal(selectedCourtId)}
          coachList={club.coaches}
          isOpen={isModalOpen}
          onClose={handleCloseBookingModal}
          userId={userId}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      <QuickBookingModal
        clubId={club.id}
        isOpen={isQuickBookingOpen}
        onClose={handleQuickBookingClose}
        onSelectCourt={handleQuickBookingSelectCourt}
      />

      {selectedTimeSlot && (
        <CourtAvailabilityModal
          isOpen={isCourtAvailabilityOpen}
          onClose={handleCloseCourtAvailability}
          date={selectedTimeSlot.date}
          hour={selectedTimeSlot.hour}
          courts={selectedTimeSlot.courts}
          onSelectCourt={handleSelectCourtFromTimeline}
        />
      )}
    </main>
  );
}
