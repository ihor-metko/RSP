"use client";

import { useState, useRef, useEffect } from "react";
import { CustomCalendar } from "./CustomCalendar";
import "./DateInput.css";

interface DateInputProps {
  /** Current date value (ISO format YYYY-MM-DD) */
  value?: string;
  /** Callback when date changes */
  onChange: (date: string) => void;
  /** Label for the input */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum selectable date */
  minDate?: string;
  /** Maximum selectable date */
  maxDate?: string;
  /** Range start date (for visual range highlighting) */
  rangeStart?: string;
  /** Range end date (for visual range highlighting) */
  rangeEnd?: string;
  /** Whether this is the start of a range selection */
  isRangeStart?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** ARIA label */
  "aria-label"?: string;
}

/**
 * Date input with custom calendar popup.
 * 
 * Combines a text input displaying the selected date with a popup calendar
 * for visual date selection. Supports dark theme with im-* classes.
 * 
 * @example
 * ```tsx
 * <DateInput
 *   value={startDate}
 *   onChange={(date) => setStartDate(date)}
 *   label="Start Date"
 *   placeholder="Select start date"
 * />
 * ```
 */
export function DateInput({
  value = "",
  onChange,
  label,
  placeholder = "Select date",
  minDate,
  maxDate,
  rangeStart,
  rangeEnd,
  isRangeStart = false,
  className = "",
  "aria-label": ariaLabel,
}: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format date for display (e.g., "Jan 15, 2024")
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Handle calendar selection
  const handleCalendarChange = (date: string) => {
    onChange(date);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
  };

  // Handle input blur - check if focus moved outside the component
  const handleInputBlur = (e: React.FocusEvent) => {
    // Check if the related target (where focus is moving to) is within our container
    const relatedTarget = e.relatedTarget as Node | null;
    if (containerRef.current && relatedTarget && containerRef.current.contains(relatedTarget)) {
      // Focus is moving to an element inside our component, don't close
      return;
    }
    // Focus is moving outside, close the calendar
    setIsOpen(false);
  };

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        inputRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const inputId = label ? label.toLowerCase().replace(/\s+/g, "-") : undefined;
  const displayValue = formatDisplayDate(value);

  return (
    <div className={`im-date-input-wrapper ${className}`.trim()} ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="im-date-input-label"
        >
          {label}
        </label>
      )}
      <div className="im-date-input-container">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="im-date-input"
          value={displayValue}
          placeholder={placeholder}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          readOnly
          aria-label={ariaLabel || label}
          aria-haspopup="dialog"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${inputId}-calendar` : undefined}
        />
        <button
          type="button"
          className="im-date-input-icon"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open calendar"
          tabIndex={0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
        
        {isOpen && (
          <div className="im-date-input-popup" id={`${inputId}-calendar`}>
            <CustomCalendar
              value={value}
              onChange={handleCalendarChange}
              minDate={minDate}
              maxDate={maxDate}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              isRangeStart={isRangeStart}
              ariaLabel={ariaLabel || label || "Calendar"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
