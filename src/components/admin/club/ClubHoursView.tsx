"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button, Tooltip } from "@/components/ui";
import { SectionEditModal } from "./SectionEditModal";
import { BusinessHoursField } from "../BusinessHoursField.client";
import { validateBusinessHours } from "../WorkingHoursEditor.client";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { timeOfDayFromUTC, timeOfDayToUTC } from "@/utils/dateTime";
import { getClubTimezone } from "@/constants/timezone";
import type { BusinessHour } from "@/types/admin";
import type { ClubDetail, ClubBusinessHours } from "@/types/club";
import { DAY_TRANSLATION_KEYS } from "@/constants/workingHours";
import "./ClubHoursView.css";

interface ClubHoursViewProps {
  club: ClubDetail;
  disabled?: boolean;
  disabledTooltip?: string;
}

/**
 * Initialize business hours for editing
 * Converts UTC times from the database to club-local times for display
 */
function initializeBusinessHours(
  existing: ClubBusinessHours[],
  clubTimezone: string
): BusinessHour[] {
  const hours: BusinessHour[] = [];
  for (let i = 0; i < 7; i++) {
    const existingHour = existing.find((h) => h.dayOfWeek === i);
    if (existingHour) {
      // Convert UTC times to club-local times for display
      const openTime = existingHour.openTime && !existingHour.isClosed
        ? timeOfDayFromUTC(existingHour.openTime, clubTimezone)
        : existingHour.openTime;
      const closeTime = existingHour.closeTime && !existingHour.isClosed
        ? timeOfDayFromUTC(existingHour.closeTime, clubTimezone)
        : existingHour.closeTime;
      
      hours.push({
        dayOfWeek: i,
        openTime,
        closeTime,
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

/**
 * Convert business hours from club-local to UTC for API submission
 */
function convertBusinessHoursToUTC(
  hours: BusinessHour[],
  clubTimezone: string
): BusinessHour[] {
  return hours.map((hour) => {
    if (hour.isClosed || !hour.openTime || !hour.closeTime) {
      return hour;
    }
    
    // Convert club-local times to UTC
    return {
      ...hour,
      openTime: timeOfDayToUTC(hour.openTime, clubTimezone),
      closeTime: timeOfDayToUTC(hour.closeTime, clubTimezone),
    };
  });
}

export function ClubHoursView({ club, disabled = false, disabledTooltip }: ClubHoursViewProps) {
  const t = useTranslations();
  const updateClubInStore = useAdminClubStore((state) => state.updateClubInStore);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Get club timezone with fallback
  const clubTimezone = getClubTimezone(club.timezone);
  
  // Convert stored UTC hours to club-local for display
  const displayHours = useMemo(() => {
    return club.businessHours.map((hour) => {
      if (hour.isClosed || !hour.openTime || !hour.closeTime) {
        return hour;
      }
      return {
        ...hour,
        openTime: timeOfDayFromUTC(hour.openTime, clubTimezone),
        closeTime: timeOfDayFromUTC(hour.closeTime, clubTimezone),
      };
    });
  }, [club.businessHours, clubTimezone]);
  
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(() =>
    initializeBusinessHours(club.businessHours, clubTimezone)
  );

  const handleEdit = useCallback(() => {
    setBusinessHours(initializeBusinessHours(club.businessHours, clubTimezone));
    setError("");
    setIsEditing(true);
  }, [club.businessHours, clubTimezone]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setError("");
  }, []);

  const handleSave = useCallback(async () => {
    // Validate business hours (in club-local time)
    const validationError = validateBusinessHours(businessHours);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      // Convert club-local times to UTC before sending to backend
      const businessHoursUTC = convertBusinessHoursToUTC(businessHours, clubTimezone);
      
      const businessHoursResponse = await fetch(`/api/admin/clubs/${club.id}/business-hours`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessHours: businessHoursUTC,
        }),
      });

      if (!businessHoursResponse.ok) {
        const data = await businessHoursResponse.json();
        throw new Error(data.error || t("clubDetail.failedToUpdateBusinessHours"));
      }

      // Get updated club data from response
      const updatedClub = await businessHoursResponse.json();

      // Update store reactively - no page reload needed
      updateClubInStore(club.id, updatedClub);

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("clubDetail.failedToSaveChanges"));
    } finally {
      setIsSaving(false);
    }
  }, [businessHours, club.id, clubTimezone, updateClubInStore, t]);

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
          {displayHours.length > 0 ? (
            displayHours.map((hour) => (
              <div key={hour.dayOfWeek} className="im-hours-view-row">
                <span className="im-hours-view-day">
                  {t(DAY_TRANSLATION_KEYS[hour.dayOfWeek])}
                </span>
                <span className="im-hours-view-time">
                  {hour.isClosed
                    ? t("businessHours.closed")
                    : `${hour.openTime} - ${hour.closeTime}`}
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
