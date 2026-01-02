"use client";

import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui/IMLink";
import "./OrgHeader.css";

/**
 * Icon for organization settings/menu
 */
function SettingsIcon() {
  return (
    <svg
      className="im-org-header-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * Organization icon for the header
 */
function OrganizationIcon() {
  return (
    <svg
      className="im-org-header-logo"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

export interface OrgHeaderProps {
  /** Organization name */
  orgName: string;
  /** Organization slug */
  orgSlug: string;
  /** Organization ID */
  orgId: string;
  /** Current user name or email */
  userName?: string;
  /** Current user email */
  userEmail?: string;
}

/**
 * OrgHeader Component
 *
 * Displays organization context header for the SuperAdmin dashboard.
 * Shows organization name, slug, and current user info with quick actions.
 *
 * Uses dark theme and im-* semantic classes.
 * Accessible with proper ARIA labels.
 */
export default function OrgHeader({
  orgName,
  orgSlug,
  orgId,
  userName,
  userEmail,
}: OrgHeaderProps) {
  const t = useTranslations();

  return (
    <header className="im-org-header" role="banner">
      <div className="im-org-header-content">
        {/* Organization info */}
        <div className="im-org-header-info">
          <div className="im-org-header-logo-container">
            <OrganizationIcon />
          </div>
          <div className="im-org-header-details">
            <h1 className="im-org-header-name">{orgName}</h1>
            <p className="im-org-header-slug">/{orgSlug}</p>
          </div>
        </div>

        {/* User info and actions */}
        <div className="im-org-header-actions">
          {(userName || userEmail) && (
            <div className="im-org-header-user">
              <span className="im-org-header-user-name">{userName || userEmail}</span>
              <span className="im-org-header-user-role">
                {t("sidebar.roleSuperAdmin")}
              </span>
            </div>
          )}
          <IMLink
            href={`/admin/orgs/${orgId}/settings`}
            className="im-org-header-settings-btn"
            aria-label={t("common.settings")}
          >
            <SettingsIcon />
          </IMLink>
        </div>
      </div>
    </header>
  );
}
