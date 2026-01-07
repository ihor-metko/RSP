"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui";
import { CardListSkeleton } from "@/components/ui/skeletons";
import type { Address } from "@/types/address";
import { formatAddress } from "@/types/address";
import "./MobileViews.css";

interface Club {
  id: string;
  name: string;
  shortDescription?: string | null;
  address?: Address | null;
  logoData?: { url: string; altText?: string; thumbnailUrl?: string } | null;
  publishedCourtsCount?: number;
}

interface ClubsMobileViewProps {
  clubs: Club[];
  loading: boolean;
  error?: string;
  onClubClick: (clubId: string) => void;
}

/**
 * ClubsMobileView
 *
 * Mobile-first vertical list of clubs.
 * Shows only clubs with published courts.
 * Displays skeleton loaders while loading.
 */
export function ClubsMobileView({
  clubs,
  loading,
  error,
  onClubClick,
}: ClubsMobileViewProps) {
  const t = useTranslations();

  if (loading && clubs.length === 0) {
    return (
      <div className="im-mobile-clubs">
        <div className="im-mobile-clubs-header">
          <h1 className="im-mobile-clubs-title">{t("clubs.title")}</h1>
          <p className="im-mobile-clubs-subtitle">{t("clubs.subtitle")}</p>
        </div>
        <CardListSkeleton count={4} variant="default" />
      </div>
    );
  }

  if (error && clubs.length === 0) {
    return (
      <div className="im-mobile-clubs">
        <div className="im-mobile-clubs-header">
          <h1 className="im-mobile-clubs-title">{t("common.error")}</h1>
        </div>
        <EmptyState
          title={t("common.error")}
          description={error}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="im-mobile-clubs">
        <div className="im-mobile-clubs-header">
          <h1 className="im-mobile-clubs-title">{t("clubs.title")}</h1>
          <p className="im-mobile-clubs-subtitle">{t("clubs.subtitle")}</p>
        </div>
        <EmptyState
          title={t("clubs.noClubs")}
          description={t("clubs.noClubsDescription")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          }
        />
      </div>
    );
  }

  return (
    <div className="im-mobile-clubs">
      <div className="im-mobile-clubs-header">
        <h1 className="im-mobile-clubs-title">{t("clubs.title")}</h1>
        <p className="im-mobile-clubs-subtitle">{t("clubs.subtitle")}</p>
      </div>

      {/* Vertical card list */}
      <div className="im-mobile-clubs-list">
        {clubs.map((club) => {
          const formattedAddress = formatAddress(club.address);

          return (
            <button
              key={club.id}
              className="im-mobile-club-card"
              onClick={() => onClubClick(club.id)}
              aria-label={`${t("clubs.viewClub")} ${club.name}`}
            >
              {/* Club Logo */}
              {club.logoData?.url && (
                <div className="im-mobile-club-card-logo">
                  <img
                    src={club.logoData.url}
                    alt={club.logoData.altText || club.name}
                    className="im-mobile-club-card-logo-img"
                  />
                </div>
              )}

              {/* Club Info */}
              <div className="im-mobile-club-card-content">
                <h2 className="im-mobile-club-card-name">{club.name}</h2>
                {club.shortDescription && (
                  <p className="im-mobile-club-card-description">
                    {club.shortDescription}
                  </p>
                )}
                <div className="im-mobile-club-card-location">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="im-mobile-club-card-location-icon"
                    aria-hidden="true"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{formattedAddress || t("clubs.noAddress")}</span>
                </div>

                {/* Available Courts Badge */}
                <div className="im-mobile-club-card-badge">
                  <span className="im-mobile-club-card-badge-text">
                    {t("clubs.availableCourts")}
                  </span>
                </div>
              </div>

              {/* Arrow indicator */}
              <div className="im-mobile-club-card-arrow">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <polyline points="9,18 15,12 9,6" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
