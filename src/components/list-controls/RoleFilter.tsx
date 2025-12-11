"use client";

import { Select, type SelectOption } from "@/components/ui";
import type { UseListControllerReturn } from "@/hooks/useListController";
import { useControllerOrContext } from "./ListControllerContext";

interface RoleFilterProps<TFilters = Record<string, unknown>> {
  /** List controller - if not provided, uses context */
  controller?: UseListControllerReturn<TFilters>;
  /** Filter key to update (default: 'roleFilter') */
  filterKey?: keyof TFilters;
  /** Available roles to filter by */
  roles: Array<{ value: string; label: string }>;
  /** Label for the select */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Role filter component for filtering by user role.
 * 
 * Features:
 * - Single role selection (multi-select can be added later)
 * - Integrates with useListController
 * - Resets page to 1 on selection
 * 
 * @example
 * ```tsx
 * <RoleFilter 
 *   controller={controller}
 *   filterKey="roleFilter"
 *   label="Role"
 *   roles={[
 *     { value: 'root_admin', label: 'Root Admin' },
 *     { value: 'organization_admin', label: 'Organization Admin' },
 *     { value: 'club_admin', label: 'Club Admin' },
 *     { value: 'user', label: 'User' },
 *   ]}
 * />
 * ```
 */
export function RoleFilter<TFilters = Record<string, unknown>>({
  controller: controllerProp,
  filterKey = "roleFilter" as keyof TFilters,
  roles,
  label = "Role",
  placeholder = "All Roles",
  className = "",
}: RoleFilterProps<TFilters>) {
  // Use helper hook that handles both prop and context
  const controller = useControllerOrContext(controllerProp);

  // Convert roles to select options
  const options: SelectOption[] = [
    { value: "", label: placeholder },
    ...roles.map((role) => ({
      value: role.value,
      label: role.label,
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
