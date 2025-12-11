"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Modal, Button, Input, Select } from "@/components/ui";
import { useBookingStore } from "@/stores/useBookingStore";
import { showToast } from "@/lib/toast";
import type { Court } from "@/types/court";
import "./QuickCreateModal.css";

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  courtId: string;
  startTime: Date;
  courts: Court[];
  onSuccess: () => void;
}

/**
 * QuickCreateModal component
 * 
 * Modal for quickly creating a booking from a calendar slot.
 * Pre-fills court and start time, allows user to select customer and duration.
 */
export function QuickCreateModal({
  isOpen,
  onClose,
  clubId,
  courtId,
  startTime,
  courts,
  onSuccess,
}: QuickCreateModalProps) {
  const t = useTranslations();
  const createBooking = useBookingStore((state) => state.createBooking);

  const [selectedCourtId, setSelectedCourtId] = useState(courtId);
  const [selectedStartTime, setSelectedStartTime] = useState(
    startTime.toISOString().slice(0, 16)
  );
  const [duration, setDuration] = useState(60); // minutes
  const [userEmail, setUserEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Update state when props change
  useEffect(() => {
    setSelectedCourtId(courtId);
    setSelectedStartTime(startTime.toISOString().slice(0, 16));
    setError("");
  }, [courtId, startTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!userEmail.trim()) {
      setError("User email is required");
      return;
    }

    if (!selectedCourtId) {
      setError("Court is required");
      return;
    }

    if (duration < 30) {
      setError("Minimum duration is 30 minutes");
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate end time
      const start = new Date(selectedStartTime);
      const end = new Date(start.getTime() + duration * 60 * 1000);

      // For MVP, we'll need to look up the user by email first
      // In a real implementation, you'd have a user selector component
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(userEmail)}`);
      
      if (!response.ok) {
        throw new Error("Failed to find user");
      }

      const usersData = await response.json();
      const users = usersData.users || [];
      
      if (users.length === 0) {
        throw new Error("User not found. Please enter a valid user email.");
      }

      const user = users[0];

      // Create booking
      await createBooking({
        userId: user.id,
        courtId: selectedCourtId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        clubId,
      });

      showToast(t("operations.bookingCreated") || "Booking created successfully", {
        type: "success",
      });

      onSuccess();
      onClose();
      
      // Reset form
      setUserEmail("");
      setDuration(60);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create booking";
      setError(errorMessage);
      showToast(errorMessage, { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCourt = courts.find((c) => c.id === selectedCourtId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("operations.quickCreate") || "Quick Create Booking"}
    >
      <form onSubmit={handleSubmit} className="im-quick-create-form">
        {error && (
          <div className="im-quick-create-error" role="alert">
            {error}
          </div>
        )}

        {/* Court selection */}
        <div className="im-quick-create-field">
          <label htmlFor="court" className="im-quick-create-label">
            {t("operations.court") || "Court"}
          </label>
          <Select
            id="court"
            value={selectedCourtId}
            onChange={(value) => setSelectedCourtId(value)}
            required
            options={courts.map((court) => ({
              value: court.id,
              label: `${court.name}${court.indoor !== undefined ? ` (${court.indoor ? "Indoor" : "Outdoor"})` : ""}`,
            }))}
          />
        </div>

        {/* Start time */}
        <div className="im-quick-create-field">
          <label htmlFor="startTime" className="im-quick-create-label">
            {t("operations.startTime") || "Start Time"}
          </label>
          <Input
            id="startTime"
            type="datetime-local"
            value={selectedStartTime}
            onChange={(e) => setSelectedStartTime(e.target.value)}
            required
          />
        </div>

        {/* Duration */}
        <div className="im-quick-create-field">
          <label htmlFor="duration" className="im-quick-create-label">
            {t("operations.duration") || "Duration (minutes)"}
          </label>
          <Select
            id="duration"
            value={duration.toString()}
            onChange={(value) => setDuration(parseInt(value, 10))}
            required
            options={[
              { value: "30", label: "30 minutes" },
              { value: "60", label: "60 minutes" },
              { value: "90", label: "90 minutes" },
              { value: "120", label: "120 minutes" },
            ]}
          />
        </div>

        {/* User email */}
        <div className="im-quick-create-field">
          <label htmlFor="userEmail" className="im-quick-create-label">
            {t("operations.userEmail") || "User Email"}
          </label>
          <Input
            id="userEmail"
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />
          <p className="im-quick-create-hint">
            {t("operations.userEmailHint") || "Enter the email of the user to book for"}
          </p>
        </div>

        {/* Summary */}
        {selectedCourt && (
          <div className="im-quick-create-summary">
            <h4 className="im-quick-create-summary-title">
              {t("operations.bookingSummary") || "Booking Summary"}
            </h4>
            <div className="im-quick-create-summary-content">
              <div>
                <strong>{t("operations.court") || "Court"}:</strong> {selectedCourt.name}
              </div>
              <div>
                <strong>{t("operations.startTime") || "Start"}:</strong>{" "}
                {new Date(selectedStartTime).toLocaleString()}
              </div>
              <div>
                <strong>{t("operations.duration") || "Duration"}:</strong> {duration} minutes
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="im-quick-create-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting
              ? t("operations.creating") || "Creating..."
              : t("operations.createBooking") || "Create Booking"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
