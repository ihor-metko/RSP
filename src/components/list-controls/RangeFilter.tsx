"use client";

import { Select, type SelectOption } from "@/components/ui";
import type { UseListControllerReturn } from "@/hooks/useListController";
import { useControllerOrContext } from "./ListControllerContext";

interface RangeFilterProps<TFilters = Record<string, unknown>> {
  /** List controller - if not provided, uses context */
  controller?: UseListControllerReturn<TFilters>;
  /** Filter key to update */
  filterKey: keyof TFilters;
  /** Available range options */
  ranges: Array<{ value: string; label: string }>;
  /** Label for the select */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Range filter component for filtering by numeric ranges.
 * 
 * Features:
 * - Single range selection
 * - Integrates with useListController
 * - Resets page to 1 on selection
 * 
 * @example
 * ```tsx
 * <RangeFilter 
 *   controller={controller}
 *   filterKey="clubCountRange"
 *   label="Number of Clubs"
 *   ranges={[
 *     { value: '1-5', label: '1-5' },
 *     { value: '6-10', label: '6-10' },
 *     { value: '10+', label: '10+' },
 *   ]}
 * />
 * ```
 */
export function RangeFilter<TFilters = Record<string, unknown>>({
  controller: controllerProp,
  filterKey,
  ranges,
  label = "Range",
  placeholder = "All",
  className = "",
}: RangeFilterProps<TFilters>) {
  // Use helper hook that handles both prop and context
  const controller = useControllerOrContext(controllerProp);

  // Convert ranges to select options
  const options: SelectOption[] = [
    { value: "", label: placeholder },
    ...ranges.map((range) => ({
      value: range.value,
      label: range.label,
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
