"use client";

import { useState, useRef, useEffect, useCallback, ReactNode, useId } from "react";
import "./Select.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

interface SelectProps {
  id?: string;
  label?: string;
  className?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export function Select({
  id,
  label,
  className = "",
  options,
  placeholder = "Select...",
  value,
  onChange,
  disabled = false,
  required = false,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;
  const listboxId = `${selectId}-listbox`;

  const selectedOption = options.find((o) => o.value === value);

  const toggleOpen = useCallback(() => {
    if (!disabled) {
      setOpen((prev) => !prev);
      if (!open) {
        const selectedIdx = options.findIndex((o) => o.value === value);
        setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
      }
    }
  }, [disabled, open, options, value]);

  const handleSelect = useCallback((optionValue: string) => {
    if (disabled) return;

    onChange?.(optionValue);
    setOpen(false);
    setFocusedIndex(-1);
  }, [disabled, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (open && focusedIndex >= 0) {
          const option = options[focusedIndex];
          if (!option.disabled) {
            handleSelect(option.value);
          }
        } else {
          toggleOpen();
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          const selectedIdx = options.findIndex((o) => o.value === value);
          setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
        } else {
          setFocusedIndex((prev) => 
            prev < options.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setFocusedIndex(-1);
        break;
      case "Tab":
        setOpen(false);
        setFocusedIndex(-1);
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setFocusedIndex(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setFocusedIndex(options.length - 1);
        }
        break;
    }
  }, [disabled, open, focusedIndex, options, value, handleSelect, toggleOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Scroll focused option into view
  useEffect(() => {
    if (open && focusedIndex >= 0 && listboxRef.current) {
      const focusedElement = listboxRef.current.children[focusedIndex] as HTMLElement;
      focusedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex, open]);

  return (
    <div className={`im-select-wrapper ${className}`.trim()} ref={wrapperRef}>
      {label && (
        <label
          id={`${selectId}-label`}
          className="im-label mb-1 block text-sm font-medium"
        >
          {label}
        </label>
      )}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-labelledby={label ? `${selectId}-label` : undefined}
        aria-label={!label ? ariaLabel : undefined}
        aria-describedby={ariaDescribedBy}
        aria-disabled={disabled}
        aria-required={required}
        aria-activedescendant={open && focusedIndex >= 0 ? `${selectId}-option-${focusedIndex}` : undefined}
        tabIndex={disabled ? -1 : 0}
        className={`im-select-display ${disabled ? "im-disabled" : ""} ${open ? "im-open" : ""}`}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
      >
        <span className="im-select-value">
          {selectedOption?.icon && (
            <span className="im-select-icon" aria-hidden="true">
              {selectedOption.icon}
            </span>
          )}
          <span className="im-select-text">
            {selectedOption?.label || placeholder}
          </span>
        </span>
        <span className={`im-arrow ${open ? "im-open" : ""}`} aria-hidden="true" />
      </div>
      {open && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={label ? `${selectId}-label` : undefined}
          className="im-select-options"
        >
          {options.map((option, index) => {
            const isSelected = value === option.value;
            const isFocused = index === focusedIndex;
            
            return (
              <li
                key={option.value}
                id={`${selectId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                className={`im-select-option ${isSelected ? "im-selected" : ""} ${isFocused ? "im-focused" : ""} ${option.disabled ? "im-disabled" : ""}`}
                onClick={() => !option.disabled && handleSelect(option.value)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                {option.icon && (
                  <span className="im-select-option-icon" aria-hidden="true">
                    {option.icon}
                  </span>
                )}
                <span className="im-select-option-label">{option.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
