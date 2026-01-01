"use client";

import { useState, useRef, useEffect, useId, useCallback } from "react";
import { Portal } from "./Portal";
import { useDropdownPosition } from "@/hooks/useDropdownPosition";
import "./TimeInput.css";

// Constants
const DEFAULT_HOURS = "09";
const DEFAULT_MINUTES = "00";
const COMPLETE_TIME_FORMAT_LENGTH = 5; // HH:MM
const DROPDOWN_CLOSE_DEBOUNCE_MS = 100;

interface TimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /** Label for the input */
  label?: string;
  /** ARIA label */
  "aria-label"?: string;
  /** Current time value in HH:MM format */
  value?: string;
  /** Change handler */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Custom time input component following platform design patterns.
 * 
 * Provides a consistent, themed time picker that matches the existing
 * platform styles with im-* classes and dark theme support.
 * Does not use native browser time pickers for consistent cross-browser UI.
 * 
 * Features:
 * - Custom dropdown with hour (00-23) and minute (00-59) selection
 * - Keyboard input with auto-formatting (type time in HH:MM format)
 * - Up/Down arrow keys to increment/decrement hours or minutes based on cursor position
 * - Full dark theme support using im-* CSS variables
 * - Accessible with proper ARIA attributes
 * - Portal-based dropdown positioning
 * 
 * Keyboard Accessibility:
 * - Tab to focus the input
 * - Type time directly in HH:MM format
 * - Up/Down arrows increment/decrement hours (when cursor in hours section) or minutes (when cursor in minutes section)
 * - Escape key closes the dropdown
 * - Focus/click input to open dropdown
 * - Tab through dropdown buttons
 * - Dropdown applies time only when Confirm is clicked or when clicking outside
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
export function TimeInput({ 
  label, 
  className = "", 
  id, 
  "aria-label": ariaLabel,
  value = "",
  onChange,
  disabled = false,
  ...props 
}: TimeInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [pendingHours, setPendingHours] = useState<string | null>(null);
  const [pendingMinutes, setPendingMinutes] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const justClosedRef = useRef(false);

  // Calculate dropdown position
  const dropdownPosition = useDropdownPosition({
    triggerRef: inputContainerRef,
    isOpen,
    offset: 8,
    maxHeight: 300,
    matchWidth: false,
  });

  // Sync internal state with external value
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Parse time value to hours and minutes
  const parseTime = (timeStr: string): { hours: string; minutes: string } => {
    if (!timeStr || !timeStr.includes(":")) {
      return { hours: DEFAULT_HOURS, minutes: DEFAULT_MINUTES };
    }
    const [hours, minutes] = timeStr.split(":");
    return {
      hours: hours.padStart(2, "0"),
      minutes: minutes.padStart(2, "0"),
    };
  };

  const { hours: currentHours, minutes: currentMinutes } = parseTime(inputValue);

  // Validate and format time input
  const validateAndFormatTime = (input: string): string | null => {
    // Allow empty input
    if (!input) return "";

    // Remove any non-digit and non-colon characters
    const cleaned = input.replace(/[^\d:]/g, "");

    // Try to parse the input
    const parts = cleaned.split(":");
    
    if (parts.length === 0) return null;
    
    let hours = parts[0] || "00";
    let minutes = parts[1] || "00";

    // Pad hours
    if (hours.length === 1) hours = "0" + hours;
    if (hours.length > 2) hours = hours.slice(0, 2);
    
    // Pad minutes
    if (minutes.length === 1) minutes = "0" + minutes;
    if (minutes.length > 2) minutes = minutes.slice(0, 2);

    // Validate ranges
    const hoursNum = parseInt(hours, 10);
    const minutesNum = parseInt(minutes, 10);

    if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 23) return null;
    if (isNaN(minutesNum) || minutesNum < 0 || minutesNum > 59) return null;

    return `${hours}:${minutes}`;
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Validate on blur or when complete
    if (newValue.length >= COMPLETE_TIME_FORMAT_LENGTH) {
      const formatted = validateAndFormatTime(newValue);
      if (formatted !== null) {
        setInputValue(formatted);
        onChange?.({ ...e, target: { ...e.target, value: formatted } });
      }
    }
  };

  // Handle input blur
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (containerRef.current && relatedTarget && containerRef.current.contains(relatedTarget)) {
      return;
    }
    
    // Format the value on blur
    const formatted = validateAndFormatTime(inputValue);
    if (formatted !== null) {
      setInputValue(formatted);
      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: formatted, name: e.target.name }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(syntheticEvent);
    }
    
    setIsOpen(false);
  };

  // Handle keyboard navigation (Up/Down arrows)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") {
      return;
    }

    e.preventDefault();
    
    const input = e.currentTarget;
    const cursorPosition = input.selectionStart || 0;
    const timeValue = inputValue || `${DEFAULT_HOURS}:${DEFAULT_MINUTES}`;
    const { hours, minutes } = parseTime(timeValue);
    
    // Determine if cursor is in hours or minutes section
    // Position 0-1: hours, Position 2: colon, Position 3-4: minutes
    const isInHoursSection = cursorPosition < 3;
    const increment = e.key === "ArrowUp" ? 1 : -1;
    
    let newHours = parseInt(hours, 10);
    let newMinutes = parseInt(minutes, 10);
    
    if (isInHoursSection) {
      // Increment/decrement hours
      newHours = (newHours + increment + 24) % 24;
    } else {
      // Increment/decrement minutes
      newMinutes = (newMinutes + increment + 60) % 60;
    }
    
    const newValue = `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`;
    setInputValue(newValue);
    
    const syntheticEvent = {
      target: { value: newValue, name: input.name || "" },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange?.(syntheticEvent);
  };

  // Handle dropdown selection
  const handleTimeSelect = useCallback((hours: string, minutes: string) => {
    const newValue = `${hours}:${minutes}`;
    setInputValue(newValue);
    
    // Create synthetic event
    const syntheticEvent = {
      target: { value: newValue, name: inputRef.current?.name || "" },
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange?.(syntheticEvent);
    
    justClosedRef.current = true;
    setIsOpen(false);
    setTimeout(() => {
      justClosedRef.current = false;
    }, DROPDOWN_CLOSE_DEBOUNCE_MS);
    inputRef.current?.focus();
  }, [onChange]);

  // Handle input focus
  const handleInputFocus = () => {
    if (justClosedRef.current || disabled) return;
    const { hours, minutes } = parseTime(inputValue);
    setPendingHours(hours);
    setPendingMinutes(minutes);
    setIsOpen(true);
  };

  // Handle icon click
  const handleIconClick = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      
      if (isOutsideContainer && isOutsideDropdown) {
        // Apply pending selection when clicking outside
        if (pendingHours !== null && pendingMinutes !== null) {
          handleTimeSelect(pendingHours, pendingMinutes);
        } else {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, pendingHours, pendingMinutes, handleTimeSelect]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        setPendingHours(null);
        setPendingMinutes(null);
        inputRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  return (
    <div className={`im-time-input-wrapper ${className}`.trim()} ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="im-time-input-label"
        >
          {label}
        </label>
      )}
      <div ref={inputContainerRef} className="im-time-input-container">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="im-time-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder="HH:MM"
          disabled={disabled}
          aria-label={ariaLabel || label}
          aria-haspopup="dialog"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${inputId}-timepicker` : undefined}
          {...props}
        />
        <button
          type="button"
          className="im-time-input-icon"
          onClick={handleIconClick}
          aria-label="Open time picker"
          tabIndex={-1}
          disabled={disabled}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </button>
      </div>
      
      {isOpen && dropdownPosition && (
        <Portal>
          <div
            ref={dropdownRef}
            id={`${inputId}-timepicker`}
            className="im-time-picker-dropdown"
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              zIndex: 9999,
            }}
          >
            <TimePickerDropdown
              selectedHours={pendingHours || currentHours}
              selectedMinutes={pendingMinutes || currentMinutes}
              onHourChange={setPendingHours}
              onMinuteChange={setPendingMinutes}
              onSelect={handleTimeSelect}
            />
          </div>
        </Portal>
      )}
    </div>
  );
}

interface TimePickerDropdownProps {
  selectedHours: string;
  selectedMinutes: string;
  onHourChange: (hour: string) => void;
  onMinuteChange: (minute: string) => void;
  onSelect: (hours: string, minutes: string) => void;
}

// Helper function to scroll selected option into view
function scrollToSelectedOption(ref: React.RefObject<HTMLDivElement>) {
  if (ref.current) {
    const selectedElement = ref.current.querySelector('.im-time-option-selected') as HTMLElement;
    if (selectedElement && typeof selectedElement.scrollIntoView === 'function') {
      selectedElement.scrollIntoView({ block: 'center' });
    }
  }
}

function TimePickerDropdown({ 
  selectedHours,
  selectedMinutes,
  onHourChange,
  onMinuteChange,
  onSelect 
}: TimePickerDropdownProps) {
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  // Generate hours and minutes options
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  // Scroll to selected values on mount
  useEffect(() => {
    scrollToSelectedOption(hoursRef);
    scrollToSelectedOption(minutesRef);
  }, []);

  const handleHourClick = (hour: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onHourChange(hour);
  };

  const handleMinuteClick = (minute: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMinuteChange(minute);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(selectedHours, selectedMinutes);
  };

  return (
    <div className="im-time-picker">
      <div className="im-time-picker-header">Select Time</div>
      <div className="im-time-picker-body">
        <div className="im-time-picker-column" ref={hoursRef}>
          <div className="im-time-picker-column-header">Hours</div>
          <div className="im-time-picker-options">
            {hours.map((hour) => (
              <button
                key={hour}
                type="button"
                className={`im-time-option ${selectedHours === hour ? 'im-time-option-selected' : ''}`}
                onClick={(e) => handleHourClick(hour, e)}
                onMouseDown={(e) => e.preventDefault()}
              >
                {hour}
              </button>
            ))}
          </div>
        </div>
        <div className="im-time-picker-separator">:</div>
        <div className="im-time-picker-column" ref={minutesRef}>
          <div className="im-time-picker-column-header">Minutes</div>
          <div className="im-time-picker-options">
            {minutes.map((minute) => (
              <button
                key={minute}
                type="button"
                className={`im-time-option ${selectedMinutes === minute ? 'im-time-option-selected' : ''}`}
                onClick={(e) => handleMinuteClick(minute, e)}
                onMouseDown={(e) => e.preventDefault()}
              >
                {minute}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="im-time-picker-footer">
        <button
          type="button"
          className="im-time-picker-confirm"
          onClick={(e) => handleConfirm(e)}
          onMouseDown={(e) => e.preventDefault()}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
