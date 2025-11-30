"use client";

import { Modal, Button } from "@/components/ui";
import type { CourtAvailabilityStatus } from "@/types/court";
import "./CourtAvailabilityModal.css";

interface CourtAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  hour: number;
  courts: CourtAvailabilityStatus[];
  onSelectCourt?: (courtId: string, date: string, startTime: string, endTime: string) => void;
}

// Format hour for display
function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Get status label
function getStatusLabel(status: "available" | "booked" | "partial"): string {
  switch (status) {
    case "available":
      return "Available";
    case "partial":
      return "Partially booked";
    case "booked":
      return "Booked";
  }
}

export function CourtAvailabilityModal({
  isOpen,
  onClose,
  date,
  hour,
  courts,
  onSelectCourt,
}: CourtAvailabilityModalProps) {
  const handleSelectCourt = (courtId: string) => {
    if (onSelectCourt) {
      const startTime = formatHour(hour);
      const endTime = formatHour(hour + 1);
      onSelectCourt(courtId, date, startTime, endTime);
    }
  };

  const sortedCourts = [...courts].sort((a, b) => {
    // Sort by status: available first, then partial, then booked
    const statusOrder = { available: 0, partial: 1, booked: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const availableCourts = courts.filter((c) => c.status === "available");
  const hasAvailableCourts = availableCourts.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Court Availability"
    >
      <div className="tm-court-availability-modal">
        <div className="tm-court-availability-header">
          <p className="tm-court-availability-title">
            {formatDate(date)}
          </p>
          <p className="tm-court-availability-subtitle">
            {formatHour(hour)} - {formatHour(hour + 1)}
          </p>
        </div>

        {courts.length === 0 ? (
          <div className="tm-court-availability-empty">
            <p className="tm-court-availability-empty-text">
              No courts found for this club.
            </p>
          </div>
        ) : (
          <div className="tm-court-availability-list" role="list">
            {sortedCourts.map((court) => (
              <div
                key={court.courtId}
                className={`tm-court-availability-item tm-court-availability-item--${court.status}`}
                role="listitem"
              >
                <div className="tm-court-info">
                  <div className="tm-court-name">{court.courtName}</div>
                  <div className="tm-court-meta">
                    {court.courtType && (
                      <span className="tm-court-badge">{court.courtType}</span>
                    )}
                    <span
                      className={`tm-court-badge ${
                        court.indoor
                          ? "tm-court-badge--indoor"
                          : "tm-court-badge--outdoor"
                      }`}
                    >
                      {court.indoor ? "Indoor" : "Outdoor"}
                    </span>
                  </div>
                </div>
                <div className="tm-court-status">
                  <span
                    className={`tm-court-status-badge tm-court-status-badge--${court.status}`}
                  >
                    {getStatusLabel(court.status)}
                  </span>
                  {court.status === "available" && onSelectCourt && (
                    <Button
                      className="tm-court-book-btn"
                      onClick={() => handleSelectCourt(court.courtId)}
                      aria-label={`Book ${court.courtName}`}
                    >
                      Book
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasAvailableCourts && courts.length > 0 && (
          <p className="text-sm text-center mt-4 opacity-70">
            No courts available at this time. Try another slot.
          </p>
        )}
      </div>
    </Modal>
  );
}
