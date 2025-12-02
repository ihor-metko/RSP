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
    <article className="rsp-club-card" aria-labelledby={`club-name-${club.id}`}>
      <header className="rsp-club-card-header">
        {isValidImageUrl(club.logo) ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={club.logo as string}
            alt={`${club.name} logo`}
            className="rsp-club-logo"
          />
        ) : (
          <div className="rsp-club-logo-placeholder" aria-hidden="true">
            {club.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h2 id={`club-name-${club.id}`} className="rsp-club-name">{club.name}</h2>
      </header>

      <div className="rsp-club-details">
        <div className="rsp-club-detail-row">
          <span className="rsp-club-detail-label">{t("common.address")}</span>
          <span className="rsp-club-detail-value">{club.location}</span>
        </div>
        {club.openingHours && (
          <div className="rsp-club-detail-row">
            <span className="rsp-club-detail-label">{t("common.hours")}</span>
            <span className="rsp-club-detail-value">{club.openingHours}</span>
          </div>
        )}
        {(club.indoorCount !== undefined || club.outdoorCount !== undefined) && (
          <div className="rsp-club-badges" role="list" aria-label="Court types">
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

      <IMLink href={`/clubs/${club.id}`}>
        <Button className="rsp-view-club-button">{t("clubs.viewClub")}</Button>
      </IMLink>
    </article>
  );
}
