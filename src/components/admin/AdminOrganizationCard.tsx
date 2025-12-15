"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { getSportName, SportType } from "@/constants/sports";
import { isValidImageUrl, getSupabaseStorageUrl } from "@/utils/image";

export interface AdminOrganizationCardProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    createdAt: string;
    clubCount?: number;
    supportedSports?: SportType[];
    logo?: string | null;
    heroImage?: string | null;
    createdBy?: {
      id: string;
      name: string | null;
      email: string;
    };
    superAdmin?: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    superAdmins?: Array<{
      id: string;
      name: string | null;
      email: string;
      isPrimaryOwner: boolean;
    }>;
  };
  /** Callback when View button is clicked */
  onView?: (orgId: string) => void;
}

/**
 * Admin Organization Card component - Card-based display for organization management
 * Displays key organization information with view action to navigate to details page
 */
export function AdminOrganizationCard({
  organization,
  onView,
}: AdminOrganizationCardProps) {
  const t = useTranslations();

  // Find the primary owner
  const primaryOwner = organization.superAdmins?.find((admin) => admin.isPrimaryOwner);
  const ownerInfo = primaryOwner || organization.superAdmins?.[0];

  // Format date for display
  const formattedDate = new Date(organization.createdAt).toLocaleDateString();

  // Convert stored paths to full Supabase Storage URLs
  const heroImageUrl = getSupabaseStorageUrl(organization.heroImage);
  const logoUrl = getSupabaseStorageUrl(organization.logo);

  // Determine the main image: heroImage first, then logo as fallback
  const mainImage = isValidImageUrl(heroImageUrl) ? heroImageUrl : null;
  const hasLogo = isValidImageUrl(logoUrl);

  return (
    <article
      className="im-admin-org-card"
      aria-labelledby={`admin-org-name-${organization.id}`}
    >
      {/* Main Image Section */}
      <div className="im-admin-org-card-image">
        {mainImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={mainImage}
            alt={`Hero image for ${organization.name}`}
            className="im-admin-org-hero-image"
          />
        ) : hasLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={logoUrl as string}
            alt={`Logo for ${organization.name}`}
            className="im-admin-org-hero-image im-admin-org-hero-image--logo"
          />
        ) : (
          <div className="im-admin-org-image-placeholder" aria-hidden="true">
            <span className="im-admin-org-image-placeholder-text">
              {organization.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Status badge based on club count */}
        <div className="im-admin-org-status">
          <span
            className={`im-admin-org-status-badge ${
              (organization.clubCount || 0) > 0
                ? "im-admin-org-status-badge--active"
                : "im-admin-org-status-badge--inactive"
            }`}
          >
            {(organization.clubCount || 0) > 0
              ? t("organizations.active")
              : t("organizations.inactive")}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="im-admin-org-card-content">
        {/* Title */}
        <h2 id={`admin-org-name-${organization.id}`} className="im-admin-org-name">
          {organization.name}
        </h2>

        {/* Description */}
        {organization.description ? (
          <p className="im-admin-org-description">
            {organization.description}
          </p>
        ) : (
          <p className="im-admin-org-description im-admin-org-description--empty">
            {t("organizations.noDescription")}
          </p>
        )}

        {/* Owner Information */}
        <div className="im-admin-org-owner">
          <svg
            className="im-admin-org-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <div className="im-admin-org-owner-content">
            <span className="im-admin-org-owner-label">
              {t("organizations.owner")}
            </span>
            {ownerInfo ? (
              <div className="im-admin-org-owner-info">
                <span className="im-admin-org-owner-name">
                  {ownerInfo.name || ownerInfo.email}
                </span>
                <span className="im-admin-org-owner-email">{ownerInfo.email}</span>
              </div>
            ) : (
              <span className="im-admin-org-no-owner">
                {t("organizations.notAssigned")}
              </span>
            )}
          </div>
        </div>

        {/* Metadata Row */}
        <div className="im-admin-org-meta">
          {/* Clubs Count */}
          <div className="im-admin-org-meta-item">
            <svg
              className="im-admin-org-meta-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="im-admin-org-meta-value">
              {organization.clubCount || 0} {(organization.clubCount || 0) === 1 ? t("admin.club") : t("admin.clubs")}
            </span>
          </div>

          {/* Created Date */}
          <div className="im-admin-org-meta-item">
            <svg
              className="im-admin-org-meta-icon"
              width="16"
              height="16"
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
            <span className="im-admin-org-meta-value">{formattedDate}</span>
          </div>
        </div>

        {/* Supported Sports */}
        {organization.supportedSports && organization.supportedSports.length > 0 && (
          <div className="im-admin-org-sports">
            <span className="im-admin-org-sports-label">{t("organizations.supportedSports")}:</span>
            <div className="im-admin-org-sports-badges">
              {organization.supportedSports.map((sport) => (
                <span key={sport} className="im-admin-org-sport-badge">
                  {getSportName(sport)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="im-admin-org-card-actions">
        {onView && (
          <Button
            variant="outline"
            size="small"
            onClick={() => onView(organization.id)}
            className="im-admin-org-action-btn"
          >
            {t("organizations.viewDetails")}
          </Button>
        )}
      </div>
    </article>
  );
}
