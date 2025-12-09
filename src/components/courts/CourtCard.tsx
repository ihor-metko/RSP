"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button, IMLink } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import { isValidImageUrl, getSupabaseStorageUrl } from "@/utils/image";
import {
  formatTime,
  getSlotStatusClass,
  getStatusLabel,
  calculateAvailabilitySummary,
} from "@/utils/court-card";
import { useUserStore } from "@/stores/useUserStore";
import type { Court, AvailabilitySlot } from "@/types/court";
import type { Club } from "@/types/club";
import type { Organization } from "@/types/organization";
import "../CourtCard.css";

interface CourtCardProps {
  court: Court;
  onBook?: (courtId: string) => void;
  onViewSchedule?: (courtId: string) => void;
  onViewDetails?: (courtId: string) => void;
  onCardClick?: (courtId: string) => void;
  availabilitySlots?: AvailabilitySlot[];
  isLoadingAvailability?: boolean;
  showBookButton?: boolean;
  showViewSchedule?: boolean;
  showViewDetails?: boolean;
  isBookDisabled?: boolean;
  bookDisabledTooltip?: string;
  maxVisibleSlots?: number;
  showLegend?: boolean;
  showAvailabilitySummary?: boolean;
  showDetailedAvailability?: boolean;
  // Admin-only props
  club?: Club; // Only id and name are used. Club link navigates to /admin/clubs/{id}
  organization?: Organization; // Only name is used for display
  isActive?: boolean;
  onEdit?: (courtId: string) => void;
  onDelete?: (courtId: string) => void;
}

export function CourtCard({
  court,
  onBook,
  onViewSchedule,
  onViewDetails,
  onCardClick,
  availabilitySlots = [],
  isLoadingAvailability = false,
  showBookButton = true,
  showViewSchedule = true,
  showViewDetails = false,
  isBookDisabled = false,
  bookDisabledTooltip,
  maxVisibleSlots = 6,
  showLegend = true,
  showAvailabilitySummary = true,
  showDetailedAvailability = true,
  club,
  organization,
  isActive = true,
  onEdit,
  onDelete,
}: CourtCardProps) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Check if user has admin role
  const hasAnyRole = useUserStore((state) => state.hasAnyRole);
  const isAdmin = hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN", "CLUB_ADMIN"]);
  
  // Determine if admin info should be displayed
  const showAdminInfo = isAdmin && (club || organization);

  // Memoize the court image URL to avoid recalculating on every render
  const imageUrl = useMemo(() => getSupabaseStorageUrl(court.imageUrl), [court.imageUrl]);
  const hasImage = useMemo(() => isValidImageUrl(imageUrl), [imageUrl]);

  // Calculate availability summary
  const availabilitySummary = useMemo(
    () => calculateAvailabilitySummary(availabilitySlots),
    [availabilitySlots]
  );

  // Determine which slots to display
  const displaySlots = isExpanded ? availabilitySlots : availabilitySlots.slice(0, maxVisibleSlots);
  const remainingCount = availabilitySlots.length - maxVisibleSlots;
  const hasMoreSlots = remainingCount > 0 && !isExpanded;

  // Handle card click for showing detailed availability
  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(court.id);
    } else if (showDetailedAvailability) {
      setShowDetails(!showDetails);
    }
  };

  // Handle mouse enter/leave for desktop hover
  const handleMouseEnter = () => {
    if (showDetailedAvailability && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setShowDetails(true);
    }
  };

  const handleMouseLeave = () => {
    if (showDetailedAvailability && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setShowDetails(false);
    }
  };

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

  // Render availability summary badge
  const renderAvailabilitySummaryBadge = () => {
    if (!showAvailabilitySummary || availabilitySlots.length === 0) return null;

    const { available, total, status } = availabilitySummary;
    const badgeClass = `im-court-card-availability-badge im-court-card-availability-badge--${status}`;
    
    return (
      <span className={badgeClass} aria-label={`${available} ${t("common.available")} of ${total}`}>
        <span className="im-court-card-availability-badge-count">{available}/{total}</span>
        <span className="im-court-card-availability-badge-label">{t("common.available")}</span>
      </span>
    );
  };

  // Render availability slots
  const renderAvailabilitySlots = () => {
    if (availabilitySlots.length === 0) {
      return (
        <p className="text-sm" style={{ color: "var(--im-muted)" }}>
          {t("court.noAvailabilityData")}
        </p>
      );
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
    <article 
      className={`im-court-card ${showDetails ? "im-court-card--details-visible" : ""}`} 
      aria-label={court.name}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
    >
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

        {/* Availability Summary Badge */}
        {!isLoadingAvailability && (
          <div className="im-court-card-availability-summary">
            {renderAvailabilitySummaryBadge()}
          </div>
        )}

        {/* Name and Price Overlay */}
        <div className="im-court-card-overlay-content">
          <h3 className="im-court-card-name">{court.name}</h3>
          <p className="im-court-card-price">
            {formatPrice(court.defaultPriceCents)} {t("common.perHour")}
          </p>
        </div>
      </div>

      {/* Card Body - Availability (conditionally shown based on showDetails for hover/tap mode) */}
      <div className={`im-court-card-body ${showDetailedAvailability && !showDetails ? "im-court-card-body--collapsed" : ""}`}>
        {/* Admin Info Section - Only visible to admins */}
        {showAdminInfo && (
          <div className="im-court-card-admin-info">
            {/* Organization Info */}
            {organization && (
              <div className="im-court-card-info-item">
                <span className="im-court-card-info-label">
                  {t("sidebar.organizations")}:{" "}
                </span>
                <span className="im-court-card-info-value">{organization.name}</span>
              </div>
            )}

            {/* Club Info */}
            {club && (
              <div className="im-court-card-info-item">
                <span className="im-court-card-info-label">
                  {t("admin.courts.clubLabel")}:{" "}
                </span>
                <IMLink href={`/admin/clubs/${club.id}`} className="im-court-card-info-link">
                  {club.name}
                </IMLink>
              </div>
            )}

            {/* Court Status */}
            <div className="im-court-card-info-item">
              <span className="im-court-card-info-label">
                {t("admin.courts.status")}:{" "}
              </span>
              <span className={isActive ? "im-court-card-status-active" : "im-court-card-status-inactive"}>
                {isActive ? t("admin.courts.active") : t("admin.courts.inactive")}
              </span>
            </div>
          </div>
        )}

        <div className="im-court-card-availability">
          <div className="im-court-card-availability-header">
            <span className="im-court-card-availability-title">
              {t("clubDetail.courtAvailability")}
            </span>
            {availabilitySlots.length > maxVisibleSlots && !isExpanded && (
              <button
                type="button"
                className="im-court-card-availability-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                aria-expanded={false}
              >
                {t("booking.viewSchedule")}
              </button>
            )}
          </div>

          {isLoadingAvailability ? renderAvailabilitySkeleton() : renderAvailabilitySlots()}
        </div>

        {/* Legend */}
        {showLegend && availabilitySlots.length > 0 && (
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
        {showViewDetails && onViewDetails && (
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(court.id);
            }}
            aria-label={`${t("common.viewDetails")} ${court.name}`}
          >
            {t("common.viewDetails")}
          </Button>
        )}
        {showBookButton && onBook && (
          <Button
            className={isBookDisabled ? "opacity-60" : ""}
            onClick={(e) => {
              e.stopPropagation();
              onBook(court.id);
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              onViewSchedule(court.id);
            }}
            aria-label={`${t("booking.viewSchedule")} ${court.name}`}
          >
            {t("booking.viewSchedule")}
          </Button>
        )}
        
        {/* Admin Actions */}
        {showAdminInfo && club && (
          <IMLink
            href={`/admin/clubs/${club.id}/courts/${court.id}/price-rules`}
            className="flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="outline" className="w-full">
              {t("admin.courts.pricing")}
            </Button>
          </IMLink>
        )}
        {onEdit && (
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(court.id);
            }}
            className="flex-1"
          >
            {t("common.edit")}
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(court.id);
            }}
            className="text-red-500 hover:text-red-700 flex-1"
          >
            {t("common.delete")}
          </Button>
        )}
      </div>
    </article>
  );
}
