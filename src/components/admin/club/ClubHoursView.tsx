"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui";
import { SectionEditModal } from "./SectionEditModal";
import { WorkingHoursEditor, validateWorkingHours } from "../WorkingHoursEditor.client";
import type { SpecialHour } from "../SpecialHoursField.client";
import type { BusinessHour } from "@/types/admin";
import type { ClubDetail, ClubBusinessHours, ClubSpecialHours } from "@/types/club";
import { DAY_NAMES } from "@/constants/workingHours";
import "./ClubHoursView.css";

interface ClubHoursViewProps {
  club: ClubDetail;
  onUpdate: (payload: {
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

  const handleSave = useCallback(async () => {
    // Validate working hours
    const validationError = validateWorkingHours(businessHours, specialHours);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await onUpdate({ businessHours, specialHours });
      setIsEditing(false);
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
        
        <WorkingHoursEditor
          businessHours={businessHours}
          specialHours={specialHours}
          onBusinessHoursChange={setBusinessHours}
          onSpecialHoursChange={setSpecialHours}
          disabled={isSaving}
          showSpecialHours={true}
        />
      </SectionEditModal>
    </>
  );
}
