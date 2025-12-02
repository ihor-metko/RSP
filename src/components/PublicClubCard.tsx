"use client";

import { useTranslations } from "next-intl";
import { Button, IMLink } from "@/components/ui";
import "./ClubsList.css";

interface PublicClubCardProps {
  club: {
    id: string;
    name: string;
    location: string;
    contactInfo?: string | null;
    openingHours?: string | null;
    logo?: string | null;
    indoorCount?: number;
    outdoorCount?: number;
  };
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

export function PublicClubCard({ club }: PublicClubCardProps) {
  const t = useTranslations();

  return (
    <article className="im-club-card" aria-labelledby={`club-name-${club.id}`}>
      <div className="im-club-card-header">
        {isValidImageUrl(club.logo) ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={club.logo as string}
            alt={`${club.name} logo`}
            className="im-club-logo"
          />
        ) : (
          <div className="im-club-logo-placeholder" aria-hidden="true">
            {club.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h2 id={`club-name-${club.id}`} className="im-club-name">{club.name}</h2>
      </div>

      <div className="im-club-details">
        <div className="im-club-detail-row">
          <span className="im-club-detail-label">{t("common.address")}:</span>
          <span className="im-club-detail-value">{club.location}</span>
        </div>
        {club.openingHours && (
          <div className="im-club-detail-row">
            <span className="im-club-detail-label">{t("common.hours")}:</span>
            <span className="im-club-detail-value">{club.openingHours}</span>
          </div>
        )}
        {(club.indoorCount !== undefined || club.outdoorCount !== undefined) && (
          <div className="im-club-badges">
            {club.indoorCount !== undefined && club.indoorCount > 0 && (
              <span className="im-badge im-badge-indoor">
                {club.indoorCount} {t("common.indoor")}
              </span>
            )}
            {club.outdoorCount !== undefined && club.outdoorCount > 0 && (
              <span className="im-badge im-badge-outdoor">
                {club.outdoorCount} {t("common.outdoor")}
              </span>
            )}
          </div>
        )}
      </div>

      <IMLink href={`/clubs/${club.id}`} aria-label={`${t("clubs.viewClub")}: ${club.name}`}>
        <Button className="im-view-club-button">{t("clubs.viewClub")}</Button>
      </IMLink>
    </article>
  );
}
