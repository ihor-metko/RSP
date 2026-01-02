"use client";

import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui/IMLink";
import "./AdminsPanel.css";

/**
 * Arrow right icon
 */
function ArrowRightIcon() {
  return (
    <svg
      className="im-admins-panel-arrow"
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
 * Shield icon for org admins
 */
function ShieldIcon() {
  return (
    <svg
      className="im-admins-panel-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

/**
 * Users icon for club admins
 */
function UsersIcon() {
  return (
    <svg
      className="im-admins-panel-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/**
 * AdminsPanel Props
 */
export interface AdminsPanelProps {
  /** Number of organization/super admins */
  orgAdminsCount: number;
  /** Number of club admins */
  clubAdminsCount: number;
  /** Organization ID for building links (optional) */
  organizationId?: string;
  /** Loading state */
  loading?: boolean;
}

/**
 * AdminsPanel Component
 * 
 * Displays a preview of admin counts with links to manage admins.
 * Shows:
 * - Organization/Super Admins count
 * - Club Admins count
 * 
 * Provides links to admin management pages based on user context.
 * Only shown to Root Admin and Organization Admin roles.
 * 
 * Uses im-* semantic classes for styling.
 * Accessible with proper ARIA attributes.
 */
export default function AdminsPanel({
  orgAdminsCount,
  clubAdminsCount,
  organizationId,
  loading = false,
}: AdminsPanelProps) {
  const t = useTranslations();

  // Build the admin management URLs
  const orgAdminsUrl = organizationId
    ? `/admin/orgs/${organizationId}/admins`
    : "/admin/users";
  
  const clubAdminsUrl = organizationId
    ? `/admin/orgs/${organizationId}/club-admins`
    : "/admin/users?role=club_admin";

  if (loading) {
    return (
      <div className="im-admins-panel-section">
        <h2 className="im-admins-panel-title">{t("adminsPanel.title")}</h2>
        <div className="im-admins-panel-grid">
          <div className="im-admins-panel-skeleton" />
          <div className="im-admins-panel-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="im-admins-panel-section">
      <div className="im-admins-panel-header">
        <h2 className="im-admins-panel-title">{t("adminsPanel.title")}</h2>
        <p className="im-admins-panel-description">
          {t("adminsPanel.description")}
        </p>
      </div>

      <div className="im-admins-panel-grid">
        {/* Organization Admins Card */}
        <article className="im-admins-panel-card im-admins-panel-card--org">
          <div className="im-admins-panel-card-header">
            <div className="im-admins-panel-card-icon-wrapper">
              <ShieldIcon />
            </div>
            <div className="im-admins-panel-card-content">
              <p className="im-admins-panel-card-label">
                {t("adminsPanel.orgAdmins")}
              </p>
              <h3 className="im-admins-panel-card-count">
                {orgAdminsCount.toLocaleString()}
              </h3>
            </div>
          </div>
          <IMLink href={orgAdminsUrl} className="im-admins-panel-card-link">
            {t("adminsPanel.manageAdmins")}
            <ArrowRightIcon />
          </IMLink>
        </article>

        {/* Club Admins Card */}
        <article className="im-admins-panel-card im-admins-panel-card--club">
          <div className="im-admins-panel-card-header">
            <div className="im-admins-panel-card-icon-wrapper">
              <UsersIcon />
            </div>
            <div className="im-admins-panel-card-content">
              <p className="im-admins-panel-card-label">
                {t("adminsPanel.clubAdmins")}
              </p>
              <h3 className="im-admins-panel-card-count">
                {clubAdminsCount.toLocaleString()}
              </h3>
            </div>
          </div>
          <IMLink href={clubAdminsUrl} className="im-admins-panel-card-link">
            {t("adminsPanel.manageAdmins")}
            <ArrowRightIcon />
          </IMLink>
        </article>
      </div>
    </div>
  );
}
