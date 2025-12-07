"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

export interface AdminOrganizationCardProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    clubCount: number;
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
  /** Whether user can edit this organization */
  canEdit?: boolean;
  /** Whether user can delete this organization */
  canDelete?: boolean;
  /** Whether user can manage admins */
  canManageAdmins?: boolean;
  /** Callback when View button is clicked */
  onView?: (orgId: string) => void;
  /** Callback when Edit button is clicked */
  onEdit?: () => void;
  /** Callback when Delete button is clicked */
  onDelete?: () => void;
  /** Callback when Manage Admins button is clicked */
  onManageAdmins?: () => void;
  /** Callback when Add Admin button is clicked */
  onAddAdmin?: () => void;
}

/**
 * Admin Organization Card component - Card-based display for organization management
 * Displays key organization information with admin actions (view, edit, delete, manage admins)
 */
export function AdminOrganizationCard({
  organization,
  canEdit = false,
  canDelete = false,
  canManageAdmins = false,
  onView,
  onEdit,
  onDelete,
  onManageAdmins,
  onAddAdmin,
}: AdminOrganizationCardProps) {
  const t = useTranslations();

  // Find the primary owner
  const primaryOwner = organization.superAdmins?.find((admin) => admin.isPrimaryOwner);
  const ownerInfo = primaryOwner || organization.superAdmins?.[0];

  // Format date for display
  const formattedDate = new Date(organization.createdAt).toLocaleDateString();

  return (
    <article
      className="im-admin-org-card"
      aria-labelledby={`admin-org-name-${organization.id}`}
    >
      {/* Card Header */}
      <div className="im-admin-org-card-header">
        <div className="im-admin-org-card-header-content">
          <h2 id={`admin-org-name-${organization.id}`} className="im-admin-org-name">
            {organization.name}
          </h2>
          <p className="im-admin-org-slug">{organization.slug}</p>
        </div>
        
        {/* Status badge based on club count */}
        <div className="im-admin-org-status">
          <span
            className={`im-admin-org-status-badge ${
              organization.clubCount > 0
                ? "im-admin-org-status-badge--active"
                : "im-admin-org-status-badge--inactive"
            }`}
          >
            {organization.clubCount > 0
              ? t("organizations.active")
              : t("organizations.inactive")}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="im-admin-org-card-content">
        {/* Owner Information */}
        {ownerInfo ? (
          <div className="im-admin-org-owner">
            <div className="im-admin-org-owner-label">
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
              <span className="im-admin-org-label-text">
                {primaryOwner ? t("organizations.owner") : t("organizations.superAdmin")}:
              </span>
            </div>
            <div className="im-admin-org-owner-info">
              <span className="im-admin-org-owner-name">
                {ownerInfo.name || ownerInfo.email}
              </span>
              <span className="im-admin-org-owner-email">{ownerInfo.email}</span>
            </div>
          </div>
        ) : (
          <div className="im-admin-org-owner">
            <span className="im-admin-org-no-owner">
              {t("organizations.notAssigned")}
            </span>
          </div>
        )}

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
              {organization.clubCount} {organization.clubCount === 1 ? t("admin.club") : t("admin.clubs")}
            </span>
          </div>

          {/* Admins Count */}
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
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="im-admin-org-meta-value">
              {organization.superAdmins?.length || 0} {t("organizations.superAdmins")}
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

        {canEdit && onEdit && (
          <Button
            variant="outline"
            size="small"
            onClick={onEdit}
            className="im-admin-org-action-btn"
          >
            {t("common.edit")}
          </Button>
        )}

        {canManageAdmins && organization.superAdmins && organization.superAdmins.length > 0 && onManageAdmins && (
          <Button
            variant="outline"
            size="small"
            onClick={onManageAdmins}
            className="im-admin-org-action-btn"
          >
            {t("organizations.manageAdmins")}
          </Button>
        )}

        {canEdit && onAddAdmin && (
          <Button
            variant="outline"
            size="small"
            onClick={onAddAdmin}
            className="im-admin-org-action-btn"
          >
            {t("organizations.addAdmin")}
          </Button>
        )}

        {canDelete && onDelete && (
          <Button
            variant="danger"
            size="small"
            onClick={onDelete}
            className="im-admin-org-action-btn"
            disabled={organization.clubCount > 0}
          >
            {t("common.delete")}
          </Button>
        )}
      </div>
    </article>
  );
}
