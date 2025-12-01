"use client";

import type { AvailabilitySlot } from "@/types/court";
import { formatPrice } from "@/utils/price";

interface CourtSlotsTodayProps {
  slots: AvailabilitySlot[];
  maxSlots?: number;
  isLoading?: boolean;
  showPrices?: boolean;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getStatusColor(status: AvailabilitySlot["status"]): string {
  switch (status) {
    case "available":
      return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700";
    case "booked":
      return "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600";
    case "partial":
      return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700";
    case "pending":
      return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700";
    default:
      return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600";
  }
}

function getStatusLabel(status: AvailabilitySlot["status"]): string {
  switch (status) {
    case "available":
      return "Available";
    case "booked":
      return "Booked";
    case "partial":
      return "Limited";
    case "pending":
      return "Pending";
    default:
      return "Unknown";
  }
}

export function CourtSlotsToday({
  slots,
  maxSlots = 6,
  isLoading = false,
  showPrices = true,
}: CourtSlotsTodayProps) {
  if (isLoading) {
    return (
      <div className="tm-slots-loading flex gap-1 flex-wrap">
        {Array.from({ length: maxSlots }).map((_, i) => (
          <div
            key={i}
            className="tm-slot-skeleton w-16 h-6 rounded-sm bg-gray-200 dark:bg-gray-700 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <p className="tm-slots-empty text-sm text-gray-500">
        No availability data
      </p>
    );
  }

  // Take only the first maxSlots
  const displaySlots = slots.slice(0, maxSlots);
  const remainingCount = slots.length - maxSlots;

  // Get minimum price for "from X" display when there are remaining slots
  const availableSlots = slots.filter((s) => s.status === "available" && s.priceCents !== undefined);
  const minPrice = availableSlots.length > 0
    ? Math.min(...availableSlots.map((s) => s.priceCents!))
    : null;

  return (
    <div className="tm-slots-today">
      <div className="flex gap-1 flex-wrap">
        {displaySlots.map((slot) => (
          <span
            key={slot.start}
            className={`tm-slot-chip inline-block px-2 py-0.5 text-xs rounded-sm border ${getStatusColor(slot.status)}`}
            title={`${formatTime(slot.start)} - ${getStatusLabel(slot.status)}${slot.priceCents !== undefined ? ` · ${formatPrice(slot.priceCents)}` : ""}`}
            aria-label={`${formatTime(slot.start)}: ${getStatusLabel(slot.status)}${slot.priceCents !== undefined ? `, ${formatPrice(slot.priceCents)}` : ""}`}
          >
            {formatTime(slot.start)}
            {showPrices && slot.priceCents !== undefined && slot.status === "available" && (
              <span className="ml-1 opacity-75">· {formatPrice(slot.priceCents)}</span>
            )}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="tm-slot-more inline-block px-2 py-0.5 text-xs rounded-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            +{remainingCount} more
            {showPrices && minPrice !== null && (
              <span className="ml-1">from {formatPrice(minPrice)}</span>
            )}
          </span>
        )}
      </div>
      <div className="tm-slots-legend mt-2 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400" /> Booked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" /> Limited
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" /> Pending
        </span>
      </div>
    </div>
  );
}
