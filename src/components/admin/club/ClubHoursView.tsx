"use client";

import { useState, useCallback } from "react";
import { Button, Input } from "@/components/ui";
import { SectionEditModal } from "./SectionEditModal";
import type { ClubDetail, ClubBusinessHours, ClubSpecialHours } from "@/types/club";
import "./ClubHoursView.css";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface BusinessHour {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

interface SpecialHour {
  id?: string;
  date: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  reason: string;
}

interface ClubHoursViewProps {
  club: ClubDetail;
  onUpdate?: (payload: {
    businessHours: BusinessHour[];
    specialHours: SpecialHour[];
  }) => Promise<unknown>;
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

function initializeBusinessHours(existing: ClubBusinessHours[]): BusinessHour[] {
  const hours: BusinessHour[] = [];
  for (let i = 0; i < 7; i++) {
    const existingHour = existing.find((h) => h.dayOfWeek === i);
    if (existingHour) {
      hours.push({
        dayOfWeek: i,
        openTime: existingHour.openTime,
        closeTime: existingHour.closeTime,
        isClosed: existingHour.isClosed,
      });
    } else {
      hours.push({
        dayOfWeek: i,
        openTime: "09:00",
        closeTime: "21:00",
        isClosed: false,
      });
    }
  }
  return hours;
}

function formatSpecialHours(special: ClubSpecialHours[]): SpecialHour[] {
  return special.map((h) => ({
    id: h.id,
    date: h.date.split("T")[0],
    openTime: h.openTime,
    closeTime: h.closeTime,
    isClosed: h.isClosed,
    reason: h.reason || "",
  }));
}

export function ClubHoursView({ club, onUpdate }: ClubHoursViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(() =>
    initializeBusinessHours(club.businessHours)
  );
  const [specialHours, setSpecialHours] = useState<SpecialHour[]>(() =>
    formatSpecialHours(club.specialHours)
  );

  const handleEdit = useCallback(() => {
    setBusinessHours(initializeBusinessHours(club.businessHours));
    setSpecialHours(formatSpecialHours(club.specialHours));
    setError("");
    setIsEditing(true);
  }, [club]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setError("");
  }, []);

  const handleTimeChange = useCallback(
    (dayOfWeek: number, field: "openTime" | "closeTime", value: string) => {
      setBusinessHours((prev) =>
        prev.map((hour) =>
          hour.dayOfWeek === dayOfWeek ? { ...hour, [field]: value || null } : hour
        )
      );
    },
    []
  );

  const handleClosedToggle = useCallback((dayOfWeek: number) => {
    setBusinessHours((prev) =>
      prev.map((hour) =>
        hour.dayOfWeek === dayOfWeek
          ? {
              ...hour,
              isClosed: !hour.isClosed,
              openTime: !hour.isClosed ? null : "09:00",
              closeTime: !hour.isClosed ? null : "21:00",
            }
          : hour
      )
    );
  }, []);

  const handleAddSpecialHour = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    setSpecialHours((prev) => [
      ...prev,
      {
        date: today,
        openTime: null,
        closeTime: null,
        isClosed: true,
        reason: "",
      },
    ]);
  }, []);

  const handleRemoveSpecialHour = useCallback((index: number) => {
    setSpecialHours((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSpecialHourChange = useCallback(
    (index: number, field: keyof SpecialHour, value: string | boolean) => {
      setSpecialHours((prev) =>
        prev.map((hour, i) => {
          if (i !== index) return hour;
          if (field === "isClosed") {
            return {
              ...hour,
              isClosed: value as boolean,
              openTime: value ? null : "09:00",
              closeTime: value ? null : "21:00",
            };
          }
          return { ...hour, [field]: value || null };
        })
      );
    },
    []
  );

  const handleSave = useCallback(async () => {
    // Validate business hours
    for (const hour of businessHours) {
      if (!hour.isClosed && hour.openTime && hour.closeTime) {
        if (hour.openTime >= hour.closeTime) {
          setError(
            `Invalid hours for ${DAY_NAMES[hour.dayOfWeek]}: opening time must be before closing time`
          );
          return;
        }
      }
    }

    // Validate special hours
    const dates = specialHours.map((h) => h.date);
    const uniqueDates = new Set(dates);
    if (dates.length !== uniqueDates.size) {
      setError("Duplicate dates in special hours");
      return;
    }

    for (const hour of specialHours) {
      if (!hour.isClosed && hour.openTime && hour.closeTime) {
        if (hour.openTime >= hour.closeTime) {
          setError(
            `Invalid special hours for ${hour.date}: opening time must be before closing time`
          );
          return;
        }
      }
    }

    setIsSaving(true);
    setError("");
    try {
      if (onUpdate) {
        await onUpdate({ businessHours, specialHours });
      setIsEditing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [businessHours, specialHours, onUpdate]);

  return (
    <>
      <div className="im-section-view-header">
        <h2 className="im-club-view-section-title">Business Hours</h2>
        <Button
          variant="outline"
          onClick={handleEdit}
          className="im-section-edit-btn"
        >
          Edit
        </Button>
      </div>

      <div className="im-section-view">
        <div className="im-hours-view-weekly">
          {club.businessHours.length > 0 ? (
            club.businessHours.map((hour) => (
              <div key={hour.dayOfWeek} className="im-hours-view-row">
                <span className="im-hours-view-day">
                  {DAY_NAMES[hour.dayOfWeek]}
                </span>
                <span className="im-hours-view-time">
                  {hour.isClosed
                    ? "Closed"
                    : `${formatTime(hour.openTime)} - ${formatTime(hour.closeTime)}`}
                </span>
              </div>
            ))
          ) : (
            <p className="im-section-view-value--empty">No hours set</p>
          )}
        </div>

        {club.specialHours.length > 0 && (
          <div className="im-hours-view-special">
            <h3 className="im-hours-view-special-title">Special Hours</h3>
            {club.specialHours.map((hour) => (
              <div key={hour.id} className="im-hours-view-special-row">
                <span className="im-hours-view-special-date">
                  {new Date(hour.date).toLocaleDateString()}
                </span>
                <span className="im-hours-view-time">
                  {hour.isClosed
                    ? "Closed"
                    : `${formatTime(hour.openTime)} - ${formatTime(hour.closeTime)}`}
                </span>
                {hour.reason && (
                  <span className="im-hours-view-special-reason">
                    ({hour.reason})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <SectionEditModal
        isOpen={isEditing}
        onClose={handleClose}
        title="Edit Business Hours"
        onSave={handleSave}
        isSaving={isSaving}
      >
        {error && <div className="im-section-edit-modal-error">{error}</div>}

        <div className="im-hours-edit-section">
          <h3 className="im-hours-edit-section-title">Weekly Schedule</h3>
          <div className="im-hours-edit-grid">
            {businessHours.map((hour) => (
              <div key={hour.dayOfWeek} className="im-hours-edit-row">
                <span className="im-hours-edit-day">
                  {DAY_NAMES[hour.dayOfWeek]}
                </span>
                <div className="im-hours-edit-times">
                  {hour.isClosed ? (
                    <span className="im-hours-edit-closed-text">Closed</span>
                  ) : (
                    <>
                      <input
                        type="time"
                        value={hour.openTime || ""}
                        onChange={(e) =>
                          handleTimeChange(hour.dayOfWeek, "openTime", e.target.value)
                        }
                        className="im-hours-edit-input"
                        disabled={isSaving}
                      />
                      <span className="im-hours-edit-separator">to</span>
                      <input
                        type="time"
                        value={hour.closeTime || ""}
                        onChange={(e) =>
                          handleTimeChange(hour.dayOfWeek, "closeTime", e.target.value)
                        }
                        className="im-hours-edit-input"
                        disabled={isSaving}
                      />
                    </>
                  )}
                </div>
                <label className="im-hours-edit-toggle">
                  <input
                    type="checkbox"
                    checked={hour.isClosed}
                    onChange={() => handleClosedToggle(hour.dayOfWeek)}
                    disabled={isSaving}
                  />
                  <span>Closed</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="im-hours-edit-section">
          <div className="im-hours-edit-section-header">
            <h3 className="im-hours-edit-section-title">Special Date Overrides</h3>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddSpecialHour}
              disabled={isSaving}
              className="im-section-edit-btn"
            >
              + Add Date
            </Button>
          </div>
          {specialHours.length > 0 ? (
            <div className="im-hours-edit-special-list">
              {specialHours.map((hour, index) => (
                <div key={index} className="im-hours-edit-special-row">
                  <Input
                    type="date"
                    value={hour.date}
                    onChange={(e) =>
                      handleSpecialHourChange(index, "date", e.target.value)
                    }
                    disabled={isSaving}
                  />
                  <div className="im-hours-edit-times">
                    {hour.isClosed ? (
                      <span className="im-hours-edit-closed-text">Closed</span>
                    ) : (
                      <>
                        <input
                          type="time"
                          value={hour.openTime || ""}
                          onChange={(e) =>
                            handleSpecialHourChange(index, "openTime", e.target.value)
                          }
                          className="im-hours-edit-input"
                          disabled={isSaving}
                        />
                        <span className="im-hours-edit-separator">to</span>
                        <input
                          type="time"
                          value={hour.closeTime || ""}
                          onChange={(e) =>
                            handleSpecialHourChange(index, "closeTime", e.target.value)
                          }
                          className="im-hours-edit-input"
                          disabled={isSaving}
                        />
                      </>
                    )}
                  </div>
                  <label className="im-hours-edit-toggle">
                    <input
                      type="checkbox"
                      checked={hour.isClosed}
                      onChange={(e) =>
                        handleSpecialHourChange(index, "isClosed", e.target.checked)
                      }
                      disabled={isSaving}
                    />
                    <span>Closed</span>
                  </label>
                  <Input
                    placeholder="Reason (optional)"
                    value={hour.reason}
                    onChange={(e) =>
                      handleSpecialHourChange(index, "reason", e.target.value)
                    }
                    disabled={isSaving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemoveSpecialHour(index)}
                    disabled={isSaving}
                    className="im-hours-edit-remove-btn"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="im-section-view-value--empty">No special hours set</p>
          )}
        </div>
      </SectionEditModal>
    </>
  );
}
