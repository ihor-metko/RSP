"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Modal, Badge } from "@/components/ui";
import { formatDateLong } from "@/utils/date";
import type { AdminUserDetail } from "@/types/adminUser";
import "./UserProfileModal.css";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

// Utility function to check if user is blocked
const isUserBlocked = (userData: AdminUserDetail | null): boolean => {
  if (!userData) return false;
  return userData.blocked || userData.status === "blocked";
};

// Role label mappings
const ROLE_LABELS: Record<string, string> = {
  root_admin: "Root Admin",
  organization_admin: "Organization Admin",
  club_admin: "Club Admin",
  user: "User",
  ORGANIZATION_ADMIN: "Organization Admin",
  CLUB_ADMIN: "Club Admin",
  MEMBER: "Member",
};

// Role badge variant mappings
const ROLE_BADGE_VARIANTS: Record<string, "error" | "info" | "warning" | "default"> = {
  root_admin: "error",
  organization_admin: "info",
  club_admin: "warning",
  user: "default",
  ORGANIZATION_ADMIN: "info",
  CLUB_ADMIN: "warning",
  MEMBER: "default",
};

// Helper functions moved outside component for better performance
const getRoleIcon = (role: string) => {
  switch (role) {
    case "root_admin":
      return <ShieldIcon />;
    case "organization_admin":
    case "ORGANIZATION_ADMIN":
      return <BuildingIcon />;
    case "club_admin":
    case "CLUB_ADMIN":
      return <HomeIcon />;
    default:
      return <UserIcon />;
  }
};

// Icon components
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function UserProfileModal({ isOpen, onClose, userId }: UserProfileModalProps) {
  const t = useTranslations();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !userId) {
      return;
    }

    const fetchUserProfile = async () => {
      setLoading(true);
      setError("");
      
      try {
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) {
          const statusText = response.status === 403 
            ? "You don't have permission to view this user"
            : response.status === 404 
            ? "User not found"
            : `Failed to load user profile (${response.status})`;
          throw new Error(statusText);
        }
        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [isOpen, userId]);

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "-";
    return formatDateLong(dateString);
  };

  // Use translation keys for role labels
  const getRoleLabel = (role: string) => {
    const translationKey = ROLE_LABELS[role];
    if (!translationKey) return role;
    
    // Map to translation keys
    const translationMap: Record<string, string> = {
      "Root Admin": t("users.roles.rootAdmin"),
      "Organization Admin": t("users.roles.organizationAdmin"),
      "Club Admin": t("users.roles.clubAdmin"),
      "User": t("users.roles.user"),
      "Member": t("users.roles.member"),
    };
    
    return translationMap[translationKey] || translationKey;
  };

  const getRoleBadgeVariant = (role: string): "error" | "info" | "warning" | "default" => {
    return ROLE_BADGE_VARIANTS[role] || "default";
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("userProfile.title")}>
      <div className="im-user-profile-modal">
        {loading && (
          <div className="im-user-profile-loading">
            <div className="im-loading-spinner" />
            <span>{t("common.loading")}</span>
          </div>
        )}

        {error && (
          <div className="im-user-profile-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && user && (
          <>
            {/* User Header */}
            <div className="im-user-profile-header">
              <div className="im-user-profile-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="im-user-profile-info">
                <h2 className="im-user-profile-name">{user.name || t("users.unnamed")}</h2>
                <div className="im-user-profile-email">
                  <MailIcon />
                  <span>{user.email}</span>
                </div>
                <div className="im-user-profile-badges">
                  <Badge variant={isUserBlocked(user) ? "error" : "success"}>
                    <span className={`im-status-dot ${isUserBlocked(user) ? "im-status-dot--blocked" : "im-status-dot--active"}`} />
                    {isUserBlocked(user) ? t("users.status.blocked") : t("users.status.active")}
                  </Badge>
                  {user.role && (
                    <Badge variant={getRoleBadgeVariant(user.role)} icon={getRoleIcon(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* User Details */}
            <div className="im-user-profile-details">
              <div className="im-user-profile-section">
                <h3 className="im-user-profile-section-title">{t("userProfile.basicInfo")}</h3>
                <div className="im-user-profile-grid">
                  <div className="im-user-profile-item">
                    <span className="im-user-profile-label">
                      <CalendarIcon />
                      {t("userDetail.stats.memberSince")}
                    </span>
                    <span className="im-user-profile-value">{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="im-user-profile-item">
                    <span className="im-user-profile-label">
                      <ClockIcon />
                      {t("userDetail.stats.lastLogin")}
                    </span>
                    <span className="im-user-profile-value">{formatDate(user.lastLoginAt)}</span>
                  </div>
                  {user.totalBookings !== undefined && (
                    <div className="im-user-profile-item">
                      <span className="im-user-profile-label">
                        <CalendarIcon />
                        {t("userDetail.stats.totalBookings")}
                      </span>
                      <span className="im-user-profile-value">{user.totalBookings}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Organization Memberships */}
              {user.memberships && user.memberships.length > 0 && (
                <div className="im-user-profile-section">
                  <h3 className="im-user-profile-section-title">{t("userProfile.organizations")}</h3>
                  <div className="im-user-profile-list">
                    {user.memberships.map((membership) => (
                      <div key={membership.id} className="im-user-profile-membership">
                        <BuildingIcon />
                        <div className="im-user-profile-membership-info">
                          <span className="im-user-profile-membership-name">
                            {membership.organization.name}
                          </span>
                          <span className="im-user-profile-membership-role">
                            {getRoleLabel(membership.role)}
                            {membership.isPrimaryOwner && ` (${t("orgAdmins.owner")})`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Club Memberships */}
              {user.clubMemberships && user.clubMemberships.length > 0 && (
                <div className="im-user-profile-section">
                  <h3 className="im-user-profile-section-title">{t("userProfile.clubs")}</h3>
                  <div className="im-user-profile-list">
                    {user.clubMemberships.map((membership) => (
                      <div key={membership.id} className="im-user-profile-membership">
                        <HomeIcon />
                        <div className="im-user-profile-membership-info">
                          <span className="im-user-profile-membership-name">
                            {membership.club.name}
                          </span>
                          <span className="im-user-profile-membership-role">
                            {getRoleLabel(membership.role)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
