"use client";

import { Button } from "@/components/ui";
import type { UseListControllerReturn } from "@/hooks/useListController";
import { useControllerOrContext } from "./ListControllerContext";
import "./QuickPresets.css";

interface PresetDefinition<TFilters = Record<string, unknown>> {
  /** Unique preset identifier */
  id: string;
  /** Display label */
  label: string;
  /** Filters to apply when preset is activated */
  filters: Partial<TFilters>;
}

interface QuickPresetsProps<TFilters = Record<string, unknown>> {
  /** List controller - if not provided, uses context */
  controller?: UseListControllerReturn<TFilters>;
  /** Preset definitions */
  presets: PresetDefinition<TFilters>[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Quick preset buttons component for common filter combinations.
 * 
 * Features:
 * - Toggle presets on/off
 * - Visual indication of active preset
 * - Integrates with useListController
 * - Resets page to 1 on preset toggle
 * 
 * @example
 * ```tsx
 * <QuickPresets 
 *   controller={controller}
 *   presets={[
 *     { 
 *       id: 'active_last_30d', 
 *       label: 'Active Last 30 Days',
 *       filters: { activeLast30d: true }
 *     },
 *     { 
 *       id: 'never_booked', 
 *       label: 'Never Booked',
 *       filters: { neverBooked: true }
 *     },
 *   ]}
 * />
 * ```
 */
export function QuickPresets<TFilters = Record<string, unknown>>({
  controller: controllerProp,
  presets,
  className = "",
}: QuickPresetsProps<TFilters>) {
  // Use helper hook that handles both prop and context
  const controller = useControllerOrContext(controllerProp);

  // Check if a preset is currently active
  const isPresetActive = (preset: PresetDefinition<TFilters>): boolean => {
    return Object.entries(preset.filters).every(([key, value]) => {
      const filterKey = key as keyof TFilters;
      return controller.filters[filterKey] === value;
    });
  };

  // Toggle preset on/off
  const togglePreset = (preset: PresetDefinition<TFilters>) => {
    const isActive = isPresetActive(preset);
    
    if (isActive) {
      // Deactivate: clear preset filters
      const updates: Partial<TFilters> = {};
      Object.keys(preset.filters).forEach((key) => {
        const filterKey = key as keyof TFilters;
        // Set to appropriate "empty" value based on type
        const currentValue = controller.filters[filterKey];
        if (typeof currentValue === "boolean") {
          updates[filterKey] = false as TFilters[keyof TFilters];
        } else if (typeof currentValue === "string") {
          updates[filterKey] = "" as TFilters[keyof TFilters];
        } else if (Array.isArray(currentValue)) {
          updates[filterKey] = [] as TFilters[keyof TFilters];
        }
      });
      controller.setFilters(updates);
    } else {
      // Activate: apply preset filters
      controller.setFilters(preset.filters);
    }
  };

  return (
    <div className={`im-quick-presets ${className}`.trim()}>
      {presets.map((preset) => (
        <Button
          key={preset.id}
          variant={isPresetActive(preset) ? "primary" : "outline"}
          size="small"
          onClick={() => togglePreset(preset)}
          aria-pressed={isPresetActive(preset)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
