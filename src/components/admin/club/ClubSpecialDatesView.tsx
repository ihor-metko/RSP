"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, Tooltip } from "@/components/ui";
import { SectionEditModal } from "./SectionEditModal";
import { SpecialHoursField, type SpecialHour } from "../SpecialHoursField.client";
import type { ClubDetail, ClubSpecialHours } from "@/types/club";
import { validateSpecialHours } from "../WorkingHoursEditor.client";
import "./ClubSpecialDatesView.css";

interface ClubSpecialDatesViewProps {
  club: ClubDetail;
  onRefresh?: () => Promise<void>;
  disabled?: boolean;
  disabledTooltip?: string;
}

function formatTime(time: string | null, t: (key: string) => string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? t("pm") : t("am");
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
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

function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

export function ClubSpecialDatesView({ club, onRefresh, disabled = false, disabledTooltip }: ClubSpecialDatesViewProps) {
  const t = useTranslations("clubDetail");
  const tCommon = useTranslations("common");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [specialHours, setSpecialHours] = useState<SpecialHour[]>(() =>
    formatSpecialHours(club.specialHours)
  );

  const handleEdit = useCallback(() => {
    setSpecialHours(formatSpecialHours(club.specialHours));
    setError("");
    setIsEditing(true);
  }, [club]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setError("");
  }, []);

  const handleSave = useCallback(async () => {
    // Validate special hours
    const validationError = validateSpecialHours(specialHours, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const [specialHoursResponse] = await Promise.all([
        fetch(`/api/admin/clubs/${club.id}/special-hours`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            specialHours,
          }),
        }),
      ]);

      if (!specialHoursResponse.ok) {
        const data = await specialHoursResponse.json();
        throw new Error(data.error || t("failedToUpdateSpecialHours"));
      }

      // Refresh club data to reflect changes
      if (onRefresh) {
        await onRefresh();
      }

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToSaveChanges"));
    } finally {
      setIsSaving(false);
    }
  }, [specialHours, club.id, onRefresh, t]);

  return (
    <>
      <div className="im-section-view-header">
        <h2 className="im-club-view-section-title">{t("specialDates")}</h2>
        <Tooltip
          content={disabled ? disabledTooltip : undefined}
          position="bottom"
        >
          <Button
            variant="outline"
            onClick={handleEdit}
            disabled={disabled}
          >
            {tCommon("edit")}
          </Button>
        </Tooltip>
      </div>

      <div className="im-section-view">
        {club.specialHours.length > 0 ? (
          <div className="im-special-dates-list">
            {club.specialHours.map((hour) => (
              <div key={hour.id} className="im-special-dates-row">
                <span className="im-special-dates-date">
                  {formatDateShort(hour.date)}
                </span>
                <span className="im-special-dates-separator">—</span>
                <span className="im-special-dates-status">
                  {hour.isClosed
                    ? t("closed")
                    : `${formatTime(hour.openTime, t)} - ${formatTime(hour.closeTime, t)}`}
                </span>
                {hour.reason && (
                  <span className="im-special-dates-reason">
                    ({hour.reason})
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="im-section-view-value--empty">{t("noSpecialDates")}</p>
        )}
      </div>

      <SectionEditModal
        isOpen={isEditing}
        onClose={handleClose}
        title={t("specialDatesEdit")}
        onSave={handleSave}
        isSaving={isSaving}
      >
        {error && <div className="im-section-edit-modal-error">{error}</div>}

        <SpecialHoursField
          value={specialHours}
          onChange={setSpecialHours}
          disabled={isSaving}
        />
      </SectionEditModal>
    </>
  );
}
