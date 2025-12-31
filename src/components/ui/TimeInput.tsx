"use client";

import { forwardRef, useId } from "react";
import "./TimeInput.css";

interface TimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Label for the input */
  label?: string;
  /** ARIA label */
  "aria-label"?: string;
}

/**
 * Custom time input component following platform design patterns.
 * 
 * Provides a consistent, themed time picker that matches the existing
 * platform styles with im-* classes and dark theme support.
 * 
 * @example
 * ```tsx
 * <TimeInput
 *   value={openTime}
 *   onChange={(e) => setOpenTime(e.target.value)}
 *   label="Opening Time"
 * />
 * ```
 */
export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  function TimeInput({ label, className = "", id, "aria-label": ariaLabel, ...props }, ref) {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className={`im-time-input-wrapper ${className}`.trim()}>
        {label && (
          <label
            htmlFor={inputId}
            className="im-time-input-label"
          >
            {label}
          </label>
        )}
        <div className="im-time-input-container">
          <input
            ref={ref}
            id={inputId}
            type="time"
            className="im-time-input"
            aria-label={ariaLabel || label}
            {...props}
          />
          <span className="im-time-input-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </span>
        </div>
      </div>
    );
  }
);
