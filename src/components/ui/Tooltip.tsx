"use client";

import { useState, useRef, useEffect } from "react";
import "./Tooltip.css";

export interface TooltipProps {
  /** Content to display in the tooltip */
  content: React.ReactNode;
  /** The element that triggers the tooltip */
  children: React.ReactNode;
  /** Position of the tooltip relative to the trigger */
  position?: "top" | "bottom" | "left" | "right";
  /** Delay before showing tooltip (in ms) */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tooltip Component
 *
 * A reusable tooltip component that displays additional information on hover/focus.
 * Supports keyboard accessibility and dark theme.
 *
 * @example
 * <Tooltip content="This is a helpful tip">
 *   <Button>Hover me</Button>
 * </Tooltip>
 *
 * @example
 * <Tooltip content="Bottom tooltip" position="bottom">
 *   <span>Trigger</span>
 * </Tooltip>
 */
export function Tooltip({
  content,
  children,
  position = "top",
  delay = 200,
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`im-tooltip-container ${className}`.trim()}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div
          className={`im-tooltip im-tooltip--${position}`}
          role="tooltip"
          aria-hidden={!isVisible}
        >
          <div className="im-tooltip-content">{content}</div>
          <div className="im-tooltip-arrow" />
        </div>
      )}
    </div>
  );
}
