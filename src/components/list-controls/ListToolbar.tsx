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
 * A reusable container that provides a consistent, accessible layout for
 * all list filtering controls (search, selects, date ranges, etc.).
 * 
 * Features:
 * - Consistent horizontal layout for filters
 * - Automatic reset/clear filters button when filters are active
 * - Detects active filters automatically
 * - Integrates seamlessly with useListController
 * - Responsive layout (stacks on mobile)
 * - Consistent im-* styling for dark theme support
 * - Compact mode for tighter layouts
 * - Proper spacing and alignment for all child controls
 * 
 * Usage:
 * Wrap all your filter components (ListSearch, Select, DateRangeFilter, etc.)
 * inside ListToolbar to get consistent styling and layout.
 * 
 * @example
 * ```tsx
 * // Basic usage with reset button
 * <ListToolbar controller={controller} showReset>
 *   <ListSearch placeholder="Search..." />
 *   <SortSelect options={sortOptions} />
 *   <Select label="Status" options={statusOptions} />
 * </ListToolbar>
 * 
 * // Compact mode
 * <ListToolbar controller={controller} compact>
 *   <ListSearch placeholder="Search..." />
 * </ListToolbar>
 * 
 * // Custom reset handler
 * <ListToolbar 
 *   controller={controller}
 *   showReset
 *   resetLabel="Clear All"
 *   onReset={() => {
 *     controller.clearFilters();
 *     // Additional custom logic
 *   }}
 * >
 *   <ListSearch />
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
