"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Modal, Button } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import type { AvailabilitySlot } from "@/types/court";
import "./CourtScheduleModal.css";

interface DaySchedule {
  date: string;
  dayName: string;
  slots: AvailabilitySlot[];
}

interface CourtScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  courtId: string;
  courtName: string;
  onBook?: (courtId: string, slot: AvailabilitySlot) => void;
}

// Format hour for display
function formatHour(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

// Get day name from date
function getDayName(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Get status class for slot
function getStatusClass(status: AvailabilitySlot["status"]): string {
  switch (status) {
    case "available":
      return "im-schedule-slot--available";
    case "booked":
      return "im-schedule-slot--booked";
    case "partial":
      return "im-schedule-slot--partial";
    case "pending":
      return "im-schedule-slot--pending";
    default:
      return "";
  }
}

export function CourtScheduleModal({
  isOpen,
  onClose,
  courtId,
  courtName,
  onBook,
}: CourtScheduleModalProps) {
  const t = useTranslations();
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // Fetch weekly schedule
  const fetchSchedule = useCallback(async () => {
    if (!isOpen || !courtId) return;

    setIsLoading(true);
    setError(null);

    try {
      const days: DaySchedule[] = [];
      const today = new Date();
      
      // Fetch 7 days of availability
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        
        const response = await fetch(`/api/courts/${courtId}/availability?date=${dateStr}`);
        if (response.ok) {
          const data = await response.json();
          days.push({
            date: dateStr,
            dayName: getDayName(dateStr),
            slots: data.slots || [],
          });
        } else {
          days.push({
            date: dateStr,
            dayName: getDayName(dateStr),
            slots: [],
          });
        }
      }
      
      setWeeklySchedule(days);
    } catch (err) {
      console.error("Failed to fetch schedule:", err);
      setError(t("clubs.failedToLoadClub"));
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, courtId, t]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Get slots for selected day
  const selectedDaySchedule = useMemo(() => {
    return weeklySchedule[selectedDay] || { date: "", dayName: "", slots: [] };
  }, [weeklySchedule, selectedDay]);

  // Calculate availability summary for each day
  const daySummaries = useMemo(() => {
    return weeklySchedule.map(day => {
      const available = day.slots.filter(s => s.status === "available").length;
      const total = day.slots.length;
      return { available, total };
    });
  }, [weeklySchedule]);

  const handleSlotClick = (slot: AvailabilitySlot) => {
    if (slot.status === "available" && onBook) {
      onBook(courtId, slot);
    }
  };

  const renderLoadingSkeleton = () => (
    <div className="im-schedule-loading">
      <div className="im-schedule-loading-spinner" />
      <p>{t("common.loading")}</p>
    </div>
  );

  const renderError = () => (
    <div className="im-schedule-error">
      <p>{error}</p>
      <Button onClick={fetchSchedule} variant="outline">
        {t("weeklyAvailability.tryAgain")}
      </Button>
    </div>
  );

  const renderDayTabs = () => (
    <div className="im-schedule-day-tabs" role="tablist">
      {weeklySchedule.map((day, index) => {
        const summary = daySummaries[index];
        const isToday = index === 0;
        const isTomorrow = index === 1;
        
        return (
          <button
            key={day.date}
            type="button"
            role="tab"
            aria-selected={selectedDay === index}
            className={`im-schedule-day-tab ${selectedDay === index ? "im-schedule-day-tab--active" : ""}`}
            onClick={() => setSelectedDay(index)}
          >
            <span className="im-schedule-day-label">
              {isToday ? t("weeklyAvailability.todayLabel") : isTomorrow ? t("weeklyAvailability.tomorrowLabel") : day.dayName.slice(0, 3)}
            </span>
            <span className="im-schedule-day-date">{formatDate(day.date)}</span>
            {summary.total > 0 && (
              <span className={`im-schedule-day-availability ${
                summary.available === 0 ? "im-schedule-day-availability--none" : 
                summary.available < summary.total / 2 ? "im-schedule-day-availability--limited" : ""
              }`}>
                {summary.available}/{summary.total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderSlots = () => {
    const { slots } = selectedDaySchedule;
    
    if (slots.length === 0) {
      return (
        <div className="im-schedule-empty">
          <p>{t("court.noAvailabilityData")}</p>
        </div>
      );
    }

    return (
      <div className="im-schedule-slots-grid">
        {slots.map((slot) => (
          <button
            key={slot.start}
            type="button"
            className={`im-schedule-slot ${getStatusClass(slot.status)}`}
            onClick={() => handleSlotClick(slot)}
            disabled={slot.status !== "available"}
            aria-label={`${formatHour(slot.start)} - ${slot.status}${slot.priceCents ? `, ${formatPrice(slot.priceCents)}` : ""}`}
          >
            <span className="im-schedule-slot-time">{formatHour(slot.start)}</span>
            {slot.priceCents !== undefined && (
              <span className="im-schedule-slot-price">{formatPrice(slot.priceCents)}</span>
            )}
          </button>
        ))}
      </div>
    );
  };

  const renderLegend = () => (
    <div className="im-schedule-legend">
      <span className="im-schedule-legend-item">
        <span className="im-schedule-legend-dot im-schedule-legend-dot--available" />
        {t("common.available")}
      </span>
      <span className="im-schedule-legend-item">
        <span className="im-schedule-legend-dot im-schedule-legend-dot--partial" />
        {t("clubDetail.limited")}
      </span>
      <span className="im-schedule-legend-item">
        <span className="im-schedule-legend-dot im-schedule-legend-dot--booked" />
        {t("common.booked")}
      </span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("booking.courtScheduleTitle", { courtName })}
    >
      <div className="im-schedule-modal">
        {isLoading ? (
          renderLoadingSkeleton()
        ) : error ? (
          renderError()
        ) : (
          <>
            {renderDayTabs()}
            <div className="im-schedule-content">
              {renderSlots()}
            </div>
            {renderLegend()}
          </>
        )}
      </div>
    </Modal>
  );
}
