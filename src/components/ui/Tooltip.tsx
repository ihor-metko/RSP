"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import "./Tooltip.css";

interface TooltipProps {
  /** The content to display in the tooltip */
  content: ReactNode;
  /** The trigger element */
  children: ReactNode;
  /** Position of the tooltip */
  position?: "top" | "bottom" | "left" | "right";
  /** Delay before showing the tooltip (in ms) */
  delay?: number;
  /** Additional CSS class for the tooltip */
  className?: string;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
}

/**
 * Tooltip Component
 *
 * A lightweight, accessible tooltip component that appears on hover/focus.
 *
 * @example
 * <Tooltip content="This is a helpful tip">
 *   <button>Hover me</button>
 * </Tooltip>
 *
 * @example
 * <Tooltip content="Detailed description" position="right">
 *   <InfoIcon />
 * </Tooltip>
 */
export function Tooltip({
  content,
  children,
  position = "top",
  delay = 200,
  className = "",
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
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

  // Handle keyboard escape to close tooltip
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        hideTooltip();
      }
    };

    if (isVisible) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isVisible]);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={triggerRef}
      className="im-tooltip-trigger"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`im-tooltip im-tooltip--${position} ${className}`.trim()}
        >
          <div className="im-tooltip-content">{content}</div>
          <div className="im-tooltip-arrow" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
