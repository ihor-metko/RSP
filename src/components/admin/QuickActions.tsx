"use client";

import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui/IMLink";
import { useUserStore } from "@/stores/useUserStore";
import "./QuickActions.css";

/**
 * Plus icon for quick action buttons
 */
function PlusIcon() {
  return (
    <svg
      className="im-quick-action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/**
 * User plus icon for invite admin button
 */
function UserPlusIcon() {
  return (
    <svg
      className="im-quick-action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

/**
 * Court icon for create court button
 */
function CourtIcon() {
  return (
    <svg
      className="im-quick-action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}

/**
 * QuickActions Props
 */
export interface QuickActionsProps {
  /** Organization ID for org-scoped actions (optional) */
  organizationId?: string;
  /** Club ID for club-scoped actions (optional) */
  clubId?: string;
}

/**
 * QuickActions Component
 * 
 * Displays quick action shortcuts for admin users based on their permissions:
 * - Create Club (Root Admin, Organization Admin)
 * - Invite Admin (Root Admin, Organization Admin)
 * - Create Court (Club Admin with specific club context)
 * 
 * Visibility is controlled by user roles from useUserStore.
 * Uses existing UI components and im-* semantic classes.
 * Accessible with proper ARIA attributes and keyboard navigation.
 */
export default function QuickActions({ organizationId, clubId }: QuickActionsProps) {
  const t = useTranslations();
  const hasRole = useUserStore((state) => state.hasRole);
  // Check user roles
  const isRootAdmin = hasRole("ROOT_ADMIN");
  const isOrgAdmin = hasRole("ORGANIZATION_ADMIN");
  const isClubAdmin = hasRole("CLUB_ADMIN");

  // Determine which actions to show
  const canCreateClub = isRootAdmin || isOrgAdmin;
  const canInviteAdmin = isRootAdmin || isOrgAdmin;
  const canCreateCourt = isClubAdmin && clubId;

  // If no actions are available, don't render
  if (!canCreateClub && !canInviteAdmin && !canCreateCourt) {
    return null;
  }

  // Build action URLs
  const createClubUrl = organizationId 
    ? `/admin/orgs/${organizationId}/clubs/new`
    : "/admin/clubs/new";
  
  const inviteAdminUrl = organizationId
    ? `/admin/orgs/${organizationId}/admins`
    : "/admin/users";
  
  const createCourtUrl = clubId
    ? `/admin/clubs/${clubId}/courts/new`
    : "#";

  return (
    <div className="im-quick-actions-section">
      <h2 className="im-quick-actions-title">
        {t("quickActions.title")}
      </h2>
      <p className="im-quick-actions-description">
        {t("quickActions.description")}
      </p>
      
      <nav className="im-quick-actions-grid" aria-label={t("quickActions.title")}>
        {canCreateClub && (
          <IMLink
            href={createClubUrl}
            className="im-quick-action-card im-quick-action-card--primary"
          >
            <div className="im-quick-action-icon-wrapper">
              <PlusIcon />
            </div>
            <div className="im-quick-action-content">
              <h3 className="im-quick-action-title">
                {t("quickActions.createClub")}
              </h3>
              <p className="im-quick-action-description">
                {t("quickActions.createClubDescription")}
              </p>
            </div>
          </IMLink>
        )}

        {canInviteAdmin && (
          <IMLink
            href={inviteAdminUrl}
            className="im-quick-action-card im-quick-action-card--secondary"
          >
            <div className="im-quick-action-icon-wrapper">
              <UserPlusIcon />
            </div>
            <div className="im-quick-action-content">
              <h3 className="im-quick-action-title">
                {t("quickActions.inviteAdmin")}
              </h3>
              <p className="im-quick-action-description">
                {t("quickActions.inviteAdminDescription")}
              </p>
            </div>
          </IMLink>
        )}

        {canCreateCourt && (
          <IMLink
            href={createCourtUrl}
            className="im-quick-action-card im-quick-action-card--tertiary"
          >
            <div className="im-quick-action-icon-wrapper">
              <CourtIcon />
            </div>
            <div className="im-quick-action-content">
              <h3 className="im-quick-action-title">
                {t("quickActions.createCourt")}
              </h3>
              <p className="im-quick-action-description">
                {t("quickActions.createCourtDescription")}
              </p>
            </div>
          </IMLink>
        )}
      </nav>
    </div>
  );
}
