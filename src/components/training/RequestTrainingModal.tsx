"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Modal, Button, Input } from "@/components/ui";
import "./RequestTrainingModal.css";

interface Trainer {
  id: string;
  name: string;
}

interface TrainerAvailability {
  trainerId: string;
  trainerName: string;
  availability: Record<string, { start: string; end: string }[]>;
  busyTimes: Record<string, string[]>;
}

interface RequestTrainingModalProps {
  clubId: string;
  trainers: Trainer[];
  playerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Business hours configuration
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 22;

// Get today's date in YYYY-MM-DD format
function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

// Generate time options for the dropdown
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
    const hourStr = hour.toString().padStart(2, "0");
    options.push(`${hourStr}:00`);
    options.push(`${hourStr}:30`);
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

// Format date for display
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function RequestTrainingModal({
  clubId,
  trainers,
  playerId,
  isOpen,
  onClose,
  onSuccess,
}: RequestTrainingModalProps) {
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedTime, setSelectedTime] = useState<string>("10:00");
  const [comment, setComment] = useState<string>("");
  const [trainerAvailability, setTrainerAvailability] = useState<TrainerAvailability | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);

  // Reference for focus trapping
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch trainer availability when trainer is selected
  const fetchTrainerAvailability = useCallback(async (trainerId: string) => {
    if (!trainerId) {
      setTrainerAvailability(null);
      return;
    }

    setIsLoadingAvailability(true);
    try {
      const response = await fetch(`/api/trainers/${trainerId}/availability`);
      if (response.ok) {
        const data = await response.json();
        setTrainerAvailability(data);
      } else {
        setTrainerAvailability(null);
      }
    } catch {
      setTrainerAvailability(null);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, []);

  // Effect to fetch availability when trainer changes
  useEffect(() => {
    if (selectedTrainerId) {
      fetchTrainerAvailability(selectedTrainerId);
    } else {
      setTrainerAvailability(null);
    }
  }, [selectedTrainerId, fetchTrainerAvailability]);

  // Check if selected date and time is valid for the trainer
  const getAvailabilityStatus = (): { isValid: boolean; message: string } => {
    if (!trainerAvailability) {
      return { isValid: true, message: "" };
    }

    const availability = trainerAvailability.availability[selectedDate];
    const busyTimes = trainerAvailability.busyTimes[selectedDate] || [];

    // Check if trainer works on this day
    if (!availability || availability.length === 0) {
      return {
        isValid: false,
        message: "Trainer does not work on this day. Choose another date.",
      };
    }

    // Check if selected time is within trainer's working hours
    const isWithinWorkingHours = availability.some(
      (slot) => selectedTime >= slot.start && selectedTime < slot.end
    );

    if (!isWithinWorkingHours) {
      const hoursStr = availability.map((s) => `${s.start}-${s.end}`).join(", ");
      return {
        isValid: false,
        message: `Trainer works ${hoursStr}. Choose a different time.`,
      };
    }

    // Check if time is already booked
    if (busyTimes.includes(selectedTime)) {
      return {
        isValid: false,
        message: "Trainer already has training at this time. Choose another slot.",
      };
    }

    return { isValid: true, message: "" };
  };

  const handleSubmit = async () => {
    if (!selectedTrainerId || !selectedDate || !selectedTime) {
      setAlert({ type: "error", message: "Please fill in all required fields" });
      return;
    }

    const availabilityStatus = getAvailabilityStatus();
    if (!availabilityStatus.isValid) {
      setAlert({ type: "error", message: availabilityStatus.message });
      return;
    }

    setIsSubmitting(true);
    setAlert(null);

    try {
      const response = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainerId: selectedTrainerId,
          playerId,
          clubId,
          date: selectedDate,
          time: selectedTime,
          comment: comment || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAlert({ type: "error", message: data.error || "Failed to create training request" });
        return;
      }

      setSubmittedRequestId(data.id);
      setAlert({ type: "success", message: data.message });

      // Notify parent of success
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      setAlert({ type: "error", message: "An error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!submittedRequestId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trainings/${submittedRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (response.ok) {
        setAlert({ type: "success", message: "Training request cancelled" });
        setSubmittedRequestId(null);
        // Reset form
        setSelectedTrainerId("");
        setSelectedDate(getTodayDateString());
        setSelectedTime("10:00");
        setComment("");
      } else {
        const data = await response.json();
        setAlert({ type: "error", message: data.error || "Failed to cancel request" });
      }
    } catch {
      setAlert({ type: "error", message: "An error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setSelectedTrainerId("");
    setSelectedDate(getTodayDateString());
    setSelectedTime("10:00");
    setComment("");
    setTrainerAvailability(null);
    setAlert(null);
    setSubmittedRequestId(null);
    onClose();
  };

  const handleTrainerChange = (trainerId: string) => {
    setSelectedTrainerId(trainerId);
    setAlert(null);
  };

  // Render availability preview
  const renderAvailabilityPreview = () => {
    if (!selectedTrainerId) {
      return null;
    }

    if (isLoadingAvailability) {
      return (
        <div className="tm-trainer-availability">
          <p className="tm-trainer-availability-none">Loading availability...</p>
        </div>
      );
    }

    if (!trainerAvailability) {
      return (
        <div className="tm-trainer-availability">
          <p className="tm-trainer-availability-none">Could not load availability</p>
        </div>
      );
    }

    const availabilityDates = Object.keys(trainerAvailability.availability).slice(0, 5);

    if (availabilityDates.length === 0) {
      return (
        <div className="tm-trainer-availability">
          <p className="tm-trainer-availability-none">No upcoming availability found</p>
        </div>
      );
    }

    return (
      <div className="tm-trainer-availability">
        <p className="tm-trainer-availability-title">Trainer availability:</p>
        {availabilityDates.map((date) => {
          const slots = trainerAvailability.availability[date];
          const hoursStr = slots.map((s) => `${s.start}-${s.end}`).join(", ");
          return (
            <div key={date} className="tm-trainer-availability-item">
              <span className="tm-trainer-availability-date">{formatDateDisplay(date)}</span>
              <span className="tm-trainer-availability-hours">{hoursStr}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const availabilityStatus = getAvailabilityStatus();

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Request Training">
      <div className="tm-request-training-modal" ref={modalRef}>
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

        {/* Show cancel option if request was submitted */}
        {submittedRequestId && (
          <div className="tm-request-training-status tm-request-training-status--pending">
            <p className="mb-3">Your training request is pending confirmation.</p>
            <Button
              variant="outline"
              onClick={handleCancelRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Cancelling..." : "Cancel Request"}
            </Button>
          </div>
        )}

        {/* Show form if no request submitted yet */}
        {!submittedRequestId && (
          <div className="tm-request-training-form">
            {/* Trainer selection */}
            <div className="tm-booking-select-wrapper">
              <label htmlFor="trainer-select" className="tm-booking-label">
                Select Trainer
              </label>
              <select
                id="trainer-select"
                className="tm-booking-select"
                value={selectedTrainerId}
                onChange={(e) => handleTrainerChange(e.target.value)}
                disabled={isSubmitting}
                aria-describedby="trainer-availability-preview"
              >
                <option value="">Choose a trainer...</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Availability preview */}
            <div id="trainer-availability-preview">
              {renderAvailabilityPreview()}
            </div>

            {/* Date picker */}
            <div className="tm-booking-select-wrapper">
              <label htmlFor="training-date" className="tm-booking-label">
                Date
              </label>
              <input
                id="training-date"
                type="date"
                className="tm-booking-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getTodayDateString()}
                disabled={isSubmitting}
              />
            </div>

            {/* Time picker */}
            <div className="tm-booking-select-wrapper">
              <label htmlFor="training-time" className="tm-booking-label">
                Time
              </label>
              <select
                id="training-time"
                className="tm-booking-select"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                disabled={isSubmitting}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            {/* Validation message */}
            {selectedTrainerId && !availabilityStatus.isValid && (
              <div className="tm-booking-alert tm-booking-alert--error" role="alert">
                {availabilityStatus.message}
              </div>
            )}

            {/* Comment input */}
            <Input
              id="training-comment"
              label="Comment (optional)"
              placeholder="Any notes for the trainer..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
            />

            {/* Actions */}
            <div className="tm-booking-actions">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !selectedTrainerId ||
                  !selectedDate ||
                  !selectedTime ||
                  !availabilityStatus.isValid
                }
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
