"use client";

import { Select, type SelectOption } from "@/components/ui";
import type { UseListControllerReturn } from "@/hooks/useListController";
import { useControllerOrContext } from "./ListControllerContext";

interface StatusFilterProps<TFilters = Record<string, unknown>> {
  /** List controller - if not provided, uses context */
  controller?: UseListControllerReturn<TFilters>;
  /** Filter key to update (default: 'statusFilter') */
  filterKey?: keyof TFilters;
  /** Available statuses to filter by */
  statuses: Array<{ value: string; label: string }>;
  /** Label for the select */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Status filter component for filtering by booking/entity status.
 * 
 * Features:
 * - Single status selection
 * - Integrates with useListController
 * - Resets page to 1 on selection
 * 
 * @example
 * ```tsx
 * <StatusFilter 
 *   controller={controller}
 *   filterKey="statusFilter"
 *   label="Status"
 *   statuses={[
 *     { value: 'pending', label: 'Pending' },
 *     { value: 'paid', label: 'Paid' },
 *     { value: 'cancelled', label: 'Cancelled' },
 *   ]}
 * />
 * ```
 */
export function StatusFilter<TFilters = Record<string, unknown>>({
  controller: controllerProp,
  filterKey = "statusFilter" as keyof TFilters,
  statuses,
  label = "Status",
  placeholder = "All Statuses",
  className = "",
}: StatusFilterProps<TFilters>) {
  // Use helper hook that handles both prop and context
  const controller = useControllerOrContext(controllerProp);

  // Convert statuses to select options
  const options: SelectOption[] = [
    { value: "", label: placeholder },
    ...statuses.map((status) => ({
      value: status.value,
      label: status.label,
    })),
  ];

  // Get current value
  const currentValue = (controller.filters[filterKey] as string) || "";

  const handleChange = (value: string) => {
    controller.setFilter(filterKey, value as TFilters[keyof TFilters]);
  };

  return (
    <Select
      label={label}
      options={options}
      value={currentValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      aria-label={label}
    />
  );
}
