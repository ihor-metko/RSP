"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import type { UnifiedDashboardClub } from "@/app/api/admin/unified-dashboard/route";
import "./ClubsPreview.css";

/**
 * Arrow right icon for navigation
 */
function ArrowRightIcon() {
  return (
    <svg
      className="im-clubs-preview-arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/**
 * Club icon
 */
function ClubIcon() {
  return (
    <svg
      className="im-clubs-preview-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

/**
 * ClubsPreview Props
 */
export interface ClubsPreviewProps {
  /** List of clubs to preview */
  clubs: UnifiedDashboardClub[];
  /** Organization ID for building links (optional) */
  organizationId?: string;
  /** Maximum number of clubs to show in preview */
  maxPreview?: number;
  /** Loading state */
  loading?: boolean;
}

/**
 * ClubsPreview Component
 * 
 * Displays a preview of clubs with key metrics.
 * Shows a limited number of clubs on the dashboard with a link to view all.
 * 
 * For Root/Org admins: Shows clubs across their managed scope
 * For Club admins: This component may not be shown as they already see their club metrics
 * 
 * Uses existing Table component from components/ui for consistency.
 * Accessible with proper ARIA attributes.
 */
export default function ClubsPreview({
  clubs,
  organizationId,
  maxPreview = 5,
  loading = false,
}: ClubsPreviewProps) {
  const t = useTranslations();

  // Build the "View All" link
  const viewAllUrl = organizationId
    ? `/admin/orgs/${organizationId}/clubs`
    : "/admin/clubs";

  if (loading) {
    return (
      <div className="im-clubs-preview-section">
        <div className="im-clubs-preview-header">
          <h2 className="im-clubs-preview-title">{t("clubsPreview.title")}</h2>
        </div>
        <div className="im-clubs-preview-loading">
          <div className="im-clubs-preview-skeleton" />
          <div className="im-clubs-preview-skeleton" />
          <div className="im-clubs-preview-skeleton" />
        </div>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="im-clubs-preview-section">
        <div className="im-clubs-preview-header">
          <h2 className="im-clubs-preview-title">{t("clubsPreview.title")}</h2>
        </div>
        <div className="im-clubs-preview-empty">
          <ClubIcon />
          <p className="im-clubs-preview-empty-text">
            {t("clubsPreview.noClubs")}
          </p>
        </div>
      </div>
    );
  }

  const previewClubs = clubs.slice(0, maxPreview);
  const hasMore = clubs.length > maxPreview;

  return (
    <div className="im-clubs-preview-section">
      <div className="im-clubs-preview-header">
        <h2 className="im-clubs-preview-title">{t("clubsPreview.title")}</h2>
        <Link href={viewAllUrl} className="im-clubs-preview-view-all">
          {t("clubsPreview.viewAll")} ({clubs.length})
          <ArrowRightIcon />
        </Link>
      </div>

      <div className="im-clubs-preview-grid">
        {previewClubs.map((club) => (
          <article key={club.id} className="im-clubs-preview-card">
            <div className="im-clubs-preview-card-header">
              <div className="im-clubs-preview-card-icon">
                <ClubIcon />
              </div>
              <div className="im-clubs-preview-card-info">
                <h3 className="im-clubs-preview-card-name">{club.name}</h3>
                {club.organizationName && (
                  <p className="im-clubs-preview-card-org">
                    {club.organizationName}
                  </p>
                )}
              </div>
            </div>

            <div className="im-clubs-preview-card-metrics">
              <div className="im-clubs-preview-metric">
                <span className="im-clubs-preview-metric-label">
                  {t("clubsPreview.courts")}
                </span>
                <span className="im-clubs-preview-metric-value">
                  {club.courtsCount}
                </span>
              </div>
              <div className="im-clubs-preview-metric">
                <span className="im-clubs-preview-metric-label">
                  {t("clubsPreview.bookingsToday")}
                </span>
                <span className="im-clubs-preview-metric-value">
                  {club.bookingsToday}
                </span>
              </div>
            </div>

            <Link
              href={`/admin/clubs/${club.id}`}
              className="im-clubs-preview-card-link"
            >
              {t("clubsPreview.viewDetails")}
              <ArrowRightIcon />
            </Link>
          </article>
        ))}
      </div>

      {hasMore && (
        <div className="im-clubs-preview-footer">
          <Link href={viewAllUrl} className="im-clubs-preview-show-more">
            {t("clubsPreview.showMore", { count: clubs.length - maxPreview })}
            <ArrowRightIcon />
          </Link>
        </div>
      )}
    </div>
  );
}
