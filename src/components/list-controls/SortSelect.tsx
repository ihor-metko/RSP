"use client";

import { Select, type SelectOption } from "@/components/ui";
import type { UseListControllerReturn } from "@/hooks/useListController";
import { useControllerOrContext } from "./ListControllerContext";

interface SortOption {
  key: string;
  label: string;
  direction?: "asc" | "desc";
}

interface SortSelectProps<TFilters = Record<string, unknown>> {
  /** List controller - if not provided, uses context */
  controller?: UseListControllerReturn<TFilters>;
  /** Sort options to display */
  options: SortOption[];
  /** Label for the select */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Sort selector component for list ordering.
 * 
 * Supports combined sort key + direction in a single dropdown.
 * Each option can specify a key and direction.
 * 
 * @example
 * ```tsx
 * <SortSelect 
 *   controller={controller}
 *   label="Sort by"
 *   options={[
 *     { key: 'createdAt', label: 'Newest', direction: 'desc' },
 *     { key: 'createdAt', label: 'Oldest', direction: 'asc' },
 *     { key: 'name', label: 'Name A-Z', direction: 'asc' },
 *     { key: 'name', label: 'Name Z-A', direction: 'desc' },
 *   ]}
 * />
 * ```
 */
export function SortSelect<TFilters = Record<string, unknown>>({
  controller: controllerProp,
  options,
  label,
  placeholder = "Sort by...",
  className = "",
}: SortSelectProps<TFilters>) {
  // Use helper hook that handles both prop and context
  const controller = useControllerOrContext(controllerProp);

  const { sortBy, sortOrder, setSortBy, setSortOrder } = controller;

  // Convert sort options to select options
  const selectOptions: SelectOption[] = options.map((opt) => ({
    value: `${opt.key}-${opt.direction || "desc"}`,
    label: opt.label,
  }));

  // Current value combines sortBy and sortOrder
  const currentValue = `${sortBy}-${sortOrder}`;

  const handleChange = (value: string) => {
    const [key, direction] = value.split("-") as [string, "asc" | "desc"];
    setSortBy(key);
    setSortOrder(direction);
  };

  return (
    <Select
      label={label}
      options={selectOptions}
      value={currentValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      aria-label={label || "Sort options"}
    />
  );
}
