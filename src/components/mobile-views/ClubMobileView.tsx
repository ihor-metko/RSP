"use client";

import { useTranslations } from "next-intl";
import { Button, EmptyState } from "@/components/ui";
import "./MobileViews.css";

interface ClubMobileViewProps {
  club: {
    id: string;
    name: string;
    shortDescription?: string | null;
    longDescription?: string | null;
    location?: string;
    city?: string | null;
    logoData?: { url: string; altText?: string } | null;
    bannerData?: { url: string; altText?: string } | null;
  };
  hasPublishedCourts: boolean;
  loading?: boolean;
  onCheckAvailability: () => void;
  onQuickBooking: () => void;
}

/**
 * ClubMobileView
 * 
 * Mobile-first club detail page skeleton.
 * Shows club header with name, location.
 * Primary CTA: Check Availability
 * Secondary CTA: Quick Booking (placeholder)
 * Shows empty state if no published courts.
 */
export function ClubMobileView({
  club,
  hasPublishedCourts,
  loading,
  onCheckAvailability,
  onQuickBooking,
}: ClubMobileViewProps) {
  const t = useTranslations();

  if (loading) {
    return (
      <div className="im-mobile-club">
        <div className="im-mobile-club-skeleton">
          <div className="im-mobile-club-skeleton-header" />
          <div className="im-mobile-club-skeleton-content" />
        </div>
      </div>
    );
  }

  return (
    <div className="im-mobile-club">
      {/* Club Header */}
      <div className="im-mobile-club-header">
        {/* Banner Image */}
        {club.bannerData?.url && (
          <div className="im-mobile-club-banner">
            <img
              src={club.bannerData.url}
              alt={club.bannerData.altText || club.name}
              className="im-mobile-club-banner-img"
            />
          </div>
        )}

        {/* Club Info */}
        <div className="im-mobile-club-info">
          {/* Logo */}
          {club.logoData?.url && (
            <div className="im-mobile-club-logo">
              <img
                src={club.logoData.url}
                alt={club.logoData.altText || club.name}
                className="im-mobile-club-logo-img"
              />
            </div>
          )}

          <h1 className="im-mobile-club-name">{club.name}</h1>

          {/* Location */}
          <div className="im-mobile-club-location">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="im-mobile-club-location-icon"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{club.city || club.location}</span>
          </div>

          {/* Description */}
          {club.shortDescription && (
            <p className="im-mobile-club-description">{club.shortDescription}</p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="im-mobile-club-content">
        {!hasPublishedCourts ? (
          <EmptyState
            title={t("clubs.noPublishedCourtsTitle")}
            description={t("clubs.noPublishedCourtsDescription")}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            }
          />
        ) : (
          <>
            {/* Primary CTA */}
            <div className="im-mobile-club-actions">
              <Button
                onClick={onCheckAvailability}
                className="im-mobile-club-primary-btn"
                aria-label={t("clubs.checkAvailability")}
              >
                {t("clubs.checkAvailability")}
              </Button>
            </div>

            {/* Secondary CTA - Quick Booking Placeholder */}
            <div className="im-mobile-club-secondary-actions">
              <Button
                onClick={onQuickBooking}
                variant="outline"
                className="im-mobile-club-secondary-btn"
                aria-label={t("clubs.quickBooking")}
              >
                {t("clubs.quickBooking")}
              </Button>
            </div>

            {/* Long Description */}
            {club.longDescription && (
              <div className="im-mobile-club-details">
                <h2 className="im-mobile-club-details-title">
                  {t("clubDetail.aboutClub")}
                </h2>
                <p className="im-mobile-club-details-text">{club.longDescription}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
