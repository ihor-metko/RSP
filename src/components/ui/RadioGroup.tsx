/**
 * RadioGroup - Reusable radio button group component
 * Provides an accessible radio button group with labels and descriptions
 */

import React from "react";
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
  return (
    <div className={`im-radio-group ${className}`}>
      {label && (
        <label className="im-radio-group-label">
          {label}
        </label>
      )}
      {options.map((option) => {
        const isSelected = value === option.value;
        const isDisabled = disabled || option.disabled;
        
        return (
          <label
            key={option.value}
            className={`im-radio-option ${isSelected ? 'im-radio-option--selected' : ''} ${isDisabled ? 'im-radio-option--disabled' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => !isDisabled && onChange(option.value)}
              disabled={isDisabled}
              aria-describedby={option.description ? `${name}-${option.value}-desc` : undefined}
            />
            <div className="im-radio-option-content">
              <span className="im-radio-option-label">{option.label}</span>
              {option.description && (
                <span
                  id={`${name}-${option.value}-desc`}
                  className="im-radio-option-description"
                >
                  {option.description}
                </span>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
