"use client";

import React from "react";
import "./FlowStep.css";

/**
 * FlowStep Component
 * Represents a single step in an interactive documentation flow.
 * Used to guide users through player role functionality demonstrations.
 * 
 * Features:
 * - Step number indicator with styling
 * - Title, description, and visual preview
 * - Support for active, completed, and disabled states
 * - EN/UA localization support
 * - Dark theme compatible
 * - Uses semantic im-* CSS classes
 */
interface FlowStepProps {
  stepNumber?: number;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  preview?: React.ReactNode;
  state?: "active" | "completed" | "disabled" | "default";
  className?: string;
}

export default function FlowStep({
  stepNumber,
  title,
  description,
  children,
  preview,
  state = "default",
  className = "",
}: FlowStepProps) {
  const stateClass = state !== "default" ? `im-flow-step--${state}` : "";
  
  return (
    <div className={`im-flow-step ${stateClass} ${className}`.trim()}>
      {stepNumber && (
        <div className="im-step-number-wrapper">
          <div className="im-step-number">{stepNumber}</div>
        </div>
      )}
      
      <div className="im-step-content">
        {title && <h4 className="im-step-title">{title}</h4>}
        
        {description && (
          <p className="im-step-description">{description}</p>
        )}
        
        {preview && (
          <div className="im-step-preview">{preview}</div>
        )}
        
        {children}
      </div>
    </div>
  );
}
