"use client";

/**
 * RadioGroup - Reusable radio button group component with custom styling
 * Provides a fully accessible radio button group that works with dark theme
 * Uses custom radio controls instead of native inputs for better styling control
 */

import React, { useRef, KeyboardEvent, useCallback } from "react";
import "./RadioGroup.css";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /**
   * Label for the radio group
   */
  label?: string;
  
  /**
   * Available options
   */
  options: RadioOption[];
  
  /**
   * Currently selected value
   */
  value: string;
  
  /**
   * Change handler
   */
  onChange: (value: string) => void;
  
  /**
   * Name attribute for the radio inputs (for form grouping)
   */
  name: string;
  
  /**
   * Whether the entire group is disabled
   */
  disabled?: boolean;
  
  /**
   * Optional CSS class
   */
  className?: string;
}

export function RadioGroup({
  label,
  options,
  value,
  onChange,
  name,
  disabled = false,
  className = "",
}: RadioGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    // currentTarget is the element with the event handler (the radio option div)
    const currentValue = event.currentTarget.getAttribute('data-value');
    if (!currentValue) return;
    
    const currentIndex = options.findIndex(opt => opt.value === currentValue);
    if (currentIndex === -1) return;
    
    const enabledOptions = options.filter(opt => !opt.disabled && !disabled);
    const currentEnabledIndex = enabledOptions.findIndex(opt => opt.value === currentValue);
    
    let newIndex = -1;
    
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        if (currentEnabledIndex < enabledOptions.length - 1) {
          newIndex = options.findIndex(opt => opt.value === enabledOptions[currentEnabledIndex + 1].value);
        } else {
          // Wrap to first enabled option
          newIndex = options.findIndex(opt => opt.value === enabledOptions[0].value);
        }
        break;
      
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        if (currentEnabledIndex > 0) {
          newIndex = options.findIndex(opt => opt.value === enabledOptions[currentEnabledIndex - 1].value);
        } else {
          // Wrap to last enabled option
          newIndex = options.findIndex(opt => opt.value === enabledOptions[enabledOptions.length - 1].value);
        }
        break;
      
      case ' ':
      case 'Enter':
        event.preventDefault();
        // Only select if the focused option is the one being activated
        if (!disabled && !options[currentIndex].disabled) {
          onChange(options[currentIndex].value);
        }
        break;
    }
    
    if (newIndex !== -1) {
      const newOption = options[newIndex];
      onChange(newOption.value);
      
      // Focus the new option - escape the value for safe querySelector
      const escapedValue = CSS.escape(newOption.value);
      const optionElement = containerRef.current?.querySelector(
        `[data-value="${escapedValue}"]`
      ) as HTMLElement;
      optionElement?.focus();
    }
  }, [options, disabled, onChange]);

  // Determine which option should be focusable
  const getFocusableValue = useCallback(() => {
    // If there's a selected value, make it focusable
    if (value && options.find(opt => opt.value === value)) {
      return value;
    }
    // Otherwise, make the first enabled option focusable
    const firstEnabled = options.find(opt => !opt.disabled && !disabled);
    return firstEnabled?.value || null;
  }, [value, options, disabled]);

  const focusableValue = getFocusableValue();

  return (
    <div className={`im-radio-group ${className}`} ref={containerRef}>
      {label && (
        <label className="im-radio-group-label" id={`${name}-label`}>
          {label}
        </label>
      )}
      <div
        className="im-radio-group-options"
        role="radiogroup"
        aria-labelledby={label ? `${name}-label` : undefined}
        aria-required="false"
      >
        {options.map((option) => {
          const isSelected = value === option.value;
          const isDisabled = disabled || option.disabled;
          const isFocusable = option.value === focusableValue && !isDisabled;
          const optionId = `${name}-${option.value}`;
          
          return (
            <div
              key={option.value}
              data-value={option.value}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isDisabled}
              aria-describedby={option.description ? `${optionId}-desc` : undefined}
              tabIndex={isFocusable ? 0 : -1}
              className={`im-radio-option ${isSelected ? 'im-radio-option--selected' : ''} ${isDisabled ? 'im-radio-option--disabled' : ''}`}
              onClick={() => !isDisabled && onChange(option.value)}
              onKeyDown={handleKeyDown}
            >
              {/* Hidden native input for form compatibility */}
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                readOnly
                disabled={isDisabled}
                tabIndex={-1}
                className="im-radio-native-input"
                aria-hidden="true"
              />
              
              {/* Custom radio control */}
              <span className="im-radio-custom-control" aria-hidden="true">
                <span className="im-radio-custom-control-inner"></span>
              </span>
              
              <div className="im-radio-option-content">
                <span className="im-radio-option-label">{option.label}</span>
                {option.description && (
                  <span
                    id={`${optionId}-desc`}
                    className="im-radio-option-description"
                  >
                    {option.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
