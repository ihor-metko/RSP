"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
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
  /** Custom reset handler (if not provided, uses controller.clearFilters) */
  onReset?: () => void;
  /** Compact layout mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Custom action button to display at top-right corner */
  actionButton?: ReactNode;
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
 * - Reset/clear filters button (always visible when enabled, disabled when no filters active)
 * - Detects active filters automatically
 * - Integrates seamlessly with useListController
 * - Responsive layout (stacks on mobile)
 * - Consistent im-* styling for dark theme support
 * - Compact mode for tighter layouts
 * - Proper spacing and alignment for all child controls
 * - Vertical stacked layout for action buttons (prevents layout shifting)
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
 * // With action button
 * <ListToolbar
 *   controller={controller}
 *   showReset
 *   actionButton={
 *     <Button onClick={handleCreate} variant="primary">
 *       Create New
 *     </Button>
 *   }
 * >
 *   <ListSearch placeholder="Search..." />
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
  onReset,
  compact = false,
  className = "",
  actionButton,
}: ListToolbarProps<TFilters>) {
  // Get translations from next-intl
  const t = useTranslations("common");
  
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
    <Card className={`im-list-toolbar ${compact ? "im-list-toolbar--compact" : ""} ${className}`.trim()} cardBodyClassName="im-list-toolbar-body">
      <div className="im-list-toolbar-content">
        {children}
      </div>

      {(showReset || actionButton) && (
        <div className="im-list-toolbar-actions">
          {showReset && (
            <Button 
              variant="outline" 
              size="small" 
              onClick={handleReset}
              disabled={!hasActiveFilters}
            >
              <XIcon />
              {t("clearFilters")}
            </Button>
          )}
          {actionButton}
        </div>
      )}
    </Card>
  );
}
