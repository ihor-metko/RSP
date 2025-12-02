"use client";

import { useTranslations } from "next-intl";
import { Button, IMLink } from "@/components/ui";
import "./ClubsList.css";

export interface PublicClubCardProps {
  club: {
    id: string;
    name: string;
    shortDescription?: string | null;
    location: string;
    city?: string | null;
    contactInfo?: string | null;
    openingHours?: string | null;
    logo?: string | null;
    heroImage?: string | null;
    tags?: string | null;
    indoorCount?: number;
    outdoorCount?: number;
  };
  /** User role for permission-based rendering (player, admin, coach) */
  role?: "player" | "admin" | "coach";
}

function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Formats the address for display as "City, Street Address"
 * Returns the full location if city is not available
 */
function formatAddress(city: string | null | undefined, location: string): string {
  if (city && location) {
    // If location already starts with city, just return location
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
    // If JSON but not an array, fall through to comma-separated parsing
  } catch {
    // If not valid JSON, fall through to comma-separated parsing
  }
  // Fallback: treat as comma-separated string
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

export function PublicClubCard({ club, role = "player" }: PublicClubCardProps) {
  const t = useTranslations();
  
  // Determine the main image: heroImage first, then logo as fallback
  const mainImage = isValidImageUrl(club.heroImage) ? club.heroImage : null;
  const hasLogo = isValidImageUrl(club.logo);
  const formattedAddress = formatAddress(club.city, club.location);
  const clubTags = parseTags(club.tags);

  // Determine the club link based on role
  const getClubLink = () => {
    if (role === "admin") {
      return `/admin/clubs/${club.id}`;
    }
    if (role === "coach") {
      return `/coach/clubs/${club.id}`;
    }
    return `/clubs/${club.id}`;
  };

  return (
    <article className="rsp-club-card rsp-club-card--modern" aria-labelledby={`club-name-${club.id}`}>
      {/* Main Image Section */}
      <div className="rsp-club-card-image">
        {mainImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={mainImage}
            alt={`${club.name} main image`}
            className="rsp-club-hero-image"
          />
        ) : hasLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={club.logo as string}
            alt={`${club.name} logo`}
            className="rsp-club-hero-image rsp-club-hero-image--logo"
          />
        ) : (
          <div className="rsp-club-image-placeholder" aria-hidden="true">
            <span className="rsp-club-image-placeholder-text">
              {club.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="rsp-club-card-content">
        {/* Title */}
        <h2 id={`club-name-${club.id}`} className="rsp-club-name rsp-club-name--title">
          {club.name}
        </h2>

        {/* Short Description */}
        {club.shortDescription && (
          <p className="rsp-club-description">
            {club.shortDescription}
          </p>
        )}

        {/* Address with truncation */}
        <div 
          className="rsp-club-address" 
          title={formattedAddress}
          aria-label={`${t("common.address")}: ${formattedAddress}`}
        >
          <svg 
            className="rsp-club-address-icon" 
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
          <span className="rsp-club-address-text">{formattedAddress}</span>
        </div>

        {/* Badges Section - Club Types/Services and Court Types */}
        <div className="rsp-club-badges-section">
          {/* Service/Type badges from tags */}
          {clubTags.length > 0 && (
            <div className="rsp-club-tags" role="list" aria-label="Club services">
              {clubTags.slice(0, 3).map((tag, index) => (
                <span key={index} className="rsp-badge rsp-badge-service" role="listitem">
                  {tag}
                </span>
              ))}
              {clubTags.length > 3 && (
                <span className="rsp-badge rsp-badge-more" aria-label={`${clubTags.length - 3} more services`}>
                  +{clubTags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Court type badges */}
          {(club.indoorCount !== undefined || club.outdoorCount !== undefined) && (
            <div className="rsp-club-court-badges" role="list" aria-label="Court types">
              {club.indoorCount !== undefined && club.indoorCount > 0 && (
                <span className="rsp-badge rsp-badge-indoor" role="listitem">
                  {club.indoorCount} {t("common.indoor")}
                </span>
              )}
              {club.outdoorCount !== undefined && club.outdoorCount > 0 && (
                <span className="rsp-badge rsp-badge-outdoor" role="listitem">
                  {club.outdoorCount} {t("common.outdoor")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="rsp-club-card-actions">
        <IMLink href={getClubLink()} className="rsp-club-link">
          <Button className="rsp-view-club-button" aria-label={`${t("clubs.viewClub")} ${club.name}`}>
            {t("clubs.viewClub")}
          </Button>
        </IMLink>
      </div>
    </article>
  );
}
