"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import { isValidImageUrl, getSupabaseStorageUrl } from "@/utils/image";
import type { Court, AvailabilitySlot } from "@/types/court";
import "./CourtCard.css";

interface CourtCardProps {
  court: Court;
  onBook?: (courtId: string) => void;
  onViewSchedule?: (courtId: string) => void;
  availabilitySlots?: AvailabilitySlot[];
  isLoadingAvailability?: boolean;
  showBookButton?: boolean;
  showViewSchedule?: boolean;
  isBookDisabled?: boolean;
  bookDisabledTooltip?: string;
  maxVisibleSlots?: number;
  showLegend?: boolean;
  /** @deprecated Use availabilitySlots instead */
  todaySlots?: React.ReactNode;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getSlotStatusClass(status: AvailabilitySlot["status"]): string {
  switch (status) {
    case "available":
      return "im-court-card-slot--available";
    case "booked":
      return "im-court-card-slot--booked";
    case "partial":
      return "im-court-card-slot--partial";
    case "pending":
      return "im-court-card-slot--pending";
    default:
      return "";
  }
}

function getStatusLabel(status: AvailabilitySlot["status"], t: ReturnType<typeof useTranslations>): string {
  switch (status) {
    case "available":
      return t("common.available");
    case "booked":
      return t("common.booked");
    case "partial":
      return t("clubDetail.limited");
    case "pending":
      return t("common.pending");
    default:
      return "";
  }
}

export function CourtCard({
  court,
  onBook,
  onViewSchedule,
  availabilitySlots = [],
  isLoadingAvailability = false,
  showBookButton = true,
  showViewSchedule = true,
  isBookDisabled = false,
  bookDisabledTooltip,
  maxVisibleSlots = 6,
  showLegend = true,
  todaySlots,
}: CourtCardProps) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoize the court image URL to avoid recalculating on every render
  const imageUrl = useMemo(() => getSupabaseStorageUrl(court.imageUrl), [court.imageUrl]);
  const hasImage = useMemo(() => isValidImageUrl(imageUrl), [imageUrl]);

  // Determine which slots to display
  const displaySlots = isExpanded ? availabilitySlots : availabilitySlots.slice(0, maxVisibleSlots);
  const remainingCount = availabilitySlots.length - maxVisibleSlots;
  const hasMoreSlots = remainingCount > 0 && !isExpanded;

  // Skeleton loading state for availability
  const renderAvailabilitySkeleton = () => (
    <div className="im-court-card-slots">
      {Array.from({ length: maxVisibleSlots }).map((_, i) => (
        <div
          key={i}
          className="im-court-card-slot im-court-card-skeleton-line"
          style={{ width: "48px", height: "24px" }}
        />
      ))}
    </div>
  );

  // Render availability slots
  const renderAvailabilitySlots = () => {
    if (availabilitySlots.length === 0 && !todaySlots) {
      return (
        <p className="text-sm" style={{ color: "var(--im-muted)" }}>
          {t("court.noAvailabilityData")}
        </p>
      );
    }

    // If todaySlots is provided (legacy), render it
    if (todaySlots && availabilitySlots.length === 0) {
      return todaySlots;
    }

    return (
      <>
        <div className={`im-court-card-slots ${isExpanded ? "im-court-card-slots--expanded" : ""}`}>
          {displaySlots.map((slot) => (
            <span
              key={slot.start}
              className={`im-court-card-slot ${getSlotStatusClass(slot.status)}`}
              title={`${formatTime(slot.start)} - ${getStatusLabel(slot.status, t)}${slot.priceCents !== undefined ? ` · ${formatPrice(slot.priceCents)}` : ""}`}
              aria-label={`${formatTime(slot.start)}: ${getStatusLabel(slot.status, t)}${slot.priceCents !== undefined ? `, ${formatPrice(slot.priceCents)}` : ""}`}
            >
              {formatTime(slot.start)}
            </span>
          ))}
          {hasMoreSlots && (
            <button
              type="button"
              className="im-court-card-slots-more"
              onClick={() => setIsExpanded(true)}
              aria-expanded={false}
              aria-label={t("court.showMoreSlots")}
            >
              +{remainingCount} {t("court.moreSlots")}
            </button>
          )}
        </div>
        {isExpanded && availabilitySlots.length > maxVisibleSlots && (
          <button
            type="button"
            className="im-court-card-availability-toggle mt-2"
            onClick={() => setIsExpanded(false)}
          >
            {t("common.close")}
          </button>
        )}
      </>
    );
  };

  return (
    <article className="im-court-card" aria-label={court.name}>
      {/* Image Section with Overlay */}
      <div className="im-court-card-image-container">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl as string}
            alt={court.name}
            className="im-court-card-image"
            loading="lazy"
          />
        ) : (
          <div className="im-court-card-image-placeholder">
            <svg
              className="im-court-card-image-placeholder-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="im-court-card-overlay" />
        
        {/* Badges on top */}
        <div className="im-court-card-badges">
          {court.type && (
            <span className="im-court-card-badge">{court.type}</span>
          )}
          {court.surface && (
            <span className="im-court-card-badge">{court.surface}</span>
          )}
          {court.indoor && (
            <span className="im-court-card-badge im-court-card-badge--indoor">
              {t("common.indoor")}
            </span>
          )}
        </div>

        {/* Name and Price Overlay */}
        <div className="im-court-card-overlay-content">
          <h3 className="im-court-card-name">{court.name}</h3>
          <p className="im-court-card-price">
            {formatPrice(court.defaultPriceCents)} {t("common.perHour")}
          </p>
        </div>
      </div>

      {/* Card Body - Availability */}
      <div className="im-court-card-body">
        <div className="im-court-card-availability">
          <div className="im-court-card-availability-header">
            <span className="im-court-card-availability-title">
              {t("clubDetail.courtAvailability")}
            </span>
            {availabilitySlots.length > maxVisibleSlots && !isExpanded && (
              <button
                type="button"
                className="im-court-card-availability-toggle"
                onClick={() => setIsExpanded(true)}
                aria-expanded={false}
              >
                {t("booking.viewSchedule")}
              </button>
            )}
          </div>

          {isLoadingAvailability ? renderAvailabilitySkeleton() : renderAvailabilitySlots()}
        </div>

        {/* Legend */}
        {showLegend && availabilitySlots.length > 0 && !todaySlots && (
          <div className="im-court-card-legend">
            <span className="im-court-card-legend-item">
              <span className="im-court-card-legend-dot im-court-card-legend-dot--available" />
              {t("common.available")}
            </span>
            <span className="im-court-card-legend-item">
              <span className="im-court-card-legend-dot im-court-card-legend-dot--booked" />
              {t("common.booked")}
            </span>
            <span className="im-court-card-legend-item">
              <span className="im-court-card-legend-dot im-court-card-legend-dot--partial" />
              {t("clubDetail.limited")}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="im-court-card-actions">
        {showBookButton && onBook && (
          <Button
            className={isBookDisabled ? "opacity-60" : ""}
            onClick={() => onBook(court.id)}
            aria-label={`${t("booking.book")} ${court.name}`}
            aria-disabled={isBookDisabled}
            title={isBookDisabled ? bookDisabledTooltip : undefined}
          >
            {t("booking.book")}
          </Button>
        )}
        {showViewSchedule && onViewSchedule && (
          <Button
            variant="outline"
            onClick={() => onViewSchedule(court.id)}
            aria-label={`${t("booking.viewSchedule")} ${court.name}`}
          >
            {t("booking.viewSchedule")}
          </Button>
        )}
      </div>
    </article>
  );
}