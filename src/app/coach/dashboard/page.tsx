"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Modal } from "@/components/ui";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";

interface Booking {
  bookingId: string;
  playerName: string;
  playerContact: string;
  courtName: string;
  date: string;
  time: string;
  duration: number;
  status: string;
}

interface AvailabilitySlot {
  slotId: string;
  startTime: string;
  endTime: string;
  date: string;
}

interface ClubHours {
  opening: string;
  closing: string;
}

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isBooked: boolean;
  booking?: Booking;
  availabilitySlot?: AvailabilitySlot;
  isOutsideClubHours: boolean;
}

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateParam(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

// Parse date string (YYYY-MM-DD) to Date without timezone issues
function parseDateString(dateStr: string): Date {
  // Validate format before parsing
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(); // Return current date as fallback
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  // Basic validation for reasonable date values
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return new Date(); // Return current date as fallback
  }
  return new Date(year, month - 1, day);
}

// Default slot duration in minutes
const SLOT_DURATION_MINUTES = 60;

export default function CoachDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [clubHours, setClubHours] = useState<ClubHours>({ opening: "09:00", closing: "22:00" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const dateParam = formatDateParam(selectedDate);

      // Fetch bookings and availability in parallel
      const [bookingsRes, availabilityRes] = await Promise.all([
        fetch(`/api/coach/bookings?date=${dateParam}`),
        fetch(`/api/coach/availability?date=${dateParam}`),
      ]);

      if (bookingsRes.status === 401 || availabilityRes.status === 401) {
        router.push("/auth/sign-in");
        return;
      }

      if (bookingsRes.status === 403 || availabilityRes.status === 403) {
        setError("Access denied. Only coaches can access this page.");
        return;
      }

      if (!bookingsRes.ok) {
        const errorData = await bookingsRes.json();
        throw new Error(errorData.error || "Failed to fetch bookings");
      }

      if (!availabilityRes.ok) {
        const errorData = await availabilityRes.json();
        throw new Error(errorData.error || "Failed to fetch availability");
      }

      const bookingsData = await bookingsRes.json();
      const availabilityData = await availabilityRes.json();

      setBookings(bookingsData);
      setAvailabilitySlots(availabilityData.availableSlots || []);
      setClubHours(availabilityData.clubHours || { opening: "09:00", closing: "22:00" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, router]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }

    if (session.user.role !== "coach" && session.user.role !== "admin") {
      setError("Access denied. Only coaches can access this page.");
      return;
    }

    fetchData();
  }, [session, status, router, fetchData]);

  const navigateDay = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.isOutsideClubHours) return;

    if (slot.isBooked && slot.booking) {
      setSelectedBooking(slot.booking);
      setIsBookingModalOpen(true);
    } else {
      setSelectedTimeSlot(slot);
      setIsAvailabilityModalOpen(true);
    }
  };

  const handleToggleAvailability = async () => {
    if (!selectedTimeSlot) return;

    setSubmitting(true);
    try {
      if (selectedTimeSlot.isAvailable && selectedTimeSlot.availabilitySlot) {
        // Delete the availability slot
        const response = await fetch(
          `/api/coach/availability/${selectedTimeSlot.availabilitySlot.slotId}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update availability");
        }

        showToast("Marked as unavailable", "success");
      } else {
        // Create a new availability slot
        const dateParam = formatDateParam(selectedDate);
        const endTimeMinutes = parseTimeToMinutes(selectedTimeSlot.time) + SLOT_DURATION_MINUTES;
        const endTime = minutesToTime(endTimeMinutes);

        const response = await fetch("/api/coach/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: dateParam,
            startTime: selectedTimeSlot.time,
            endTime,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update availability");
        }

        showToast("Marked as available", "success");
      }

      setIsAvailabilityModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update availability", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Generate time slots for the day
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const openingMinutes = parseTimeToMinutes(clubHours.opening);
    const closingMinutes = parseTimeToMinutes(clubHours.closing);

    // Generate hourly slots from 6 AM to 11 PM
    for (let hour = 6; hour <= 23; hour++) {
      const time = `${hour.toString().padStart(2, "0")}:00`;
      const timeMinutes = hour * 60;

      const isOutsideClubHours = timeMinutes < openingMinutes || timeMinutes >= closingMinutes;

      // Check if this slot is booked
      const booking = bookings.find((b) => {
        const bookingStartMinutes = parseTimeToMinutes(b.time);
        const bookingEndMinutes = bookingStartMinutes + b.duration;
        return timeMinutes >= bookingStartMinutes && timeMinutes < bookingEndMinutes;
      });

      // Check if this slot is marked as available
      const availabilitySlot = availabilitySlots.find((s) => {
        const slotStartMinutes = parseTimeToMinutes(s.startTime);
        const slotEndMinutes = parseTimeToMinutes(s.endTime);
        return timeMinutes >= slotStartMinutes && timeMinutes < slotEndMinutes;
      });

      slots.push({
        time,
        isAvailable: !!availabilitySlot && !booking,
        isBooked: !!booking,
        booking,
        availabilitySlot,
        isOutsideClubHours,
      });
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getSlotColor = (slot: TimeSlot): string => {
    if (slot.isOutsideClubHours) {
      return "bg-gray-200 dark:bg-gray-700 opacity-50 cursor-not-allowed";
    }
    if (slot.isBooked) {
      return "bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600 cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/50";
    }
    if (slot.isAvailable) {
      return "bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50";
    }
    return "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700";
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "paid":
      case "confirmed":
        return "bg-green-500";
      case "pending":
      case "reserved":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (status === "loading") {
    return (
      <main className="rsp-container min-h-screen p-8">
        <div className="rsp-loading text-center">Loading...</div>
      </main>
    );
  }

  return (
    <main className="rsp-container min-h-screen p-8">
      {/* Header */}
      <header className="rsp-header flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="rsp-title text-3xl font-bold">
            Hello, {session?.user?.name || "Coach"}
          </h1>
          <p className="rsp-subtitle text-gray-500 mt-2">Coach Dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <UserRoleIndicator />
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow-lg ${
            toast.type === "success"
              ? "bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400"
              : "bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Navigation and Back Link */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <Link href="/" className="rsp-link text-blue-500 hover:underline">
          ← Back to Home
        </Link>
        <div className="flex gap-2">
          <Link href="/coach/requests">
            <Button variant="outline">Training Requests</Button>
          </Link>
          <Link href="/coach/availability">
            <Button variant="outline">Manage Weekly Availability</Button>
          </Link>
        </div>
      </div>

      {/* Date Navigation */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Button variant="outline" onClick={() => navigateDay(-1)} aria-label="Previous day">
            ← Previous Day
          </Button>
          <div className="text-center">
            <h2 className="text-xl font-semibold">{formatDateForDisplay(selectedDate)}</h2>
            <input
              type="date"
              value={formatDateParam(selectedDate)}
              onChange={(e) => setSelectedDate(parseDateString(e.target.value))}
              className="mt-2 rsp-input text-center"
              aria-label="Select date"
            />
          </div>
          <Button variant="outline" onClick={() => navigateDay(1)} aria-label="Next day">
            Next Day →
          </Button>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600"></div>
          <span className="text-sm">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600"></div>
          <span className="text-sm">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600"></div>
          <span className="text-sm">Not Set</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 opacity-50"></div>
          <span className="text-sm">Outside Club Hours</span>
        </div>
      </div>

      {/* Time Slots Grid */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Schedule</h3>
        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
              ></div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.time}
                onClick={() => handleSlotClick(slot)}
                disabled={slot.isOutsideClubHours}
                className={`w-full p-4 rounded border text-left transition-colors ${getSlotColor(slot)}`}
                aria-label={`Time slot ${slot.time}${slot.isBooked ? ", booked" : slot.isAvailable ? ", available" : ", not set"}${slot.isOutsideClubHours ? ", outside club hours" : ""}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-semibold text-lg">{slot.time}</span>
                    {slot.isBooked && slot.booking && (
                      <>
                        <span className="font-medium">{slot.booking.playerName}</span>
                        <span className="text-sm text-gray-500">
                          {slot.booking.courtName}
                        </span>
                      </>
                    )}
                    {!slot.isBooked && slot.isAvailable && (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Available
                      </span>
                    )}
                    {!slot.isBooked && !slot.isAvailable && !slot.isOutsideClubHours && (
                      <span className="text-gray-500">Click to set availability</span>
                    )}
                    {slot.isOutsideClubHours && (
                      <span className="text-gray-400">Outside club hours</span>
                    )}
                  </div>
                  {slot.isBooked && slot.booking && (
                    <span
                      className={`${getStatusBadgeClass(slot.booking.status)} text-white text-xs px-2 py-1 rounded-full font-medium capitalize`}
                    >
                      {slot.booking.status}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Booking Details Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="Booking Details"
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Player
              </label>
              <p className="text-lg font-semibold">{selectedBooking.playerName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Contact
              </label>
              <p>{selectedBooking.playerContact}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Court
              </label>
              <p>{selectedBooking.courtName}</p>
            </div>
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Time
                </label>
                <p>{selectedBooking.time}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Duration
                </label>
                <p>{selectedBooking.duration} minutes</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </label>
              <span
                className={`${getStatusBadgeClass(selectedBooking.status)} text-white text-xs px-2 py-1 rounded-full font-medium capitalize inline-block mt-1`}
              >
                {selectedBooking.status}
              </span>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setIsBookingModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Availability Toggle Modal */}
      <Modal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        title={selectedTimeSlot?.isAvailable ? "Mark as Unavailable" : "Mark as Available"}
      >
        {selectedTimeSlot && (
          <div className="space-y-4">
            <p>
              {selectedTimeSlot.isAvailable
                ? `Are you sure you want to mark the ${selectedTimeSlot.time} slot as unavailable?`
                : `Mark the ${selectedTimeSlot.time} slot as available for bookings?`}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAvailabilityModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleToggleAvailability}
                disabled={submitting}
                className={selectedTimeSlot.isAvailable ? "bg-red-500 hover:bg-red-600" : ""}
              >
                {submitting
                  ? "Processing..."
                  : selectedTimeSlot.isAvailable
                  ? "Mark Unavailable"
                  : "Mark Available"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
