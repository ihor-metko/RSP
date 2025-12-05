"use client";

import { useTranslations } from "next-intl";
import { Button, IMLink } from "@/components/ui";
import { isValidImageUrl, getSupabaseStorageUrl } from "@/utils/image";
import type { ClubWithCounts } from "@/types/club";
import "./AdminClubCard.css";

export interface AdminClubCardProps {
  club: ClubWithCounts;
  onEdit?: (club: ClubWithCounts) => void;
  onDelete?: (club: ClubWithCounts) => void;
  /** Whether to show organization info (typically for root admins) */
  showOrganization?: boolean;
}

/**
 * Formats the address for display as "City, Street Address"
 * Returns the full location if city is not available
 */
function formatAddress(city: string | null | undefined, location: string): string {
  if (city && location) {
    if (location.toLowerCase().startsWith(city.toLowerCase())) {
      return location;
    }
    return `${city}, ${location}`;
  }
  return location;
}

/**
 * Parses tags from JSON string or comma-separated string
 */
function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) {
      return parsed.filter((tag): tag is string => typeof tag === "string");
    }
  } catch {
    // If not valid JSON, fall through to comma-separated parsing
  }
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

/**
 * Admin Club Card component - Card-based display for club management
 * Displays key club information with admin actions (view, edit, delete, courts)
 */
export function AdminClubCard({ club, onEdit, onDelete, showOrganization }: AdminClubCardProps) {
  const t = useTranslations();
  
  // Convert stored paths to full Supabase Storage URLs
  const heroImageUrl = getSupabaseStorageUrl(club.heroImage);
  const logoUrl = getSupabaseStorageUrl(club.logo);
  
  // Determine the main image: heroImage first, then logo as fallback
  const mainImage = isValidImageUrl(heroImageUrl) ? heroImageUrl : null;
  const hasLogo = isValidImageUrl(logoUrl);
  const formattedAddress = formatAddress(club.city, club.location);
  const clubTags = parseTags(club.tags);

  return (
    <article className="im-admin-club-card" aria-labelledby={`admin-club-name-${club.id}`}>
      {/* Main Image Section */}
      <div className="im-admin-club-card-image">
        {mainImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={mainImage}
            alt={`${club.name} main image`}
            className="im-admin-club-hero-image"
          />
        ) : hasLogo && logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={logoUrl}
            alt={`${club.name} logo`}
            className="im-admin-club-hero-image im-admin-club-hero-image--logo"
          />
        ) : (
          <div className="im-admin-club-image-placeholder" aria-hidden="true">
            <span className="im-admin-club-image-placeholder-text">
              {club.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="im-admin-club-status">
          <span className={`im-admin-status-badge ${club.isPublic ? "im-admin-status-badge--published" : "im-admin-status-badge--draft"}`}>
            {club.isPublic ? t("common.published") : t("common.draft")}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="im-admin-club-card-content">
        {/* Title */}
        <h2 id={`admin-club-name-${club.id}`} className="im-admin-club-name">
          {club.name}
        </h2>

        {/* Short Description */}
        {club.shortDescription && (
          <p className="im-admin-club-description">
            {club.shortDescription}
          </p>
        )}

        {/* Address */}
        <div 
          className="im-admin-club-address" 
          title={formattedAddress}
          aria-label={`${t("common.address")}: ${formattedAddress}`}
        >
          <svg 
            className="im-admin-club-address-icon" 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="im-admin-club-address-text">{formattedAddress}</span>
        </div>

        {/* Organization and Stats */}
        <div className="im-admin-club-stats">
          {showOrganization && club.organization && (
            <div className="im-admin-club-org">
              <svg 
                className="im-admin-club-org-icon" 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="im-admin-club-org-text">{club.organization.name}</span>
            </div>
          )}
          
          {club.bookingCount !== undefined && club.bookingCount > 0 && (
            <div className="im-admin-club-bookings">
              <svg 
                className="im-admin-club-bookings-icon" 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="im-admin-club-bookings-text">
                {club.bookingCount} {t("admin.clubs.bookings")}
              </span>
            </div>
          )}
          
          {club.admins && club.admins.length > 0 && (
            <div className="im-admin-club-admins">
              <svg 
                className="im-admin-club-admins-icon" 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="im-admin-club-admins-text" title={club.admins.map(a => a.name || a.email).join(", ")}>
                {club.admins.length} {t("admin.clubs.clubAdmins")}
              </span>
            </div>
          )}
        </div>

        {/* Badges Section */}
        <div className="im-admin-club-badges-section">
          {/* Service/Type badges from tags */}
          {clubTags.length > 0 && (
            <div className="im-admin-club-tags" role="list" aria-label="Club services">
              {clubTags.slice(0, 3).map((tag, index) => (
                <span key={index} className="im-admin-badge im-admin-badge-service" role="listitem">
                  {tag}
                </span>
              ))}
              {clubTags.length > 3 && (
                <span className="im-admin-badge im-admin-badge-more" aria-label={`${clubTags.length - 3} more services`}>
                  +{clubTags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Court type badges */}
          <div className="im-admin-club-court-badges" role="list" aria-label="Court types">
            {club.courtCount !== undefined && club.courtCount > 0 ? (
              <>
                {club.indoorCount !== undefined && club.indoorCount > 0 && (
                  <span className="im-admin-badge im-admin-badge-indoor" role="listitem">
                    {club.indoorCount} {t("common.indoor")}
                  </span>
                )}
                {club.outdoorCount !== undefined && club.outdoorCount > 0 && (
                  <span className="im-admin-badge im-admin-badge-outdoor" role="listitem">
                    {club.outdoorCount} {t("common.outdoor")}
                  </span>
                )}
              </>
            ) : (
              <span className="im-admin-badge im-admin-badge-info" role="listitem">
                {t("admin.clubs.noCourts")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="im-admin-club-card-actions">
        <IMLink href={`/admin/clubs/${club.id}`} className="im-admin-club-action-link">
          <Button className="im-admin-view-button" variant="outline" aria-label={`${t("clubs.viewClub")} ${club.name}`}>
            {t("clubs.viewClub")}
          </Button>
        </IMLink>
        <IMLink href={`/admin/clubs/${club.id}/courts`} className="im-admin-club-action-link">
          <Button className="im-admin-courts-button" variant="outline" aria-label={`${t("admin.clubs.courts")} ${club.name}`}>
            {t("admin.clubs.courts")}
          </Button>
        </IMLink>
        {onEdit && (
          <Button
            className="im-admin-edit-button"
            variant="outline"
            onClick={() => onEdit(club)}
            aria-label={`${t("common.edit")} ${club.name}`}
          >
            {t("common.edit")}
          </Button>
        )}
        {onDelete && (
          <Button
            className="im-admin-delete-button"
            variant="outline"
            onClick={() => onDelete(club)}
            aria-label={`${t("common.delete")} ${club.name}`}
          >
            {t("common.delete")}
          </Button>
        )}
      </div>
    </article>
  );
}
