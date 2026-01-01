"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, Tooltip } from "@/components/ui";
import { SectionEditModal } from "./SectionEditModal";
import { BusinessHoursField } from "../BusinessHoursField.client";
import { validateBusinessHours } from "../WorkingHoursEditor.client";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import type { BusinessHour } from "@/types/admin";
import type { ClubDetail, ClubBusinessHours } from "@/types/club";
import { DAY_TRANSLATION_KEYS } from "@/constants/workingHours";
import "./ClubHoursView.css";

interface ClubHoursViewProps {
  club: ClubDetail;
  disabled?: boolean;
  disabledTooltip?: string;
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

export function ClubHoursView({ club, disabled = false, disabledTooltip }: ClubHoursViewProps) {
  const t = useTranslations();
  const updateClubInStore = useAdminClubStore((state) => state.updateClubInStore);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(() =>
    initializeBusinessHours(club.businessHours)
  );

  const handleEdit = useCallback(() => {
    setBusinessHours(initializeBusinessHours(club.businessHours));
    setError("");
    setIsEditing(true);
  }, [club]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setError("");
  }, []);

  const handleSave = useCallback(async () => {
    // Validate business hours
    const validationError = validateBusinessHours(businessHours);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const businessHoursResponse = await fetch(`/api/admin/clubs/${club.id}/business-hours`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessHours,
        }),
      });

      if (!businessHoursResponse.ok) {
        const data = await businessHoursResponse.json();
        throw new Error(data.error || "Failed to update business hours");
      }

      // Get updated club data from response
      const updatedClub = await businessHoursResponse.json();

      // Update store reactively - no page reload needed
      updateClubInStore(club.id, updatedClub);

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [businessHours, club.id, updateClubInStore]);

  return (
    <>
      <div className="im-section-view-header">
        <h2 className="im-club-view-section-title">{t("businessHours.title")}</h2>
        <Tooltip
          content={disabled ? disabledTooltip : undefined}
          position="bottom"
        >
          <Button
            variant="outline"
            onClick={handleEdit}
            disabled={disabled}
          >
            {t("common.edit")}
          </Button>
        </Tooltip>
      </div>

      <div className="im-section-view">
        <div className="im-hours-view-weekly">
          {club.businessHours.length > 0 ? (
            club.businessHours.map((hour) => (
              <div key={hour.dayOfWeek} className="im-hours-view-row">
                <span className="im-hours-view-day">
                  {t(DAY_TRANSLATION_KEYS[hour.dayOfWeek])}
                </span>
                <span className="im-hours-view-time">
                  {hour.isClosed
                    ? t("businessHours.closed")
                    : `${formatTime(hour.openTime)} - ${formatTime(hour.closeTime)}`}
                </span>
              </div>
            ))
          ) : (
            <p className="im-section-view-value--empty">{t("businessHours.noHoursSet")}</p>
          )}
        </div>
      </div>

      <SectionEditModal
        isOpen={isEditing}
        onClose={handleClose}
        title={t("businessHours.editTitle")}
        onSave={handleSave}
        isSaving={isSaving}
      >
        {error && <div className="im-section-edit-modal-error">{error}</div>}

        <BusinessHoursField
          value={businessHours}
          onChange={setBusinessHours}
          disabled={isSaving}
        />
      </SectionEditModal>
    </>
  );
}
