"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import "./Multiselect.css";

export interface MultiselectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MultiselectProps {
  label?: string;
  options: MultiselectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export function Multiselect({
  label,
  options,
  value,
  onChange,
  placeholder = "Select options...",
  disabled = false,
  className = "",
  id,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: MultiselectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const listboxId = `${selectId}-listbox`;

  const selectedLabels = options
    .filter((opt) => value.includes(opt.value))
    .map((opt) => opt.label);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setFocusedIndex(-1);
    }
  };

  const handleOptionToggle = useCallback((optionValue: string, optionDisabled?: boolean) => {
    if (disabled || optionDisabled) return;
    
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }, [disabled, value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          const option = options[focusedIndex];
          if (!option.disabled) {
            handleOptionToggle(option.value, option.disabled);
          }
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex((prev) => 
            prev < options.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case "Tab":
        setIsOpen(false);
        break;
      case "Home":
        if (isOpen) {
          e.preventDefault();
          setFocusedIndex(0);
        }
        break;
      case "End":
        if (isOpen) {
          e.preventDefault();
          setFocusedIndex(options.length - 1);
        }
        break;
    }
  }, [disabled, isOpen, focusedIndex, options, handleOptionToggle]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listboxRef.current) {
      const focusedElement = listboxRef.current.children[focusedIndex] as HTMLElement;
      focusedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex, isOpen]);

  return (
    <div className={`rsp-multiselect-wrapper ${className}`.trim()} ref={containerRef}>
      {label && (
        <label
          id={`${selectId}-label`}
          className="rsp-label mb-1 block text-sm font-medium"
        >
          {label}
        </label>
      )}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-labelledby={label ? `${selectId}-label` : undefined}
        aria-label={!label ? ariaLabel : undefined}
        aria-describedby={ariaDescribedBy}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={`rsp-multiselect-trigger ${disabled ? "rsp-multiselect-trigger--disabled" : ""} ${isOpen ? "rsp-multiselect-trigger--open" : ""}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <span className="rsp-multiselect-value">
          {selectedLabels.length > 0 ? selectedLabels.join(", ") : placeholder}
        </span>
        <span className="rsp-multiselect-arrow" aria-hidden="true">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.5 4.5L6 8L9.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {isOpen && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={label ? `${selectId}-label` : undefined}
          className="rsp-multiselect-dropdown"
        >
          {options.map((option, index) => {
            const isSelected = value.includes(option.value);
            const isFocused = index === focusedIndex;
            
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                tabIndex={-1}
                className={`rsp-multiselect-option ${isSelected ? "rsp-multiselect-option--selected" : ""} ${isFocused ? "rsp-multiselect-option--focused" : ""} ${option.disabled ? "rsp-multiselect-option--disabled" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionToggle(option.value, option.disabled);
                }}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <span className="rsp-multiselect-checkbox" aria-hidden="true">
                  {isSelected && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1.5 5L4 7.5L8.5 2.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="rsp-multiselect-option-label">{option.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
