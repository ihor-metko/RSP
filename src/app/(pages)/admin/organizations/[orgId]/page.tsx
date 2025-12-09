"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, PageHeader } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import type { SimpleUser } from "@/types/adminUser";
import "./page.css";

interface SuperAdmin extends User {
  isPrimaryOwner: boolean;
  membershipId: string;
}

interface ClubAdmin {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  clubId: string;
  clubName: string;
}

interface ClubPreview {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  isPublic: boolean;
  courtCount: number;
  adminCount: number;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  action: string;
  actor: { id: string; name: string | null; email: string | null };
  detail: Record<string, unknown> | null;
  createdAt: string;
}

interface UserPreview {
  id: string;
  name: string | null;
  email: string;
  lastLoginAt: string | null;
  lastBookingAt: string;
}

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  address: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  superAdmins: SuperAdmin[];
  primaryOwner: SuperAdmin | null;
  metrics: {
    totalClubs: number;
    totalCourts: number;
    activeBookings: number;
    activeUsers: number;
  };
  clubsPreview: ClubPreview[];
  clubAdmins: ClubAdmin[];
  recentActivity: ActivityItem[];
}

interface UsersPreviewData {
  items: UserPreview[];
  summary: { totalUsers: number; activeToday: number };
}

interface SearchedUser {
  id: string;
  name: string | null;
  email: string;
  isOrgAdmin: boolean;
}

/**
 * Helper to get user initials for avatar display
 */
function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

export default function OrganizationDetailPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;

  // Use Zustand store
  const updateOrganization = useOrganizationStore((state) => state.updateOrganization);
  const deleteOrganization = useOrganizationStore((state) => state.deleteOrganization);
  const setCurrentOrg = useOrganizationStore((state) => state.setCurrentOrg);

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [usersPreview, setUsersPreview] = useState<UsersPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);

  // Reassign owner modal
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignMode, setReassignMode] = useState<"existing" | "new">("existing");
  const simpleUsers = useAdminUsersStore((state) => state.simpleUsers);
  const fetchSimpleUsers = useAdminUsersStore((state) => state.fetchSimpleUsers);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [reassignError, setReassignError] = useState("");
  const [reassigning, setReassigning] = useState(false);

  // Archive modal
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [archiving, setArchiving] = useState(false);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const isRoot = session?.user?.isRoot ?? false;

  const fetchOrgDetail = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch full org details from API (includes metrics, activity, etc.)
      const response = await fetch(`/api/orgs/${orgId}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch organization");
      }
      const data = await response.json();
      setOrg(data);
      setError("");
      
      // Update the store's currentOrg with the fetched data (avoid redundant API call)
      // Extract Organization-compatible fields from the full org detail response
      const { id, name, slug, createdAt, updatedAt, archivedAt, contactEmail, contactPhone, website, address } = data;
      setCurrentOrg({
        id,
        name,
        slug,
        createdAt,
        updatedAt,
        archivedAt,
        contactEmail,
        contactPhone,
        website,
        address,
      });
    } catch {
      setError(t("orgDetail.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [orgId, router, t, setCurrentOrg]);

  const fetchUsersPreview = useCallback(async () => {
    try {
      const response = await fetch(`/api/orgs/${orgId}/users?limit=5`);
      if (response.ok) {
        const data = await response.json();
        setUsersPreview(data);
      }
    } catch {
      // Silent fail
    }
  }, [orgId]);

  const fetchUsers = useCallback(async (query: string = "") => {
    try {
      await fetchSimpleUsers(query);
    } catch {
      // Silent fail for user search
    }
  }, [fetchSimpleUsers]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }
    fetchOrgDetail();
    fetchUsersPreview();
  }, [session, status, router, fetchOrgDetail, fetchUsersPreview]);

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isReassignModalOpen && reassignMode === "existing") {
        fetchUsers(userSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, isReassignModalOpen, reassignMode, fetchUsers]);

  // Edit handlers
  const handleOpenEditModal = () => {
    if (!org) return;
    setEditName(org.name);
    setEditSlug(org.slug);
    setEditContactEmail(org.contactEmail || "");
    setEditContactPhone(org.contactPhone || "");
    setEditWebsite(org.website || "");
    setEditAddress(org.address || "");
    setEditError("");
    setIsEditModalOpen(true);
  };

  const handleEditOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditing(true);

    try {
      await updateOrganization(orgId, {
        name: editName,
        slug: editSlug,
        contactEmail: editContactEmail,
        contactPhone: editContactPhone,
        website: editWebsite,
        address: editAddress,
      });

      showToast(t("orgDetail.updateSuccess"), "success");
      setIsEditModalOpen(false);
      fetchOrgDetail();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update organization");
    } finally {
      setEditing(false);
    }
  };

  // Reassign owner handlers
  const handleOpenReassignModal = () => {
    setReassignMode("existing");
    setUserSearch("");
    setSelectedUserId("");
    setNewOwnerName("");
    setNewOwnerEmail("");
    setReassignError("");
    setIsReassignModalOpen(true);
    fetchUsers();
  };

  const handleReassignOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setReassignError("");
    setReassigning(true);

    try {
      const payload =
        reassignMode === "new"
          ? { email: newOwnerEmail, name: newOwnerName }
          : { userId: selectedUserId };

      const response = await fetch(`/api/orgs/${orgId}/reassign-superadmin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reassign owner");
      }

      showToast(t("orgDetail.ownerReassigned"), "success");
      setIsReassignModalOpen(false);
      fetchOrgDetail();
    } catch (err) {
      setReassignError(err instanceof Error ? err.message : "Failed to reassign owner");
    } finally {
      setReassigning(false);
    }
  };

  // Archive handlers
  const handleArchive = async () => {
    setArchiveError("");
    setArchiving(true);

    try {
      const response = await fetch(`/api/orgs/${orgId}/archive`, {
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to archive organization");
      }

      showToast(t("orgDetail.archiveSuccess"), "success");
      setIsArchiveModalOpen(false);
      fetchOrgDetail();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "Failed to archive organization");
    } finally {
      setArchiving(false);
    }
  };

  // Delete handlers
  const handleDelete = async () => {
    if (!org || deleteConfirmSlug.toLowerCase() !== org.slug.toLowerCase()) {
      setDeleteError(t("orgDetail.slugMismatch"));
      return;
    }

    setDeleteError("");
    setDeleting(true);

    try {
      await deleteOrganization(orgId, org.slug);

      showToast(t("orgDetail.deleteSuccess"), "success");
      router.push("/admin/organizations");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete organization");
    } finally {
      setDeleting(false);
    }
  };

  // Format action name for display
  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      "org.create": t("orgDetail.actions.create"),
      "org.update": t("orgDetail.actions.update"),
      "org.archive": t("orgDetail.actions.archive"),
      "org.delete": t("orgDetail.actions.delete"),
      "org.reassign_owner": t("orgDetail.actions.reassignOwner"),
      "org.assign_admin": t("orgDetail.actions.assignAdmin"),
      "org.remove_admin": t("orgDetail.actions.removeAdmin"),
    };
    return actionMap[action] || action;
  };

  if (status === "loading" || loading) {
    return (
      <main className="im-org-detail-page">
        <div className="im-org-detail-loading">
          <div className="im-org-detail-loading-spinner" />
          <span className="im-org-detail-loading-text">{t("common.loading")}</span>
        </div>
      </main>
    );
  }

  if (error || !org) {
    return (
      <main className="im-org-detail-page">
        <div className="im-org-detail-error">
          <p>{error || t("orgDetail.notFound")}</p>
          <Button onClick={() => router.push("/admin/organizations")}>
            {t("common.backToDashboard")}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="im-org-detail-page">
      <PageHeader
        title={org.name}
        description={org.archivedAt ? t("orgDetail.archived") : org.slug}
        actions={
          <div className="im-org-detail-header-actions">
            <Button variant="outline" onClick={handleOpenEditModal} disabled={!!org.archivedAt}>
              {t("common.edit")}
            </Button>
            {isRoot && (
              <>
                <Button variant="outline" onClick={handleOpenReassignModal} disabled={!!org.archivedAt}>
                  {t("orgDetail.reassignOwner")}
                </Button>
                {!org.archivedAt && (
                  <Button variant="outline" onClick={() => setIsArchiveModalOpen(true)}>
                    {t("orgDetail.archive")}
                  </Button>
                )}
                <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
                  {t("common.delete")}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Toast */}
      {toast && (
        <div className={`im-toast im-toast--${toast.type}`}>{toast.message}</div>
      )}

      <section className="im-org-detail-content">
        {/* Organization Info Card */}
        <div className="im-section-card im-org-detail-content--full">
          <div className="im-section-header">
            <div className="im-section-icon im-section-icon--info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <h2 className="im-section-title">{t("orgDetail.info")}</h2>
          </div>
          <div className="im-org-info-grid">
            <div className="im-org-info-item">
              <span className="im-org-info-label">{t("orgDetail.slug")}</span>
              <span className="im-org-info-value">{org.slug}</span>
            </div>
            <div className="im-org-info-item">
              <span className="im-org-info-label">{t("orgDetail.createdBy")}</span>
              <span className="im-org-info-value">
                {org.createdBy.name || org.createdBy.email}
              </span>
            </div>
            <div className="im-org-info-item">
              <span className="im-org-info-label">{t("orgDetail.createdAt")}</span>
              <span className="im-org-info-value">
                {new Date(org.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="im-org-info-item">
              <span className="im-org-info-label">{t("orgDetail.lastUpdated")}</span>
              <span className="im-org-info-value">
                {new Date(org.updatedAt).toLocaleDateString()}
              </span>
            </div>
            {org.contactEmail && (
              <div className="im-org-info-item">
                <span className="im-org-info-label">{t("common.email")}</span>
                <span className="im-org-info-value">{org.contactEmail}</span>
              </div>
            )}
            {org.contactPhone && (
              <div className="im-org-info-item">
                <span className="im-org-info-label">{t("orgDetail.phone")}</span>
                <span className="im-org-info-value">{org.contactPhone}</span>
              </div>
            )}
            {org.website && (
              <div className="im-org-info-item">
                <span className="im-org-info-label">{t("orgDetail.website")}</span>
                <span className="im-org-info-value">
                  <a href={org.website} target="_blank" rel="noopener noreferrer">
                    {org.website}
                  </a>
                </span>
              </div>
            )}
            {org.address && (
              <div className="im-org-info-item im-org-info-item--full">
                <span className="im-org-info-label">{t("common.address")}</span>
                <span className="im-org-info-value">{org.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="im-section-card im-org-detail-content--full">
          <div className="im-section-header">
            <div className="im-section-icon im-section-icon--metrics">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
            </div>
            <h2 className="im-section-title">{t("orgDetail.keyMetrics")}</h2>
          </div>
          <div className="im-metrics-grid">
            <div className="im-metric-card im-metric-card--clubs">
              <div className="im-metric-value">{org.metrics.totalClubs}</div>
              <div className="im-metric-label">{t("orgDetail.totalClubs")}</div>
            </div>
            <div className="im-metric-card im-metric-card--courts">
              <div className="im-metric-value">{org.metrics.totalCourts}</div>
              <div className="im-metric-label">{t("orgDetail.totalCourts")}</div>
            </div>
            <div className="im-metric-card im-metric-card--bookings">
              <div className="im-metric-value">{org.metrics.activeBookings}</div>
              <div className="im-metric-label">{t("orgDetail.activeBookings")}</div>
            </div>
            <div className="im-metric-card im-metric-card--users">
              <div className="im-metric-value">{org.metrics.activeUsers}</div>
              <div className="im-metric-label">{t("orgDetail.activeUsers")}</div>
            </div>
          </div>
        </div>

        {/* Clubs Preview */}
        <div className="im-section-card">
          <div className="im-section-header">
            <div className="im-section-icon im-section-icon--clubs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h2 className="im-section-title">{t("orgDetail.clubs")}</h2>
          </div>
          {org.clubsPreview.length === 0 ? (
            <p className="im-preview-empty">{t("orgDetail.noClubs")}</p>
          ) : (
            <>
              <div className="im-clubs-preview-list">
                {org.clubsPreview.map((club) => (
                  <div key={club.id} className="im-club-preview-item">
                    <div className="im-club-preview-info">
                      <span className="im-club-preview-name">{club.name}</span>
                      <span className="im-club-preview-meta">
                        {club.city || club.slug} · {club.courtCount} {t("orgDetail.courts")}
                      </span>
                    </div>
                    <div className="im-club-preview-status">
                      <span
                        className={`im-status-badge ${club.isPublic ? "im-status-badge--active" : "im-status-badge--draft"}`}
                      >
                        {club.isPublic ? t("common.published") : t("common.draft")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {org.metrics.totalClubs > org.clubsPreview.length && (
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => router.push(`/admin/organizations/${orgId}/clubs`)}
                  className="im-view-all-btn"
                >
                  {t("orgDetail.viewAllClubs")} ({org.metrics.totalClubs})
                </Button>
              )}
            </>
          )}
        </div>

        {/* Admins Preview */}
        <div className="im-section-card">
          <div className="im-section-header">
            <div className="im-section-icon im-section-icon--admins">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2 className="im-section-title">{t("orgDetail.admins")}</h2>
          </div>
          <div className="im-admins-section">
            <h4 className="im-admins-section-title">{t("organizations.superAdmins")}</h4>
            {org.superAdmins.length === 0 ? (
              <p className="im-preview-empty">{t("orgDetail.noAdmins")}</p>
            ) : (
              <div className="im-admins-list">
                {org.superAdmins.map((admin) => (
                  <div key={admin.id} className="im-admin-item">
                    <div className="im-admin-avatar">
                      {getInitials(admin.name, admin.email)}
                    </div>
                    <div className="im-admin-details">
                      <span className="im-admin-name">{admin.name || admin.email}</span>
                      <span className="im-admin-email">{admin.email}</span>
                    </div>
                    {admin.isPrimaryOwner && (
                      <span 
                        className="im-admin-owner-badge im-tooltip-wrapper"
                        role="note"
                        aria-label={t("organizations.ownerTooltip")}
                      >
                        {t("organizations.owner")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {org.clubAdmins.length > 0 && (
            <div className="im-admins-section">
              <h4 className="im-admins-section-title">{t("clubAdmins.title")}</h4>
              <div className="im-admins-list">
                {org.clubAdmins.map((ca) => (
                  <div key={ca.id} className="im-admin-item">
                    <div className="im-admin-avatar">
                      {getInitials(ca.userName, ca.userEmail)}
                    </div>
                    <div className="im-admin-details">
                      <span className="im-admin-name">{ca.userName || ca.userEmail}</span>
                      <span className="im-admin-email">{ca.userEmail}</span>
                    </div>
                    <span className="im-admin-club-badge">{ca.clubName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Users Preview */}
        {usersPreview && (
          <div className="im-section-card">
            <div className="im-section-header">
              <div className="im-section-icon im-section-icon--users">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h2 className="im-section-title">{t("orgDetail.users")}</h2>
            </div>
            <div className="im-users-summary">
              <div className="im-users-summary-item">
                <span className="im-users-summary-value">{usersPreview.summary.totalUsers}</span>
                <span className="im-users-summary-label">{t("orgDetail.totalUsers")}</span>
              </div>
              <div className="im-users-summary-item">
                <span className="im-users-summary-value">{usersPreview.summary.activeToday}</span>
                <span className="im-users-summary-label">{t("orgDetail.activeToday")}</span>
              </div>
            </div>
            {usersPreview.items.length === 0 ? (
              <p className="im-preview-empty">{t("orgDetail.noUsers")}</p>
            ) : (
              <div className="im-users-preview-list">
                {usersPreview.items.map((user) => (
                  <div key={user.id} className="im-user-preview-item">
                    <div className="im-user-avatar">
                      {getInitials(user.name, user.email)}
                    </div>
                    <div className="im-user-details">
                      <span className="im-user-name">{user.name || user.email}</span>
                      <span className="im-user-email">{user.email}</span>
                    </div>
                    <span className="im-user-last-booking">
                      {new Date(user.lastBookingAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Feed */}
        <div className="im-section-card im-org-detail-content--full">
          <div className="im-section-header">
            <div className="im-section-icon im-section-icon--activity">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <h2 className="im-section-title">{t("orgDetail.activity")}</h2>
          </div>
          {org.recentActivity.length === 0 ? (
            <p className="im-preview-empty">{t("orgDetail.noActivity")}</p>
          ) : (
            <div className="im-activity-list">
              {org.recentActivity.map((item) => (
                <div key={item.id} className="im-activity-item">
                  <div className="im-activity-dot" />
                  <div className="im-activity-content">
                    <span className="im-activity-action">{formatAction(item.action)}</span>
                    <span className="im-activity-actor">
                      {item.actor.name || item.actor.email || t("orgDetail.unknownActor")}
                    </span>
                  </div>
                  <span className="im-activity-time">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        {isRoot && (
          <div className="im-section-card im-danger-zone-card im-org-detail-content--full">
            <div className="im-section-header">
              <div className="im-section-icon im-section-icon--danger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2 className="im-section-title">{t("orgDetail.dangerZone")}</h2>
            </div>
            <div className="im-danger-zone-content">
              <div className="im-danger-action">
                <div>
                  <h4>{t("orgDetail.archiveOrg")}</h4>
                  <p>{t("orgDetail.archiveDescription")}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsArchiveModalOpen(true)}
                  disabled={!!org.archivedAt}
                >
                  {org.archivedAt ? t("orgDetail.alreadyArchived") : t("orgDetail.archive")}
                </Button>
              </div>
              <div className="im-danger-action im-danger-action--delete">
                <div>
                  <h4>{t("orgDetail.deleteOrg")}</h4>
                  <p>{t("orgDetail.deleteDescription")}</p>
                </div>
                <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t("orgDetail.editOrg")}
      >
        <form onSubmit={handleEditOrg} className="space-y-4">
          {editError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {editError}
            </div>
          )}
          <Input
            label={t("organizations.orgName")}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <Input
            label={t("organizations.orgSlug")}
            value={editSlug}
            onChange={(e) => setEditSlug(e.target.value)}
          />
          <Input
            label={t("common.email")}
            type="email"
            value={editContactEmail}
            onChange={(e) => setEditContactEmail(e.target.value)}
          />
          <Input
            label={t("orgDetail.phone")}
            value={editContactPhone}
            onChange={(e) => setEditContactPhone(e.target.value)}
          />
          <Input
            label={t("orgDetail.website")}
            value={editWebsite}
            onChange={(e) => setEditWebsite(e.target.value)}
          />
          <Input
            label={t("common.address")}
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={editing}>
              {editing ? t("common.processing") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reassign Owner Modal */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title={t("orgDetail.reassignOwner")}
      >
        <form onSubmit={handleReassignOwner} className="space-y-4">
          {reassignError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {reassignError}
            </div>
          )}

          <p className="im-reassign-warning">{t("orgDetail.reassignWarning")}</p>

          <div className="im-assign-mode-tabs">
            <button
              type="button"
              className={`im-assign-mode-tab ${reassignMode === "existing" ? "im-assign-mode-tab--active" : ""}`}
              onClick={() => setReassignMode("existing")}
            >
              {t("organizations.existingUser")}
            </button>
            <button
              type="button"
              className={`im-assign-mode-tab ${reassignMode === "new" ? "im-assign-mode-tab--active" : ""}`}
              onClick={() => setReassignMode("new")}
            >
              {t("organizations.newUser")}
            </button>
          </div>

          {reassignMode === "existing" ? (
            <>
              <Input
                label={t("organizations.searchUsers")}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={t("organizations.searchUsersPlaceholder")}
              />
              <div className="im-user-list">
                {simpleUsers.length === 0 ? (
                  <p className="im-user-list-empty">{t("organizations.noUsersFound")}</p>
                ) : (
                  simpleUsers.map((user) => (
                    <label
                      key={user.id}
                      className={`im-user-option ${selectedUserId === user.id ? "im-user-option--selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="userId"
                        value={user.id}
                        checked={selectedUserId === user.id}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                      />
                      <span className="im-user-info">
                        <span className="im-user-name">{user.name || user.email}</span>
                        <span className="im-user-email">{user.email}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <Input
                label={t("common.name")}
                value={newOwnerName}
                onChange={(e) => setNewOwnerName(e.target.value)}
                required
              />
              <Input
                label={t("common.email")}
                type="email"
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
                required
              />
            </>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsReassignModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                reassigning ||
                (reassignMode === "existing" && !selectedUserId) ||
                (reassignMode === "new" && (!newOwnerName || !newOwnerEmail))
              }
            >
              {reassigning ? t("common.processing") : t("orgDetail.reassign")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Modal */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title={t("orgDetail.archiveOrg")}
      >
        <div className="space-y-4">
          {archiveError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {archiveError}
            </div>
          )}
          <p>{t("orgDetail.archiveConfirm", { name: org.name })}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsArchiveModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleArchive} disabled={archiving}>
              {archiving ? t("common.processing") : t("orgDetail.archive")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t("orgDetail.deleteOrg")}
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {deleteError}
            </div>
          )}
          <p className="im-delete-warning">{t("orgDetail.deleteConfirm", { name: org.name })}</p>
          {org.metrics.totalClubs > 0 && (
            <div className="rsp-warning bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-sm">
              {t("orgDetail.deleteWithClubsWarning", { count: org.metrics.totalClubs })}
            </div>
          )}
          <p className="im-delete-confirm-hint">{t("orgDetail.typeSlugToConfirm")}</p>
          <Input
            label={t("orgDetail.confirmSlug")}
            value={deleteConfirmSlug}
            onChange={(e) => setDeleteConfirmSlug(e.target.value)}
            placeholder={org.slug}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleting || deleteConfirmSlug.toLowerCase() !== org.slug.toLowerCase()}
            >
              {deleting ? t("common.processing") : t("common.delete")}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
