"use client";

import { ReactNode } from "react";
import { Card, Button } from "@/components/ui";
import type { UseListControllerReturn } from "@/hooks/useListController";
import { useControllerOrContext } from "./ListControllerContext";
import "./ListToolbar.css";

interface ListToolbarProps<TFilters = Record<string, unknown>> {
  /** List controller - if not provided, uses context */
  controller?: UseListControllerReturn<TFilters>;
  /** Children components (filters, search, etc.) */
  children?: ReactNode;
  /** Show reset/clear filters button */
  showReset?: boolean;
  /** Custom reset button label */
  resetLabel?: string;
  /** Custom reset handler (if not provided, uses controller.clearFilters) */
  onReset?: () => void;
  /** Compact layout mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Default icon for reset button
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/**
 * Toolbar container component for list controls.
 * 
 * Provides a consistent layout for filters, search, sorting, and other controls.
 * Can automatically render a reset button based on active filters.
 * 
 * @example
 * ```tsx
 * <ListToolbar controller={controller} showReset>
 *   <ListSearch placeholder="Search..." />
 *   <SortSelect options={sortOptions} />
 *   <Select label="Status" ... />
 * </ListToolbar>
 * ```
 */
export function ListToolbar<TFilters = Record<string, unknown>>({
  controller: controllerProp,
  children,
  showReset = true,
  resetLabel = "Clear Filters",
  onReset,
  compact = false,
  className = "",
}: ListToolbarProps<TFilters>) {
  // Use helper hook that handles both prop and context
  const controller = useControllerOrContext(controllerProp);

  // Check if any filters are active
  const hasActiveFilters = Object.values(controller.filters).some((value) => {
    if (typeof value === "string") return value.length > 0;
    if (typeof value === "boolean") return value === true;
    if (Array.isArray(value)) return value.length > 0;
    return value != null && value !== "";
  });

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      controller.clearFilters();
    }
  };

  return (
    <Card className={`im-list-toolbar ${compact ? "im-list-toolbar--compact" : ""} ${className}`.trim()}>
      <div className="im-list-toolbar-content">
        {children}
      </div>
      
      {showReset && hasActiveFilters && (
        <div className="im-list-toolbar-actions">
          <Button variant="outline" size="small" onClick={handleReset}>
            <XIcon />
            {resetLabel}
          </Button>
        </div>
      )}
    </Card>
  );
}
