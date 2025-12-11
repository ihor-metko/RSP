"use client";

import { Input } from "@/components/ui";
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
 * Features:
 * - From and To date inputs
 * - Integrates with useListController
 * - Resets page to 1 on change
 * - Accessible date inputs
 * 
 * @example
 * ```tsx
 * <DateRangeFilter 
 *   controller={controller}
 *   field="createdAt"
 *   label="Created Date"
 *   fromLabel="From"
 *   toLabel="To"
 * />
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

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    controller.setFilter(fromKey, e.target.value as TFilters[keyof TFilters]);
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    controller.setFilter(toKey, e.target.value as TFilters[keyof TFilters]);
  };

  return (
    <div className={`im-date-range-filter ${className}`.trim()}>
      {label && (
        <span className="im-date-range-label">{label}</span>
      )}
      <div className="im-date-range-inputs">
        <Input
          type="date"
          value={fromValue}
          onChange={handleFromChange}
          label={fromLabel}
          placeholder={fromLabel}
          aria-label={`${field} ${fromLabel}`}
        />
        <Input
          type="date"
          value={toValue}
          onChange={handleToChange}
          label={toLabel}
          placeholder={toLabel}
          aria-label={`${field} ${toLabel}`}
        />
      </div>
    </div>
  );
}
