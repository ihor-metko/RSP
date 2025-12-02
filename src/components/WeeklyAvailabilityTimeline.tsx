"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui";
import { isSlotBlocked } from "@/utils/slotBlocking";
import type {
  WeeklyAvailabilityResponse,
  HourSlotAvailability,
  CourtAvailabilityStatus,
} from "@/types/court";
import "./WeeklyAvailabilityTimeline.css";

/**
 * WeeklyAvailabilityTimeline - Weekly court availability matrix/timetable
 * 
 * BLOCKING RULES (client-side):
 * - Past days: Any day before the current local date is blocked
 * - Today: Slots with slotStartHour < currentLocalHour are blocked
 * - Ongoing slots: If slotStartHour === currentLocalHour, the slot is ALLOWED (not blocked)
 *   This allows users to book slots that are currently in progress (e.g., 20:00 slot at 20:05)
 * 
 * NOTE: These rules are UI-only. Server-side booking endpoints MUST enforce the same
 * blocking logic independently. Do not rely on client-side blocking alone.
 * 
 * TODO: Backend developers - ensure booking API validates same blocking rules server-side
 */

interface WeeklyAvailabilityTimelineProps {
  clubId: string;
  onSlotClick?: (
    date: string,
    hour: number,
    courts: CourtAvailabilityStatus[]
  ) => void;
}

// Business hours configuration
const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 22;

// Days of the week indices
const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const;

// Generate hours array for header
function generateHours(): number[] {
  const hours: number[] = [];
  for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) {
    hours.push(h);
  }
  return hours;
}

const HOURS = generateHours();

// Get current week's Monday date
function getCurrentWeekMonday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Format date for display using locale
function formatWeekRange(weekStart: string, weekEnd: string, locale: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const dateFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const yearFormat = new Intl.DateTimeFormat(locale, { year: "numeric" });
  
  const startFormatted = dateFormat.format(start);
  const endFormatted = dateFormat.format(end);
  const year = yearFormat.format(start);
  
  return `${startFormatted} - ${endFormatted}, ${year}`;
}

// Format hour for display using locale
function formatHour(hour: number, locale: string): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

/**
 * Parse a YYYY-MM-DD date string into year, month, day components
 * This avoids timezone issues by not using Date constructor with string
 */
function parseDateComponents(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month: month - 1, day }; // month is 0-indexed for Date constructor
}

// Get localized day name
function getLocalizedDayName(dateStr: string, locale: string, format: "short" | "long" = "short"): string {
  const { year, month, day } = parseDateComponents(dateStr);
  const date = new Date(year, month, day);
  return new Intl.DateTimeFormat(locale, { weekday: format }).format(date);
}

// Tooltip component
interface TooltipProps {
  slot: HourSlotAvailability;
  dayName: string;
  position: { x: number; y: number };
  locale: string;
  isBlocked?: boolean;
  blockReason?: string;
}

function Tooltip({ slot, dayName, position, locale, isBlocked, blockReason }: TooltipProps) {
  return (
    <div
      className="tm-availability-tooltip"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="tm-tooltip-title">
        {dayName} {formatHour(slot.hour, locale)}
      </div>
      {isBlocked ? (
        <div className="tm-tooltip-blocked">{blockReason}</div>
      ) : (
        <div className="tm-tooltip-summary">
          <span className="tm-tooltip-stat">
            <span className="tm-tooltip-dot tm-tooltip-dot--available" />
            {slot.summary.available}
          </span>
          <span className="tm-tooltip-stat">
            <span className="tm-tooltip-dot tm-tooltip-dot--partial" />
            {slot.summary.partial}
          </span>
          <span className="tm-tooltip-stat">
            <span className="tm-tooltip-dot tm-tooltip-dot--booked" />
            {slot.summary.booked}
          </span>
          <span className="tm-tooltip-stat">
            <span className="tm-tooltip-dot tm-tooltip-dot--pending" />
            {slot.summary.pending}
          </span>
        </div>
      )}
    </div>
  );
}

// Loading skeleton
interface LoadingSkeletonProps {
  ariaLabel: string;
}

function LoadingSkeleton({ ariaLabel }: LoadingSkeletonProps) {
  return (
    <div className="tm-weekly-skeleton" aria-label={ariaLabel}>
      <div className="tm-weekly-skeleton-header" />
      <div className="tm-weekly-skeleton-grid">
        {/* Header row */}
        <div className="tm-weekly-skeleton-cell" />
        {HOURS.map((h) => (
          <div key={`header-${h}`} className="tm-weekly-skeleton-cell" />
        ))}
        {/* Day rows */}
        {DAYS_OF_WEEK.map((day) => (
          <>
            <div key={`day-${day}`} className="tm-weekly-skeleton-cell" />
            {HOURS.map((h) => (
              <div key={`${day}-${h}`} className="tm-weekly-skeleton-cell" />
            ))}
          </>
        ))}
      </div>
    </div>
  );
}

// Error state component
interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  errorTitle: string;
  retryLabel: string;
}

function ErrorState({ message, onRetry, errorTitle, retryLabel }: ErrorStateProps) {
  return (
    <div className="tm-weekly-error" role="alert">
      <div className="tm-weekly-error-icon">⚠️</div>
      <div className="tm-weekly-error-title">{errorTitle}</div>
      <div className="tm-weekly-error-message">{message}</div>
      <button className="tm-weekly-error-retry" onClick={onRetry}>
        {retryLabel}
      </button>
    </div>
  );
}

export function WeeklyAvailabilityTimeline({
  clubId,
  onSlotClick,
}: WeeklyAvailabilityTimelineProps) {
  const t = useTranslations("weeklyAvailability");
  const [weekStart, setWeekStart] = useState<Date>(getCurrentWeekMonday);
  const [data, setData] = useState<WeeklyAvailabilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    slot: HourSlotAvailability;
    dayName: string;
    position: { x: number; y: number };
    isBlocked?: boolean;
    blockReason?: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get locale from next-intl context for consistent i18n
  const locale = useLocale();
  
  // Compute current time once per render for consistent blocking checks
  const now = useMemo(() => new Date(), []);

  const fetchAvailability = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const response = await fetch(
        `/api/clubs/${clubId}/courts/availability?weekStart=${weekStartStr}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch availability");
      }

      const result: WeeklyAvailabilityResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [clubId, weekStart]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handlePrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const handleBlockClick = (
    date: string,
    hour: number,
    courts: CourtAvailabilityStatus[],
    blocked: boolean
  ) => {
    // Early return for blocked slots - do not call click handler
    if (blocked) {
      return;
    }
    if (onSlotClick) {
      onSlotClick(date, hour, courts);
    }
  };

  const handleBlockHover = (
    event: React.MouseEvent,
    slot: HourSlotAvailability,
    dayName: string,
    isBlocked: boolean,
    blockReason: string | undefined
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (containerRect) {
      setTooltip({
        slot,
        dayName,
        position: {
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top - containerRect.top - 8,
        },
        isBlocked,
        blockReason,
      });
    }
  };

  const handleBlockLeave = () => {
    setTooltip(null);
  };
  
  // Get block reason text based on reason code
  const getBlockReasonText = (reason: "past_day" | "past_hour" | null): string => {
    if (reason === "past_day") {
      return t("slotBlockedPastDay");
    }
    if (reason === "past_hour") {
      return t("slotBlockedPastHour");
    }
    return "";
  };

  if (isLoading) {
    return <LoadingSkeleton ariaLabel={t("loadingAvailability")} />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchAvailability}
        errorTitle={t("errorTitle")}
        retryLabel={t("tryAgain")}
      />
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="tm-weekly-timeline" ref={containerRef}>
      <div className="tm-weekly-timeline-container">
        <div className="tm-weekly-timeline-header">
          <h3 className="tm-weekly-timeline-title">{t("title")}</h3>
          <div className="tm-weekly-timeline-week-nav">
            <Button
              variant="outline"
              className="tm-weekly-timeline-nav-btn"
              onClick={handlePrevWeek}
              aria-label={t("previousWeek")}
            >
              ←
            </Button>
            <span className="tm-weekly-timeline-week-label">
              {formatWeekRange(data.weekStart, data.weekEnd, locale)}
            </span>
            <Button
              variant="outline"
              className="tm-weekly-timeline-nav-btn"
              onClick={handleNextWeek}
              aria-label={t("nextWeek")}
            >
              →
            </Button>
          </div>
        </div>

        <div className="tm-weekly-grid" role="grid" aria-label={t("ariaGridLabel")}>
          {/* Header row */}
          <div className="tm-weekly-grid-header" role="row">
            <div className="tm-weekly-grid-corner" role="columnheader">
              {t("dayHour")}
            </div>
            {HOURS.map((hour) => (
              <div
                key={`header-${hour}`}
                className="tm-weekly-grid-hour-header"
                role="columnheader"
              >
                {formatHour(hour, locale)}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {data.days.map((day) => {
            const localizedDayName = getLocalizedDayName(day.date, locale, "short");
            const { day: dayOfMonth } = parseDateComponents(day.date);
            
            return (
              <div key={day.date} className="tm-weekly-grid-row" role="row">
                <div className="tm-weekly-grid-day-label" role="rowheader">
                  <span>{localizedDayName}</span>
                  <span className="ml-1 opacity-60 text-[10px]">
                    {dayOfMonth}
                  </span>
                </div>
                {day.hours.map((slot) => {
                  const blockStatus = isSlotBlocked(day.date, slot.hour, now);
                  const { isBlocked, reason } = blockStatus;
                  const blockReasonText = getBlockReasonText(reason);
                  
                  // Determine CSS class - blocked slots get a special class
                  const slotClass = isBlocked 
                    ? "tm-availability-block tm-availability-block--blocked-past"
                    : `tm-availability-block tm-availability-block--${slot.overallStatus}`;
                  
                  // Build aria-label based on blocked state
                  const ariaLabel = isBlocked
                    ? t("ariaSlotBlockedLabel", { 
                        dayName: getLocalizedDayName(day.date, locale, "long"),
                        time: formatHour(slot.hour, locale),
                        reason: blockReasonText
                      })
                    : t("ariaSlotLabel", {
                        dayName: getLocalizedDayName(day.date, locale, "long"),
                        time: formatHour(slot.hour, locale),
                        available: slot.summary.available,
                        partial: slot.summary.partial,
                        booked: slot.summary.booked,
                        pending: slot.summary.pending
                      });
                  
                  return (
                    <div
                      key={`${day.date}-${slot.hour}`}
                      className={slotClass}
                      role="gridcell"
                      tabIndex={isBlocked ? -1 : 0}
                      aria-disabled={isBlocked}
                      aria-label={ariaLabel}
                      title={isBlocked ? blockReasonText : undefined}
                      onClick={() =>
                        handleBlockClick(day.date, slot.hour, slot.courts, isBlocked)
                      }
                      onMouseEnter={(e) => handleBlockHover(e, slot, localizedDayName, isBlocked, blockReasonText)}
                      onMouseLeave={handleBlockLeave}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleBlockClick(day.date, slot.hour, slot.courts, isBlocked);
                        }
                      }}
                    >
                      {isBlocked ? "—" : `${slot.summary.available}/${slot.summary.total}`}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="tm-weekly-legend">
          <div className="tm-legend-item">
            <span className="tm-legend-dot tm-legend-dot--available" />
            <span>{t("slotAvailable")}</span>
          </div>
          <div className="tm-legend-item">
            <span className="tm-legend-dot tm-legend-dot--partial" />
            <span>{t("slotPartial")}</span>
          </div>
          <div className="tm-legend-item">
            <span className="tm-legend-dot tm-legend-dot--booked" />
            <span>{t("slotBooked")}</span>
          </div>
          <div className="tm-legend-item">
            <span className="tm-legend-dot tm-legend-dot--pending" />
            <span>{t("slotPending")}</span>
          </div>
          <div className="tm-legend-item">
            <span className="tm-legend-dot tm-legend-dot--blocked-past" />
            <span>{t("slotBlockedPast")}</span>
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <Tooltip
            slot={tooltip.slot}
            dayName={tooltip.dayName}
            position={tooltip.position}
            locale={locale}
            isBlocked={tooltip.isBlocked}
            blockReason={tooltip.blockReason}
          />
        )}
      </div>
    </div>
  );
}
