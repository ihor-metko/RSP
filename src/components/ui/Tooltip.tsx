"use client";

import "./Tooltip.css";

export interface TooltipProps {
  /** The content to show in the tooltip */
  content: string;
  /** The element that triggers the tooltip */
  children: React.ReactNode;
  /** Position of the tooltip relative to the trigger */
  position?: "top" | "bottom" | "left" | "right";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tooltip Component
 * 
 * A reusable tooltip component that shows additional information on hover.
 * Accessible with proper ARIA attributes.
 * 
 * @example
 * <Tooltip content="More information about this item">
 *   <span>Hover me</span>
 * </Tooltip>
 */
export function Tooltip({
  content,
  children,
  position = "top",
  className = "",
}: TooltipProps) {
  return (
    <span 
      className={`im-tooltip-container im-tooltip--${position} ${className}`.trim()}
      aria-label={content}
      role="tooltip"
    >
      {children}
      <span className="im-tooltip-content" aria-hidden="true">
        {content}
      </span>
    </span>
  );
}
