"use client";

import { useState, useEffect, useMemo } from "react";
import { Select, type SelectOption } from "@/components/ui";
import type { UseListControllerReturn } from "@/hooks/useListController";
import { useControllerOrContext } from "./ListControllerContext";
import { useClubStore } from "@/stores/useClubStore";

interface ClubSelectorProps<TFilters = Record<string, unknown>> {
  /** List controller - if not provided, uses context */
  controller?: UseListControllerReturn<TFilters>;
  /** Filter key to update (default: 'clubFilter') */
  filterKey?: keyof TFilters;
  /** Organization filter key to read from (default: 'organizationFilter') */
  orgFilterKey?: keyof TFilters;
  /** Label for the select */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Club selector component for filtering by club.
 * 
 * Features:
 * - Automatically fetches clubs from store
 * - Filters clubs by selected organization
 * - Integrates with useListController
 * - Resets page to 1 on selection
 * 
 * @example
 * ```tsx
 * <ClubSelector 
 *   controller={controller}
 *   filterKey="clubFilter"
 *   orgFilterKey="organizationFilter"
 *   label="Club"
 *   placeholder="All Clubs"
 * />
 * ```
 */
export function ClubSelector<TFilters = Record<string, unknown>>({
  controller: controllerProp,
  filterKey = "clubFilter" as keyof TFilters,
  orgFilterKey = "organizationFilter" as keyof TFilters,
  label = "Club",
  placeholder = "All Clubs",
  className = "",
}: ClubSelectorProps<TFilters>) {
  // Use helper hook that handles both prop and context
  const controller = useControllerOrContext(controllerProp);

  // Get clubs from store
  const clubs = useClubStore((state) => state.clubs);
  const fetchClubsIfNeeded = useClubStore((state) => state.fetchClubsIfNeeded);
  const loading = useClubStore((state) => state.loading);

  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch clubs on mount
  useEffect(() => {
    if (!hasInitialized) {
      fetchClubsIfNeeded().catch((error) => {
        console.error("Failed to fetch clubs:", error);
      });
      setHasInitialized(true);
    }
  }, [hasInitialized, fetchClubsIfNeeded]);

  // Get selected organization ID from controller
  const selectedOrgId = (controller.filters[orgFilterKey] as string) || "";

  // Filter clubs by selected organization
  const filteredClubs = useMemo(() => {
    if (!selectedOrgId) {
      return clubs;
    }
    return clubs.filter((club) => club.organizationId === selectedOrgId);
  }, [clubs, selectedOrgId]);

  // Convert clubs to select options
  const options: SelectOption[] = [
    { value: "", label: placeholder },
    ...filteredClubs.map((club) => ({
      value: club.id,
      label: club.name,
    })),
  ];

  // Get current value
  const currentValue = (controller.filters[filterKey] as string) || "";

  // Clear club filter if selected club is no longer in filtered list
  useEffect(() => {
    if (currentValue && !filteredClubs.find((club) => club.id === currentValue)) {
      controller.setFilter(filterKey, "" as TFilters[keyof TFilters]);
    }
  }, [currentValue, filteredClubs, controller, filterKey]);

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
      disabled={loading || (selectedOrgId !== "" && filteredClubs.length === 0)}
      className={className}
      aria-label={label}
    />
  );
}
