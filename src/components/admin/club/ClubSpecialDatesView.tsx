"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button, Tooltip } from "@/components/ui";
import { SectionEditModal } from "./SectionEditModal";
import { SpecialHoursField, type SpecialHour } from "../SpecialHoursField.client";
import { useClubSpecialDatesStore } from "@/stores/useClubSpecialDatesStore";
import type { ClubDetail } from "@/types/club";
import { validateSpecialHours } from "../WorkingHoursEditor.client";
import "./ClubSpecialDatesView.css";

interface ClubSpecialDatesViewProps {
  club: ClubDetail;
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

function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

export function ClubSpecialDatesView({ club, disabled = false, disabledTooltip }: ClubSpecialDatesViewProps) {
  const t = useTranslations("clubDetail");
  const tCommon = useTranslations("common");

  // Use the dedicated special dates store
  const specialDatesFromStore = useClubSpecialDatesStore((state) => state.specialDates);
  const fetchSpecialDates = useClubSpecialDatesStore((state) => state.fetchSpecialDates);
  const addSpecialDate = useClubSpecialDatesStore((state) => state.addSpecialDate);
  const updateSpecialDate = useClubSpecialDatesStore((state) => state.updateSpecialDate);
  const removeSpecialDate = useClubSpecialDatesStore((state) => state.removeSpecialDate);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [specialHours, setSpecialHours] = useState<SpecialHour[]>([]);

  // Fetch special dates on mount
  // Note: fetchSpecialDates is a Zustand store action and is stable across renders
  useEffect(() => {
    fetchSpecialDates(club.id).catch(() => {
      // Error is already set in the store
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club.id]);

  // Convert store special dates to SpecialHour format for editing
  const formatSpecialHours = useCallback((): SpecialHour[] => {
    return specialDatesFromStore.map((h) => ({
      id: h.id,
      date: h.date.split("T")[0],
      openTime: h.openTime,
      closeTime: h.closeTime,
      isClosed: h.isClosed,
      reason: h.reason || "",
    }));
  }, [specialDatesFromStore]);

  const handleEdit = useCallback(() => {
    setSpecialHours(formatSpecialHours());
    setError("");
    setIsEditing(true);
  }, [formatSpecialHours]);

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
      // Process each special hour based on its action
      const promises = specialHours.map(async (hour) => {
        if (hour._action === 'delete' && hour.id) {
          // Delete existing special date
          await removeSpecialDate(club.id, hour.id);
          return { type: 'delete', id: hour.id, success: true };
        } else if (hour._action === 'create' || !hour.id) {
          // Create new special date
          await addSpecialDate(club.id, {
            date: hour.date,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
            reason: hour.reason,
          });
          return { type: 'create', success: true };
        } else if (hour._action === 'update' && hour.id) {
          // Update existing special date
          await updateSpecialDate(club.id, hour.id, {
            date: hour.date,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
            reason: hour.reason,
          });
          return { type: 'update', id: hour.id, success: true };
        }
        // If no action, it's an unchanged existing item - do nothing
        return { type: 'skip', success: true };
      });

      // Wait for all operations to complete, collecting both successes and failures
      const results = await Promise.allSettled(promises);

      // Check if any operations failed
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        const firstError = (failures[0] as PromiseRejectedResult).reason;
        throw firstError instanceof Error ? firstError : new Error(t("failedToSaveChanges"));
      }

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToSaveChanges"));
    } finally {
      setIsSaving(false);
    }
  }, [specialHours, club.id, t, addSpecialDate, updateSpecialDate, removeSpecialDate]);

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
        {specialDatesFromStore.length > 0 ? (
          <div className="im-special-dates-list">
            {specialDatesFromStore.map((hour) => (
              <div key={hour.id} className="im-special-dates-row">
                <span className="im-special-dates-date">
                  {formatDateShort(hour.date)}
                </span>

                <div className="flex gap-2 items-center">
                  {hour.reason && (
                    <span className="im-special-dates-reason">
                      ({hour.reason})
                    </span>
                  )}
                  <span className="im-special-dates-status">
                    {hour.isClosed
                      ? t("closed")
                      : `${formatTime(hour.openTime, t)} - ${formatTime(hour.closeTime, t)} ${t("opened")}`}
                  </span>
                </div>
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
