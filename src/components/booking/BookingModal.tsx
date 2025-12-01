"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Modal, Button } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import { doTimesOverlap, formatTimeHHMM } from "@/utils/dateTime";
import "./BookingModal.css";

interface Slot {
  startTime: string;
  endTime: string;
  priceCents?: number;
}

interface Coach {
  id: string;
  name: string;
}

interface TimeOffEntry {
  fullDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

interface CoachAvailabilityData {
  trainerId: string;
  trainerName: string;
  availability: Record<string, { start: string; end: string }[]>;
  busyTimes: Record<string, string[]>;
  timeOff?: Record<string, TimeOffEntry[]>;
}

interface BookingModalProps {
  courtId: string;
  availableSlots: Slot[];
  coachList?: Coach[];
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onBookingSuccess?: (booking: BookingResponse) => void;
}

interface BookingResponse {
  bookingId: string;
  status: string;
  courtId: string;
  startTime: string;
  endTime: string;
  coachId: string | null;
  priceCents?: number;
}

export function BookingModal({
  courtId,
  availableSlots,
  coachList,
  isOpen,
  onClose,
  userId,
  onBookingSuccess,
}: BookingModalProps) {
  const t = useTranslations();
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [coachAvailability, setCoachAvailability] = useState<CoachAvailabilityData | null>(null);
  const [isLoadingCoachAvailability, setIsLoadingCoachAvailability] = useState(false);

  const selectedSlot = selectedSlotIndex !== null ? availableSlots[selectedSlotIndex] : null;

  // Fetch coach availability when coach is selected
  const fetchCoachAvailability = useCallback(async (coachId: string) => {
    if (!coachId) {
      setCoachAvailability(null);
      return;
    }

    setIsLoadingCoachAvailability(true);
    try {
      const response = await fetch(`/api/trainers/${coachId}/availability`);
      if (response.ok) {
        const data = await response.json();
        setCoachAvailability(data);
      } else {
        setCoachAvailability(null);
      }
    } catch {
      setCoachAvailability(null);
    } finally {
      setIsLoadingCoachAvailability(false);
    }
  }, []);

  // Effect to fetch coach availability when coach selection changes
  useEffect(() => {
    if (selectedCoachId) {
      fetchCoachAvailability(selectedCoachId);
    } else {
      setCoachAvailability(null);
    }
  }, [selectedCoachId, fetchCoachAvailability]);

  // Check if a slot is available for the selected coach
  const isSlotAvailableForCoach = (slot: Slot): { available: boolean; reason?: string } => {
    if (!selectedCoachId || !coachAvailability) {
      return { available: true };
    }

    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    const dateKey = slotStart.toISOString().split("T")[0];
    const startTimeStr = formatTimeHHMM(slotStart);
    const endTimeStr = formatTimeHHMM(slotEnd);

    // Check if coach works on this day
    const coachDayAvailability = coachAvailability.availability[dateKey];
    if (!coachDayAvailability || coachDayAvailability.length === 0) {
      return { available: false, reason: t("booking.coachNotWorkingOnDay") };
    }

    // Check if slot is within coach's working hours
    const isWithinWorkingHours = coachDayAvailability.some(
      (workSlot) => startTimeStr >= workSlot.start && endTimeStr <= workSlot.end
    );
    if (!isWithinWorkingHours) {
      return { available: false, reason: t("booking.coachNotWorkingAtTime") };
    }

    // Check if coach has time off on this day
    const timeOffEntries = coachAvailability.timeOff?.[dateKey] || [];
    for (const timeOff of timeOffEntries) {
      // Full-day time off blocks the entire day
      if (timeOff.fullDay) {
        return { available: false, reason: t("booking.coachUnavailableOnDay") };
      }
      // Partial-day time off - check if slot overlaps with time off
      if (timeOff.startTime && timeOff.endTime) {
        if (doTimesOverlap(startTimeStr, endTimeStr, timeOff.startTime, timeOff.endTime)) {
          return { available: false, reason: t("booking.coachUnavailableAtTime") };
        }
      }
    }

    // Check if coach is already busy at this time
    const busyTimes = coachAvailability.busyTimes[dateKey] || [];
    if (busyTimes.includes(startTimeStr)) {
      return { available: false, reason: t("booking.coachAlreadyBooked") };
    }

    return { available: true };
  };

  // Get filtered slots based on coach availability
  const getFilteredSlots = () => {
    if (!selectedCoachId || !coachAvailability) {
      return availableSlots.map((slot, index) => ({ slot, index, available: true, reason: undefined }));
    }

    return availableSlots.map((slot, index) => {
      const { available, reason } = isSlotAvailableForCoach(slot);
      return { slot, index, available, reason };
    });
  };

  const filteredSlots = getFilteredSlots();

  // Memoize unavailability reason for selected slot
  const selectedSlotUnavailabilityReason = useMemo(() => {
    if (selectedSlotIndex === null || !selectedCoachId) {
      return null;
    }
    const slotInfo = filteredSlots.find(s => s.index === selectedSlotIndex);
    if (slotInfo && !slotInfo.available && slotInfo.reason) {
      return slotInfo.reason;
    }
    return null;
  }, [selectedSlotIndex, selectedCoachId, filteredSlots]);

  const handleConfirm = async () => {
    if (selectedSlotIndex === null || !selectedSlot) {
      setAlert({ type: "error", message: t("booking.pleaseSelectSlot") });
      return;
    }

    setIsLoading(true);
    setAlert(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courtId,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          userId,
          coachId: selectedCoachId,
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        setAlert({
          type: "error",
          message: t("booking.slotAlreadyBooked"),
        });
        return;
      }

      if (!response.ok) {
        setAlert({
          type: "error",
          message: data.error || t("auth.errorOccurred"),
        });
        return;
      }

      setAlert({
        type: "success",
        message: `${t("booking.bookingSuccess")}${data.priceCents ? ` - ${formatPrice(data.priceCents)}` : ""}`,
      });

      if (onBookingSuccess) {
        onBookingSuccess(data as BookingResponse);
      }

      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
        setSelectedSlotIndex(null);
        setSelectedCoachId(null);
        setAlert(null);
      }, 1500);
    } catch (error) {
      // Log error for debugging purposes
      if (process.env.NODE_ENV === "development") {
        console.error("Booking error:", error);
      }
      setAlert({
        type: "error",
        message: t("auth.errorOccurred"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedSlotIndex(null);
    setSelectedCoachId(null);
    setAlert(null);
    setCoachAvailability(null);
    onClose();
  };

  const handleCoachChange = (coachId: string | null) => {
    setSelectedCoachId(coachId);
    // Reset slot selection when coach changes as availability may differ
    setSelectedSlotIndex(null);
    setAlert(null);
  };

  const formatSlot = (slot: Slot) => {
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    const timeStr = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    
    if (slot.priceCents !== undefined) {
      return `${timeStr} · ${formatPrice(slot.priceCents)}`;
    }
    return timeStr;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("booking.reserveBooking")}>
      <div className="tm-booking-modal">
        {alert && (
          <div
            className={`tm-booking-alert ${
              alert.type === "success" ? "tm-booking-alert--success" : "tm-booking-alert--error"
            }`}
            role="alert"
          >
            {alert.message}
          </div>
        )}

        <div className="tm-booking-form">
          {coachList && coachList.length > 0 && (
            <div className="tm-booking-select-wrapper">
              <label htmlFor="coach-select" className="tm-booking-label">
                {t("booking.selectCoach")}
              </label>
              <select
                id="coach-select"
                className="tm-booking-select"
                value={selectedCoachId ?? ""}
                onChange={(e) => handleCoachChange(e.target.value || null)}
                disabled={isLoading}
              >
                <option value="">{t("booking.noCoach")}</option>
                {coachList.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isLoadingCoachAvailability && (
            <div className="tm-booking-info">{t("booking.loadingCoachAvailability")}</div>
          )}

          <div className="tm-booking-select-wrapper">
            <label htmlFor="slot-select" className="tm-booking-label">
              {t("booking.selectTimeSlot")}
            </label>
            <select
              id="slot-select"
              className="tm-booking-select"
              value={selectedSlotIndex ?? ""}
              onChange={(e) =>
                setSelectedSlotIndex(e.target.value ? parseInt(e.target.value, 10) : null)
              }
              disabled={isLoading || isLoadingCoachAvailability}
            >
              <option value="">{t("booking.chooseTimeSlot")}</option>
              {filteredSlots.map(({ slot, index, available }) => (
                <option 
                  key={`${slot.startTime}-${slot.endTime}`} 
                  value={index}
                  disabled={!available}
                >
                  {formatSlot(slot)}{!available ? ` (${t("booking.coachUnavailable")})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Show warning if selected slot is unavailable for coach */}
          {selectedSlotUnavailabilityReason && (
            <div className="tm-booking-alert tm-booking-alert--error" role="alert">
              {selectedSlotUnavailabilityReason}
            </div>
          )}

          {/* Show selected slot price */}
          {selectedSlot?.priceCents !== undefined && (
            <div className="tm-booking-price-info mt-3 p-3 rounded-sm bg-gray-50 dark:bg-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t("common.price")}: </span>
              <span className="font-semibold">{formatPrice(selectedSlot.priceCents)}</span>
            </div>
          )}

          <div className="tm-booking-actions">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={
                isLoading || 
                isLoadingCoachAvailability ||
                selectedSlotIndex === null ||
                selectedSlotUnavailabilityReason !== null
              }
            >
              {isLoading ? t("booking.reserving") : t("booking.reserve")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
