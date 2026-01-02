"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui/IMLink";
import { Button, Modal, Breadcrumbs, Badge, Card, Input } from "@/components/ui";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import { useUserStore } from "@/stores/useUserStore";
import type { AdminUserDetail } from "@/types/adminUser";
import "./page.css";

/* Icon Components */
function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

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

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
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

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
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

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

// Using AdminUserDetail from types

export default function UserDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  // Use store for auth
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const sessionStatus = useUserStore((state) => state.sessionStatus);

  // Get user from store
  const ensureUserById = useAdminUsersStore((state) => state.ensureUserById);
  const blockUserFromStore = useAdminUsersStore((state) => state.blockUser);
  const unblockUserFromStore = useAdminUsersStore((state) => state.unblockUser);
  const loading = useAdminUsersStore((state) => state.loadingDetail);
  
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  // Modal states
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [unblockModalOpen, setUnblockModalOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchUser = useCallback(async () => {
    try {
      const data = await ensureUserById(userId);
      setUser(data);
      setError("");
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("403")) {
          setError(t("userDetail.forbidden"));
        } else if (err.message.includes("404")) {
          setError(t("userDetail.notFound"));
        } else {
          setError(t("userDetail.failedToLoad"));
        }
      } else {
        setError(t("userDetail.failedToLoad"));
      }
    }
  }, [userId, ensureUserById, t]);

  useEffect(() => {
    if (!isHydrated || isLoading) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    fetchUser();
  }, [isLoggedIn, isLoading, router, fetchUser, isHydrated]);

  const handleBlock = async () => {
    if (!user) return;

    // For root-level actions, require email confirmation
    if (user.viewScope === "root" && confirmEmail !== user.email) {
      showToast(t("userDetail.emailMismatch"), "error");
      return;
    }

    setProcessing(true);
    try {
      await blockUserFromStore(userId);
      showToast(t("userDetail.userBlocked"), "success");
      setBlockModalOpen(false);
      setConfirmEmail("");
      fetchUser();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("userDetail.failedToBlock"), "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnblock = async () => {
    if (!user) return;

    setProcessing(true);
    try {
      await unblockUserFromStore(userId);
      showToast(t("userDetail.userUnblocked"), "success");
      setUnblockModalOpen(false);
      fetchUser();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("userDetail.failedToUnblock"), "error");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString(undefined, {
      hour12: false,
    });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      root_admin: t("users.roles.rootAdmin"),
      organization_admin: t("users.roles.organizationAdmin"),
      club_admin: t("users.roles.clubAdmin"),
      user: t("users.roles.user"),
      ORGANIZATION_ADMIN: t("users.roles.organizationAdmin"),
      CLUB_ADMIN: t("users.roles.clubAdmin"),
      MEMBER: t("users.roles.member"),
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string): "error" | "info" | "warning" | "default" => {
    const variants: Record<string, "error" | "info" | "warning" | "default"> = {
      root_admin: "error",
      organization_admin: "info",
      club_admin: "warning",
      user: "default",
      ORGANIZATION_ADMIN: "info",
      CLUB_ADMIN: "warning",
      MEMBER: "default",
    };
    return variants[role] || "default";
  };

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

  const isUserBlocked = user?.blocked || user?.status === "blocked";

  if (sessionStatus === "loading" || loading) {
    return (
      <main className="im-user-detail-page">
        <div className="im-user-detail-loading">
          <div className="im-loading-spinner" />
          <span>{t("common.loading")}</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="im-user-detail-page">
        <section className="rsp-content">
          <Breadcrumbs
            items={[
              { label: t("breadcrumbs.home"), href: "/" },
              { label: t("breadcrumbs.admin"), href: "/admin/dashboard" },
              { label: t("users.breadcrumb"), href: "/admin/users" },
              { label: t("userDetail.breadcrumb") },
            ]}
            className="mb-6"
            ariaLabel={t("breadcrumbs.navigation")}
          />
          <Card className="im-error-card">
            <div className="im-error-content">
              <AlertTriangleIcon />
              <h2>{t("userDetail.errorTitle")}</h2>
              <p>{error}</p>
              <IMLink href="/admin/users">
                <Button variant="outline">
                  <ArrowLeftIcon />
                  {t("userDetail.backToUsers")}
                </Button>
              </IMLink>
            </div>
          </Card>
        </section>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="im-user-detail-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`im-toast im-toast--${toast.type}`} role="alert">
          <span className="im-toast-icon">
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          <span className="im-toast-message">{toast.message}</span>
          <button
            className="im-toast-close"
            onClick={() => setToast(null)}
            aria-label={t("common.close")}
          >
            <XIcon />
          </button>
        </div>
      )}

      <section className="rsp-content">
        <Breadcrumbs
          items={[
            { label: t("breadcrumbs.home"), href: "/" },
            { label: t("breadcrumbs.admin"), href: "/admin/dashboard" },
            { label: t("users.breadcrumb"), href: "/admin/users" },
            { label: user.name || user.email || t("users.unknownUser") },
          ]}
          className="mb-6"
          ariaLabel={t("breadcrumbs.navigation")}
        />

        {/* View Context Banner */}
        {user.viewContext && (
          <div className="im-view-context-banner">
            <span className="im-view-context-label">{t("userDetail.viewingAs")}:</span>
            <Badge variant={user.viewContext.type === "organization" ? "info" : "warning"}>
              {user.viewContext.type === "organization" ? <BuildingIcon /> : <HomeIcon />}
              {user.viewContext.name}
            </Badge>
          </div>
        )}

        {/* User Header */}
        <Card className="im-user-header-card">
          <div className="im-user-header">
            <div className="im-user-header-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="im-user-header-info">
              <div className="im-user-header-name-row">
                <h1 className="im-user-header-name">{user.name || t("users.unnamed")}</h1>
                <Badge variant={isUserBlocked ? "error" : "success"}>
                  <span className={`im-status-dot ${isUserBlocked ? "im-status-dot--blocked" : "im-status-dot--active"}`} />
                  {isUserBlocked ? t("users.status.blocked") : t("users.status.active")}
                </Badge>
              </div>
              <div className="im-user-header-email">
                <MailIcon />
                <span>{user.email}</span>
              </div>
              {user.role && (
                <div className="im-user-header-role">
                  <Badge variant={getRoleBadgeVariant(user.role)} icon={getRoleIcon(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              )}
            </div>
            <div className="im-user-header-actions">
              {user.allowedActions?.canBlock && !isUserBlocked && !user.isRoot && (
                <Button
                  variant="outline"
                  onClick={() => setBlockModalOpen(true)}
                  disabled={processing}
                >
                  <LockIcon />
                  {t("users.actions.block")}
                </Button>
              )}
              {user.allowedActions?.canUnblock && isUserBlocked && (
                <Button
                  variant="outline"
                  onClick={() => setUnblockModalOpen(true)}
                  disabled={processing}
                >
                  <UnlockIcon />
                  {t("users.actions.unblock")}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="im-stats-grid">
          {user.viewScope === "root" && (
            <>
              <Card className="im-stat-card">
                <div className="im-stat-icon im-stat-icon--bookings">
                  <CalendarIcon />
                </div>
                <div className="im-stat-content">
                  <span className="im-stat-value">{user.totalBookings || 0}</span>
                  <span className="im-stat-label">{t("userDetail.stats.totalBookings")}</span>
                </div>
              </Card>
              <Card className="im-stat-card">
                <div className="im-stat-icon im-stat-icon--login">
                  <ClockIcon />
                </div>
                <div className="im-stat-content">
                  <span className="im-stat-value">{formatDate(user.lastLoginAt)}</span>
                  <span className="im-stat-label">{t("userDetail.stats.lastLogin")}</span>
                </div>
              </Card>
              <Card className="im-stat-card">
                <div className="im-stat-icon im-stat-icon--created">
                  <CalendarIcon />
                </div>
                <div className="im-stat-content">
                  <span className="im-stat-value">{formatDate(user.createdAt)}</span>
                  <span className="im-stat-label">{t("userDetail.stats.memberSince")}</span>
                </div>
              </Card>
            </>
          )}
          {user.viewScope === "organization" && (
            <>
              <Card className="im-stat-card">
                <div className="im-stat-icon im-stat-icon--bookings">
                  <CalendarIcon />
                </div>
                <div className="im-stat-content">
                  <span className="im-stat-value">{user.bookingsCount_in_org || 0}</span>
                  <span className="im-stat-label">{t("userDetail.stats.bookingsInOrg")}</span>
                </div>
              </Card>
              <Card className="im-stat-card">
                <div className="im-stat-icon im-stat-icon--login">
                  <ClockIcon />
                </div>
                <div className="im-stat-content">
                  <span className="im-stat-value">{formatDate(user.lastBookingAt_in_org)}</span>
                  <span className="im-stat-label">{t("userDetail.stats.lastBookingInOrg")}</span>
                </div>
              </Card>
            </>
          )}
          {user.viewScope === "club" && (
            <Card className="im-stat-card">
              <div className="im-stat-icon im-stat-icon--login">
                <ClockIcon />
              </div>
              <div className="im-stat-content">
                <span className="im-stat-value">{formatDate(user.lastBookingAt_in_club)}</span>
                <span className="im-stat-label">{t("userDetail.stats.lastBookingInClub")}</span>
              </div>
            </Card>
          )}
        </div>

        <div className="im-detail-grid">
          {/* Recent Bookings */}
          <Card className="im-detail-card">
            <h3 className="im-detail-card-title">
              <CalendarIcon />
              {t("userDetail.sections.recentBookings")}
            </h3>
            <div className="im-bookings-list">
              {user.viewScope === "root" && user.bookings && user.bookings.length > 0 ? (
                user.bookings.map((booking) => (
                  <div key={booking.id} className="im-booking-item">
                    <div className="im-booking-info">
                      <span className="im-booking-venue">
                        {booking.court.club?.name} - {booking.court.name}
                      </span>
                      <span className="im-booking-date">{formatDateTime(booking.start)}</span>
                    </div>
                    <Badge variant={booking.status === "paid" ? "success" : "default"} size="small">
                      {booking.status}
                    </Badge>
                  </div>
                ))
              ) : user.viewScope === "organization" && user.recentBookings_in_org && user.recentBookings_in_org.length > 0 ? (
                user.recentBookings_in_org.map((booking) => (
                  <div key={booking.id} className="im-booking-item">
                    <div className="im-booking-info">
                      <span className="im-booking-venue">
                        {booking.court.club?.name || t("common.unknown")} - {booking.court.name}
                      </span>
                      <span className="im-booking-date">{formatDateTime(booking.start)}</span>
                    </div>
                    <Badge variant={booking.status === "paid" ? "success" : "default"} size="small">
                      {booking.status}
                    </Badge>
                  </div>
                ))
              ) : user.viewScope === "club" && user.bookings_in_club && user.bookings_in_club.length > 0 ? (
                user.bookings_in_club.map((booking) => (
                  <div key={booking.id} className="im-booking-item">
                    <div className="im-booking-info">
                      <span className="im-booking-venue">{booking.court.name}</span>
                      <span className="im-booking-date">{formatDateTime(booking.start)}</span>
                    </div>
                    <Badge variant={booking.status === "paid" ? "success" : "default"} size="small">
                      {booking.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="im-empty-list">{t("userDetail.noBookings")}</p>
              )}
            </div>
          </Card>

          {/* Organizations (Root only) */}
          {user.viewScope === "root" && user.memberships && user.memberships.length > 0 && (
            <Card className="im-detail-card">
              <h3 className="im-detail-card-title">
                <BuildingIcon />
                {t("userDetail.sections.organizations")}
              </h3>
              <div className="im-details-list">
                {user.memberships.map((m) => (
                  <div key={m.id} className="im-details-list-item">
                    <IMLink href={`/admin/organizations/${m.organization.id}`} className="im-link">
                      {m.organization.name}
                    </IMLink>
                    <Badge variant="info" size="small">
                      {getRoleLabel(m.role)} {m.isPrimaryOwner && `(${t("organizations.owner")})`}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Clubs (Root only) */}
          {user.viewScope === "root" && user.clubMemberships && user.clubMemberships.length > 0 && (
            <Card className="im-detail-card">
              <h3 className="im-detail-card-title">
                <HomeIcon />
                {t("userDetail.sections.clubs")}
              </h3>
              <div className="im-details-list">
                {user.clubMemberships.map((m) => (
                  <div key={m.id} className="im-details-list-item">
                    <IMLink href={`/admin/clubs/${m.club.id}`} className="im-link">
                      {m.club.name}
                    </IMLink>
                    <Badge variant="warning" size="small">
                      {getRoleLabel(m.role)}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Audit Log (Root only) */}
          {user.viewScope === "root" && user.auditSummary && user.auditSummary.length > 0 && (
            <Card className="im-detail-card im-detail-card--full">
              <h3 className="im-detail-card-title">
                <ActivityIcon />
                {t("userDetail.sections.auditLog")}
              </h3>
              <div className="im-audit-list">
                {user.auditSummary.map((entry) => (
                  <div key={entry.id} className="im-audit-item">
                    <div className="im-audit-action">
                      <Badge variant="default" size="small">
                        {entry.action}
                      </Badge>
                    </div>
                    <span className="im-audit-date">{formatDateTime(entry.createdAt)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Back Button */}
        <div className="im-back-button-container">
          <IMLink href="/admin/users">
            <Button variant="outline">
              <ArrowLeftIcon />
              {t("userDetail.backToUsers")}
            </Button>
          </IMLink>
        </div>
      </section>

      {/* Block Confirmation Modal */}
      <Modal
        isOpen={blockModalOpen}
        onClose={() => {
          setBlockModalOpen(false);
          setConfirmEmail("");
        }}
        title={t("userDetail.blockModal.title")}
      >
        <div className="im-modal-content im-confirm-modal">
          <div className="im-confirm-icon im-confirm-icon--warning">
            <LockIcon />
          </div>
          <p className="im-confirm-message">
            {t("userDetail.blockModal.message", { name: user.name || user.email || t("users.unknownUser") })}
          </p>
          {user.viewScope === "root" && (
            <div className="im-confirm-input">
              <label className="im-confirm-input-label">
                {t("userDetail.blockModal.confirmLabel")}
              </label>
              <Input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={user.email ?? undefined}
              />
              <p className="im-confirm-input-hint">
                {t("userDetail.blockModal.confirmHint", { email: user.email ?? "" })}
              </p>
            </div>
          )}
          <div className="im-modal-footer">
            <Button
              variant="outline"
              onClick={() => {
                setBlockModalOpen(false);
                setConfirmEmail("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleBlock}
              disabled={processing || (user.viewScope === "root" && confirmEmail !== user.email)}
            >
              {processing ? t("common.processing") : t("users.actions.block")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unblock Confirmation Modal */}
      <Modal
        isOpen={unblockModalOpen}
        onClose={() => setUnblockModalOpen(false)}
        title={t("userDetail.unblockModal.title")}
      >
        <div className="im-modal-content im-confirm-modal">
          <div className="im-confirm-icon im-confirm-icon--success">
            <UnlockIcon />
          </div>
          <p className="im-confirm-message">
            {t("userDetail.unblockModal.message", { name: user.name || user.email || t("users.unknownUser") })}
          </p>
          <div className="im-modal-footer">
            <Button variant="outline" onClick={() => setUnblockModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUnblock} disabled={processing}>
              {processing ? t("common.processing") : t("users.actions.unblock")}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
