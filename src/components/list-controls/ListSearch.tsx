"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui";
import type { UseListControllerReturn } from "@/hooks/useListController";
import { useControllerOrContext } from "./ListControllerContext";

interface ListSearchProps<TFilters = Record<string, unknown>> {
  /** List controller - if not provided, uses context */
  controller?: UseListControllerReturn<TFilters>;
  /** Search input placeholder text */
  placeholder?: string;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Filter key to update (default: 'searchQuery' or 'search') */
  filterKey?: keyof TFilters;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Debounced search input component for list filtering.
 * 
 * Features:
 * - Auto-debounced search (default 300ms)
 * - Press Enter to trigger immediate search
 * - Automatically resets page to 1 when searching
 * - Accessible with proper aria-labels
 * 
 * @example
 * ```tsx
 * // With context
 * <ListControllerProvider controller={controller}>
 *   <ListSearch placeholder="Search users..." />
 * </ListControllerProvider>
 * 
 * // With direct controller prop
 * <ListSearch 
 *   controller={controller} 
 *   placeholder="Search..."
 *   debounceMs={500}
 * />
 * ```
 */
export function ListSearch<TFilters = Record<string, unknown>>({
  controller: controllerProp,
  placeholder = "Search...",
  debounceMs = 300,
  filterKey = "searchQuery" as keyof TFilters,
  className = "",
}: ListSearchProps<TFilters>) {
  // Use helper hook that handles both prop and context
  const controller = useControllerOrContext(controllerProp);

  // Local state for immediate UI updates
  const [localValue, setLocalValue] = useState<string>(
    (controller.filters[filterKey] as string) || ""
  );

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update local value when filter changes externally
  // Note: localValue is intentionally excluded from dependencies to prevent
  // infinite loops. We only want to update localValue when the external
  // filter changes, not when localValue changes (which would be circular).
  useEffect(() => {
    const filterValue = (controller.filters[filterKey] as string) || "";
    if (filterValue !== localValue) {
      setLocalValue(filterValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller.filters[filterKey], filterKey]);

  // Debounced update function
  const updateFilter = useCallback(
    (value: string) => {
      controller.setFilter(filterKey, value as TFilters[keyof TFilters]);
    },
    [controller, filterKey]
  );

  // Handle input change with debounce
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      updateFilter(value);
    }, debounceMs);
  };

  // Handle Enter key for immediate search
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Trigger immediate update
      updateFilter(localValue);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <Input
      value={localValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      aria-label={placeholder}
      className={className}
      type="text"
    />
  );
}
