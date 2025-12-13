"use client";

import { useState, useEffect, useRef } from "react";
import "./CustomCalendar.css";

interface CustomCalendarProps {
  /** Currently selected date */
  value?: string;
  /** Callback when date is selected */
  onChange: (date: string) => void;
  /** Minimum selectable date (ISO format) */
  minDate?: string;
  /** Maximum selectable date (ISO format) */
  maxDate?: string;
  /** Highlighted range start date (for range selection) */
  rangeStart?: string;
  /** Highlighted range end date (for range selection) */
  rangeEnd?: string;
  /** Whether this is the start of a range selection */
  isRangeStart?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
}

/**
 * Custom calendar component with dark theme support and range selection.
 * 
 * Features:
 * - Dark theme compatible with im-* classes
 * - Date range highlighting
 * - Keyboard navigation (arrow keys, tab)
 * - Hover states for dates
 * - Disabled dates support
 * - Full accessibility with ARIA labels
 * 
 * @example
 * ```tsx
 * <CustomCalendar
 *   value={selectedDate}
 *   onChange={(date) => setSelectedDate(date)}
 *   rangeStart={startDate}
 *   rangeEnd={endDate}
 * />
 * ```
 */
export function CustomCalendar({
  value = "",
  onChange,
  minDate,
  maxDate,
  rangeStart,
  rangeEnd,
  isRangeStart = false,
  className = "",
  ariaLabel = "Select date",
}: CustomCalendarProps) {
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value);
    if (rangeStart) return new Date(rangeStart);
    return new Date();
  });
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // Apply different styling or behavior for range start vs end
  // Currently used for passing range context to calendar
  const isStartInput = isRangeStart;

  // Parse dates for comparison
  const selectedDate = value ? new Date(value) : null;
  const minDateObj = minDate ? new Date(minDate) : null;
  const maxDateObj = maxDate ? new Date(maxDate) : null;
  const rangeStartObj = rangeStart ? new Date(rangeStart) : null;
  const rangeEndObj = rangeEnd ? new Date(rangeEnd) : null;

  // Get first day of month
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const lastDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  
  // Get day of week for first day (0 = Sunday)
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  // Build calendar days
  const days: (Date | null)[] = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add all days of month
  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
  }

  // Check if date is disabled
  const isDateDisabled = (date: Date | null): boolean => {
    if (!date) return true;
    if (minDateObj && date < minDateObj) return true;
    if (maxDateObj && date > maxDateObj) return true;
    return false;
  };

  // Check if date is in range
  const isDateInRange = (date: Date | null): boolean => {
    if (!date || !rangeStartObj || !rangeEndObj) return false;
    const time = date.getTime();
    const start = rangeStartObj.getTime();
    const end = rangeEndObj.getTime();
    return time > Math.min(start, end) && time < Math.max(start, end);
  };

  // Check if date is range boundary
  const isRangeBoundary = (date: Date | null): boolean => {
    if (!date) return false;
    const dateStr = formatDateToISO(date);
    return dateStr === rangeStart || dateStr === rangeEnd;
  };

  // Check if date is selected
  const isDateSelected = (date: Date | null): boolean => {
    if (!date || !selectedDate) return false;
    return formatDateToISO(date) === formatDateToISO(selectedDate);
  };

  // Check if date is today
  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Format date to ISO string (YYYY-MM-DD)
  const formatDateToISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle date selection
  const handleDateClick = (date: Date | null) => {
    if (!date || isDateDisabled(date)) return;
    onChange(formatDateToISO(date));
  };

  // Handle month navigation
  const goToPreviousMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, date: Date | null) => {
    if (!date) return;

    let newDate: Date | null = null;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        newDate = new Date(date);
        newDate.setDate(newDate.getDate() - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        newDate = new Date(date);
        newDate.setDate(newDate.getDate() + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        newDate = new Date(date);
        newDate.setDate(newDate.getDate() - 7);
        break;
      case "ArrowDown":
        e.preventDefault();
        newDate = new Date(date);
        newDate.setDate(newDate.getDate() + 7);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        handleDateClick(date);
        return;
      default:
        return;
    }

    if (newDate) {
      // Update view if we moved to a different month
      if (newDate.getMonth() !== viewDate.getMonth()) {
        setViewDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
      }
      setFocusedDate(newDate);
    }
  };

  // Focus management
  useEffect(() => {
    if (focusedDate && calendarRef.current) {
      const dateStr = formatDateToISO(focusedDate);
      const button = calendarRef.current.querySelector<HTMLButtonElement>(
        `[data-date="${dateStr}"]`
      );
      button?.focus();
    }
  }, [focusedDate]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div 
      className={`im-calendar ${className}`.trim()}
      ref={calendarRef}
      role="application"
      aria-label={ariaLabel}
      data-range-position={isStartInput ? "start" : "end"}
    >
      {/* Calendar Header */}
      <div className="im-calendar-header">
        <button
          type="button"
          className="im-calendar-nav-button"
          onClick={goToPreviousMonth}
          aria-label="Previous month"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div className="im-calendar-month-year">
          {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
        </div>
        <button
          type="button"
          className="im-calendar-nav-button"
          onClick={goToNextMonth}
          aria-label="Next month"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      {/* Week Days */}
      <div className="im-calendar-weekdays">
        {weekDays.map((day) => (
          <div key={day} className="im-calendar-weekday" aria-label={day}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="im-calendar-days" role="grid">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="im-calendar-day-empty" />;
          }

          const disabled = isDateDisabled(date);
          const selected = isDateSelected(date);
          const inRange = isDateInRange(date);
          const boundary = isRangeBoundary(date);
          const today = isToday(date);

          const classNames = [
            "im-calendar-day",
            disabled && "im-calendar-day--disabled",
            selected && "im-calendar-day--selected",
            inRange && "im-calendar-day--in-range",
            boundary && "im-calendar-day--range-boundary",
            today && "im-calendar-day--today",
          ].filter(Boolean).join(" ");

          return (
            <button
              key={index}
              type="button"
              className={classNames}
              onClick={() => handleDateClick(date)}
              onKeyDown={(e) => handleKeyDown(e, date)}
              disabled={disabled}
              data-date={formatDateToISO(date)}
              aria-label={formatDateToISO(date)}
              aria-disabled={disabled}
              aria-current={selected ? "date" : undefined}
              tabIndex={
                selected ? 0 : 
                (!value && today) ? 0 : 
                (!value && !selectedDate && index === firstDayOfWeek) ? 0 : 
                -1
              }
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
