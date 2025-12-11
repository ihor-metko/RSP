"use client";

import { useState, useEffect } from "react";
import { Select, type SelectOption } from "@/components/ui";
import type { UseListControllerReturn } from "@/hooks/useListController";
import { useControllerOrContext } from "./ListControllerContext";
import { useOrganizationStore } from "@/stores/useOrganizationStore";

interface OrgSelectorProps<TFilters = Record<string, unknown>> {
  /** List controller - if not provided, uses context */
  controller?: UseListControllerReturn<TFilters>;
  /** Filter key to update (default: 'organizationFilter' or 'organizationId') */
  filterKey?: keyof TFilters;
  /** Label for the select */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Allow multiple selection (not yet implemented) */
  allowMultiple?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Organization selector component for filtering by organization.
 * 
 * Features:
 * - Automatically fetches organizations from store
 * - Integrates with useListController
 * - Resets page to 1 on selection
 * - Clears dependent club filter when changed
 * 
 * @example
 * ```tsx
 * <OrgSelector 
 *   controller={controller}
 *   filterKey="organizationFilter"
 *   label="Organization"
 *   placeholder="All Organizations"
 * />
 * ```
 */
export function OrgSelector<TFilters = Record<string, unknown>>({
  controller: controllerProp,
  filterKey = "organizationFilter" as keyof TFilters,
  label = "Organization",
  placeholder = "All Organizations",
  allowMultiple = false,
  className = "",
}: OrgSelectorProps<TFilters>) {
  // Use helper hook that handles both prop and context
  const controller = useControllerOrContext(controllerProp);

  // Get organizations from store
  const organizations = useOrganizationStore((state) => state.organizations);
  const fetchOrganizations = useOrganizationStore((state) => state.fetchOrganizations);
  const loading = useOrganizationStore((state) => state.loading);

  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch organizations on mount
  useEffect(() => {
    if (!hasInitialized) {
      fetchOrganizations().catch((error) => {
        console.error("Failed to fetch organizations:", error);
      });
      setHasInitialized(true);
    }
  }, [hasInitialized, fetchOrganizations]);

  // Convert organizations to select options
  const options: SelectOption[] = [
    { value: "", label: placeholder },
    ...organizations.map((org) => ({
      value: org.id,
      label: org.name,
    })),
  ];

  // Get current value
  const currentValue = (controller.filters[filterKey] as string) || "";

  const handleChange = (value: string) => {
    // Update organization filter
    controller.setFilter(filterKey, value as TFilters[keyof TFilters]);
    
    // Clear dependent club filter if it exists
    const clubFilterKey = "clubFilter" as keyof TFilters;
    if (clubFilterKey in controller.filters) {
      controller.setFilter(clubFilterKey, "" as TFilters[keyof TFilters]);
    }
  };

  if (allowMultiple) {
    throw new Error("OrgSelector: allowMultiple is not yet implemented. Please use single selection mode.");
  }

  return (
    <Select
      label={label}
      options={options}
      value={currentValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={loading}
      className={className}
      aria-label={label}
    />
  );
}
