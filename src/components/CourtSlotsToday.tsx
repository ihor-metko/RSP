"use client";

import { useTranslations } from "next-intl";
import type { AvailabilitySlot } from "@/types/court";
import { formatPrice } from "@/utils/price";
import "./CourtSlotsToday.css";

interface CourtSlotsTodayProps {
  slots: AvailabilitySlot[];
  maxSlots?: number;
  isLoading?: boolean;
  showPrices?: boolean;
  showLegend?: boolean;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getSlotStatusClass(status: AvailabilitySlot["status"]): string {
  switch (status) {
    case "available":
      return "im-slot-chip--available";
    case "booked":
      return "im-slot-chip--booked";
    case "partial":
      return "im-slot-chip--partial";
    case "pending":
      return "im-slot-chip--pending";
    default:
      return "";
  }
}

export function CourtSlotsToday({
  slots,
  maxSlots = 6,
  isLoading = false,
  showPrices = true,
  showLegend = true,
}: CourtSlotsTodayProps) {
  const t = useTranslations();

  if (isLoading) {
    return (
      <div className="im-slots-loading">
        {Array.from({ length: maxSlots }).map((_, i) => (
          <div key={i} className="im-slot-skeleton" />
        ))}
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <p className="im-slots-empty">
        {t("court.noAvailabilityData")}
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
    <div className="im-slots-today">
      <div className="im-slots-container">
        {displaySlots.map((slot) => (
          <span
            key={slot.start}
            className={`im-slot-chip ${getSlotStatusClass(slot.status)}`}
            title={`${formatTime(slot.start)} - ${slot.status === "available" ? t("common.available") : slot.status === "booked" ? t("common.booked") : slot.status === "partial" ? t("clubDetail.limited") : t("common.pending")}${slot.priceCents !== undefined ? ` · ${formatPrice(slot.priceCents)}` : ""}`}
            aria-label={`${formatTime(slot.start)}: ${slot.status}${slot.priceCents !== undefined ? `, ${formatPrice(slot.priceCents)}` : ""}`}
          >
            {formatTime(slot.start)}
            {showPrices && slot.priceCents !== undefined && slot.status === "available" && (
              <span className="im-slot-price">· {formatPrice(slot.priceCents)}</span>
            )}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="im-slot-more">
            +{remainingCount} {t("court.moreSlots")}
            {showPrices && minPrice !== null && (
              <span className="im-slot-price"> from {formatPrice(minPrice)}</span>
            )}
          </span>
        )}
      </div>
      {showLegend && (
        <div className="im-slots-legend">
          <span className="im-slots-legend-item">
            <span className="im-slots-legend-dot im-slots-legend-dot--available" />
            {t("common.available")}
          </span>
          <span className="im-slots-legend-item">
            <span className="im-slots-legend-dot im-slots-legend-dot--booked" />
            {t("common.booked")}
          </span>
          <span className="im-slots-legend-item">
            <span className="im-slots-legend-dot im-slots-legend-dot--partial" />
            {t("clubDetail.limited")}
          </span>
          <span className="im-slots-legend-item">
            <span className="im-slots-legend-dot im-slots-legend-dot--pending" />
            {t("common.pending")}
          </span>
        </div>
      )}
    </div>
  );
}
