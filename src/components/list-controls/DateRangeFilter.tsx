"use client";

import { DateInput } from "@/components/ui/DateInput";
import type { UseListControllerReturn } from "@/hooks/useListController";
import { useControllerOrContext } from "./ListControllerContext";
import "./DateRangeFilter.css";

interface DateRangeFilterProps<TFilters = Record<string, unknown>> {
  /** List controller - if not provided, uses context */
  controller?: UseListControllerReturn<TFilters>;
  /** Base field name (e.g., 'createdAt', 'lastActive') */
  field: string;
  /** Label for the date range filter */
  label?: string;
  /** From date filter key (default: field + '_from' or 'dateFrom') */
  fromKey?: keyof TFilters;
  /** To date filter key (default: field + '_to' or 'dateTo') */
  toKey?: keyof TFilters;
  /** Label for from input */
  fromLabel?: string;
  /** Label for to input */
  toLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Date range filter component for filtering by date ranges.
 * 
 * A reusable component for filtering data by date ranges. Provides two date inputs
 * (from/to) with consistent im-* styling and full accessibility support.
 * 
 * Features:
 * - From and To date inputs with calendar popups
 * - Integrates seamlessly with useListController
 * - Resets page to 1 on change for consistent UX
 * - Accessible with proper ARIA labels
 * - Responsive layout (stacks on mobile)
 * - Consistent im-* styling for dark theme support
 * 
 * Usage:
 * Can be used standalone or within ListToolbar for consistent filter layouts.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <DateRangeFilter 
 *   controller={controller}
 *   field="createdAt"
 *   label="Created Date"
 *   fromLabel="From"
 *   toLabel="To"
 * />
 * 
 * // Within ListToolbar
 * <ListToolbar controller={controller}>
 *   <DateRangeFilter field="bookingDate" label="Booking Date" />
 * </ListToolbar>
 * ```
 */
export function DateRangeFilter<TFilters = Record<string, unknown>>({
  controller: controllerProp,
  field,
  label,
  fromKey = "dateFrom" as keyof TFilters,
  toKey = "dateTo" as keyof TFilters,
  fromLabel = "From",
  toLabel = "To",
  className = "",
}: DateRangeFilterProps<TFilters>) {
  // Use helper hook that handles both prop and context
  const controller = useControllerOrContext(controllerProp);

  // Get current values
  const fromValue = (controller.filters[fromKey] as string) || "";
  const toValue = (controller.filters[toKey] as string) || "";

  const handleFromChange = (date: string) => {
    controller.setFilter(fromKey, date as TFilters[keyof TFilters]);
  };

  const handleToChange = (date: string) => {
    controller.setFilter(toKey, date as TFilters[keyof TFilters]);
  };

  return (
    <div className={`im-date-range-filter ${className}`.trim()}>
      {label && (
        <span className="im-date-range-label">{label}</span>
      )}
      <div className="im-date-range-inputs">
        <DateInput
          value={fromValue}
          onChange={handleFromChange}
          label={fromLabel}
          placeholder={fromLabel}
          maxDate={toValue || undefined}
          rangeStart={fromValue}
          rangeEnd={toValue}
          isRangeStart={true}
          aria-label={`${field} ${fromLabel}`}
        />
        <DateInput
          value={toValue}
          onChange={handleToChange}
          label={toLabel}
          placeholder={toLabel}
          minDate={fromValue || undefined}
          rangeStart={fromValue}
          rangeEnd={toValue}
          isRangeStart={false}
          aria-label={`${field} ${toLabel}`}
        />
      </div>
    </div>
  );
}
