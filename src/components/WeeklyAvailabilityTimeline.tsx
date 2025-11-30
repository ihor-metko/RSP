"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui";
import type {
  WeeklyAvailabilityResponse,
  HourSlotAvailability,
  CourtAvailabilityStatus,
} from "@/types/court";
import "./WeeklyAvailabilityTimeline.css";

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

// Format date for display
function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

// Format hour for display
function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

// Tooltip component
interface TooltipProps {
  slot: HourSlotAvailability;
  dayName: string;
  position: { x: number; y: number };
}

function Tooltip({ slot, dayName, position }: TooltipProps) {
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
        {dayName} {formatHour(slot.hour)}
      </div>
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
      </div>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="tm-weekly-skeleton" aria-label="Loading availability">
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
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="tm-weekly-error" role="alert">
      <div className="tm-weekly-error-icon">⚠️</div>
      <div className="tm-weekly-error-title">Unable to load availability</div>
      <div className="tm-weekly-error-message">{message}</div>
      <button className="tm-weekly-error-retry" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function WeeklyAvailabilityTimeline({
  clubId,
  onSlotClick,
}: WeeklyAvailabilityTimelineProps) {
  const [weekStart, setWeekStart] = useState<Date>(getCurrentWeekMonday);
  const [data, setData] = useState<WeeklyAvailabilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    slot: HourSlotAvailability;
    dayName: string;
    position: { x: number; y: number };
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    courts: CourtAvailabilityStatus[]
  ) => {
    if (onSlotClick) {
      onSlotClick(date, hour, courts);
    }
  };

  const handleBlockHover = (
    event: React.MouseEvent,
    slot: HourSlotAvailability,
    dayName: string
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
      });
    }
  };

  const handleBlockLeave = () => {
    setTooltip(null);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchAvailability} />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="tm-weekly-timeline" ref={containerRef}>
      <div className="tm-weekly-timeline-container">
        <div className="tm-weekly-timeline-header">
          <h3 className="tm-weekly-timeline-title">Weekly Court Availability</h3>
          <div className="tm-weekly-timeline-week-nav">
            <Button
              variant="outline"
              className="tm-weekly-timeline-nav-btn"
              onClick={handlePrevWeek}
              aria-label="Previous week"
            >
              ←
            </Button>
            <span className="tm-weekly-timeline-week-label">
              {formatWeekRange(data.weekStart, data.weekEnd)}
            </span>
            <Button
              variant="outline"
              className="tm-weekly-timeline-nav-btn"
              onClick={handleNextWeek}
              aria-label="Next week"
            >
              →
            </Button>
          </div>
        </div>

        <div className="tm-weekly-grid" role="grid" aria-label="Weekly court availability">
          {/* Header row */}
          <div className="tm-weekly-grid-header" role="row">
            <div className="tm-weekly-grid-corner" role="columnheader">
              Day / Hour
            </div>
            {HOURS.map((hour) => (
              <div
                key={`header-${hour}`}
                className="tm-weekly-grid-hour-header"
                role="columnheader"
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {data.days.map((day) => (
            <div key={day.date} className="tm-weekly-grid-row" role="row">
              <div className="tm-weekly-grid-day-label" role="rowheader">
                <span>{day.dayName.slice(0, 3)}</span>
                <span className="ml-1 opacity-60 text-[10px]">
                  {new Date(day.date).getDate()}
                </span>
              </div>
              {day.hours.map((slot) => (
                <div
                  key={`${day.date}-${slot.hour}`}
                  className={`tm-availability-block tm-availability-block--${slot.overallStatus}`}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${day.dayName} ${formatHour(slot.hour)}: ${slot.summary.available} available, ${slot.summary.partial} partially booked, ${slot.summary.booked} booked`}
                  onClick={() =>
                    handleBlockClick(day.date, slot.hour, slot.courts)
                  }
                  onMouseEnter={(e) => handleBlockHover(e, slot, day.dayName)}
                  onMouseLeave={handleBlockLeave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleBlockClick(day.date, slot.hour, slot.courts);
                    }
                  }}
                >
                  {slot.summary.available}/{slot.summary.total}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="tm-weekly-legend">
          <div className="tm-legend-item">
            <span className="tm-legend-dot tm-legend-dot--available" />
            <span>Available</span>
          </div>
          <div className="tm-legend-item">
            <span className="tm-legend-dot tm-legend-dot--partial" />
            <span>Partially occupied</span>
          </div>
          <div className="tm-legend-item">
            <span className="tm-legend-dot tm-legend-dot--booked" />
            <span>Fully booked</span>
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <Tooltip
            slot={tooltip.slot}
            dayName={tooltip.dayName}
            position={tooltip.position}
          />
        )}
      </div>
    </div>
  );
}
