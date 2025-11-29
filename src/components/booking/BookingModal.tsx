"use client";

import { useState } from "react";
import { Modal, Button } from "@/components/ui";
import { formatPrice } from "@/utils/price";
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
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectedSlot = selectedSlotIndex !== null ? availableSlots[selectedSlotIndex] : null;

  const handleConfirm = async () => {
    if (selectedSlotIndex === null || !selectedSlot) {
      setAlert({ type: "error", message: "Please select a time slot" });
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
          message: "Selected time slot is already booked. Please choose another slot.",
        });
        return;
      }

      if (!response.ok) {
        setAlert({
          type: "error",
          message: data.error || "Failed to create booking",
        });
        return;
      }

      setAlert({
        type: "success",
        message: `Booking reserved successfully${data.priceCents ? ` - ${formatPrice(data.priceCents)}` : ""}`,
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
        message: "An error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedSlotIndex(null);
    setSelectedCoachId(null);
    setAlert(null);
    onClose();
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Reserve Booking">
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
          <div className="tm-booking-select-wrapper">
            <label htmlFor="slot-select" className="tm-booking-label">
              Select Time Slot
            </label>
            <select
              id="slot-select"
              className="tm-booking-select"
              value={selectedSlotIndex ?? ""}
              onChange={(e) =>
                setSelectedSlotIndex(e.target.value ? parseInt(e.target.value, 10) : null)
              }
              disabled={isLoading}
            >
              <option value="">Choose a time slot...</option>
              {availableSlots.map((slot, index) => (
                <option key={`${slot.startTime}-${slot.endTime}`} value={index}>
                  {formatSlot(slot)}
                </option>
              ))}
            </select>
          </div>

          {/* Show selected slot price */}
          {selectedSlot?.priceCents !== undefined && (
            <div className="tm-booking-price-info mt-3 p-3 rounded bg-gray-50 dark:bg-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Price: </span>
              <span className="font-semibold">{formatPrice(selectedSlot.priceCents)}</span>
            </div>
          )}

          {coachList && coachList.length > 0 && (
            <div className="tm-booking-select-wrapper">
              <label htmlFor="coach-select" className="tm-booking-label">
                Select Coach (Optional)
              </label>
              <select
                id="coach-select"
                className="tm-booking-select"
                value={selectedCoachId ?? ""}
                onChange={(e) => setSelectedCoachId(e.target.value || null)}
                disabled={isLoading}
              >
                <option value="">No coach</option>
                {coachList.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="tm-booking-actions">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading || selectedSlotIndex === null}>
              {isLoading ? "Reserving..." : "Reserve Booking"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
