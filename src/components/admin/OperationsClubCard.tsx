"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { isValidImageUrl, getSupabaseStorageUrl } from "@/utils/image";
import { getSportName } from "@/constants/sports";
import type { ClubWithCounts } from "@/types/club";
import "./AdminClubCard.css";

export interface OperationsClubCardProps {
  club: ClubWithCounts;
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
 * Operations Club Card - Clickable card for selecting a club in Operations page
 * On click, navigates to the operations page with the selected club
 */
export function OperationsClubCard({ club }: OperationsClubCardProps) {
  const t = useTranslations();
  const router = useRouter();

  // Convert stored paths to full Supabase Storage URLs
  const heroImageUrl = getSupabaseStorageUrl(club.heroImage);
  const logoUrl = getSupabaseStorageUrl(club.logo);

  // Determine the main image: heroImage first, then logo as fallback
  const mainImage = isValidImageUrl(heroImageUrl) ? heroImageUrl : null;
  const hasLogo = isValidImageUrl(logoUrl);
  const formattedAddress = formatAddress(club.city, club.location);
  const clubTags = parseTags(club.tags);

  const handleClick = () => {
    router.push(`/admin/operations?clubId=${club.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      className="im-admin-club-card"
      aria-labelledby={`operations-club-name-${club.id}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      style={{ cursor: "pointer" }}
    >
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
        <h2 id={`operations-club-name-${club.id}`} className="im-admin-club-name">
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

          {/* Supported Sports */}
          {club.supportedSports && club.supportedSports.length > 0 && (
            <div className="im-admin-club-sports" role="list" aria-label={t("admin.clubs.supportedSports")}>
              {club.supportedSports.map((sport) => (
                <span key={sport} className="im-admin-badge im-admin-badge-sport" role="listitem">
                  {getSportName(sport)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
