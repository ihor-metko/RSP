"use client";

import { useTranslations } from "next-intl";
import { Button, IMLink } from "@/components/ui";

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
    <div className="tm-club-card">
      <div className="tm-club-card-header">
        {isValidImageUrl(club.logo) ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={club.logo as string}
            alt={`${club.name} logo`}
            className="tm-club-logo"
          />
        ) : (
          <div className="tm-club-logo-placeholder">
            {club.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h2 className="tm-club-name">{club.name}</h2>
      </div>

      <div className="tm-club-details">
        <div className="tm-club-detail-row">
          <span className="tm-club-detail-label">{t("common.address")}:</span>
          <span className="tm-club-detail-value">{club.location}</span>
        </div>
        {club.openingHours && (
          <div className="tm-club-detail-row">
            <span className="tm-club-detail-label">{t("common.hours")}:</span>
            <span className="tm-club-detail-value">{club.openingHours}</span>
          </div>
        )}
        {(club.indoorCount !== undefined || club.outdoorCount !== undefined) && (
          <div className="tm-club-badges mt-2 flex gap-2">
            {club.indoorCount !== undefined && club.indoorCount > 0 && (
              <span className="tm-badge tm-badge-indoor inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {club.indoorCount} {t("common.indoor")}
              </span>
            )}
            {club.outdoorCount !== undefined && club.outdoorCount > 0 && (
              <span className="tm-badge tm-badge-outdoor inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                {club.outdoorCount} {t("common.outdoor")}
              </span>
            )}
          </div>
        )}
      </div>

      <IMLink href={`/clubs/${club.id}`}>
        <Button className="tm-view-courts-button">{t("clubs.viewClub")}</Button>
      </IMLink>
    </div>
  );
}
