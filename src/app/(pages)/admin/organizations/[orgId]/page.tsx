"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, PageHeader, Card } from "@/components/ui";
import "./page.css";

interface User {
  id: string;
  name: string | null;
  email: string;
}

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

export default function OrganizationDetailPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;

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
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);
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
    } catch {
      setError(t("orgDetail.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [orgId, router, t]);

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
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Validate that response is an array
        if (Array.isArray(data)) {
          setSearchedUsers(data);
        } else {
          setSearchedUsers([]);
        }
      } else {
        // Clear search results on error
        setSearchedUsers([]);
      }
    } catch {
      // Clear search results on error
      setSearchedUsers([]);
    }
  }, []);

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
      const response = await fetch(`/api/orgs/${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          slug: editSlug,
          contactEmail: editContactEmail,
          contactPhone: editContactPhone,
          website: editWebsite,
          address: editAddress,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update organization");
      }

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
      const response = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmOrgSlug: org.slug }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete organization");
      }

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

      <section className="rsp-content">
        {/* Organization Info Card */}
        <Card title={t("orgDetail.info")} className="im-org-info-card">
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
        </Card>

        {/* Metrics Grid */}
        <div className="im-metrics-grid">
          <Card className="im-metric-card">
            <div className="im-metric-value">{org.metrics.totalClubs}</div>
            <div className="im-metric-label">{t("orgDetail.totalClubs")}</div>
          </Card>
          <Card className="im-metric-card">
            <div className="im-metric-value">{org.metrics.totalCourts}</div>
            <div className="im-metric-label">{t("orgDetail.totalCourts")}</div>
          </Card>
          <Card className="im-metric-card">
            <div className="im-metric-value">{org.metrics.activeBookings}</div>
            <div className="im-metric-label">{t("orgDetail.activeBookings")}</div>
          </Card>
          <Card className="im-metric-card">
            <div className="im-metric-value">{org.metrics.activeUsers}</div>
            <div className="im-metric-label">{t("orgDetail.activeUsers")}</div>
          </Card>
        </div>

        {/* Clubs Preview */}
        <Card title={t("orgDetail.clubs")} className="im-preview-card">
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
        </Card>

        {/* Admins Preview */}
        <Card title={t("orgDetail.admins")} className="im-preview-card">
          <div className="im-admins-section">
            <h4 className="im-admins-section-title">{t("organizations.superAdmins")}</h4>
            {org.superAdmins.length === 0 ? (
              <p className="im-preview-empty">{t("orgDetail.noAdmins")}</p>
            ) : (
              <div className="im-admins-list">
                {org.superAdmins.map((admin) => (
                  <div key={admin.id} className="im-admin-item">
                    <span className="im-admin-name">{admin.name || admin.email}</span>
                    {admin.isPrimaryOwner && (
                      <span className="im-admin-owner-badge">{t("organizations.owner")}</span>
                    )}
                    <span className="im-admin-email">{admin.email}</span>
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
                    <span className="im-admin-name">{ca.userName || ca.userEmail}</span>
                    <span className="im-admin-club-badge">{ca.clubName}</span>
                    <span className="im-admin-email">{ca.userEmail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Users Preview */}
        {usersPreview && (
          <Card title={t("orgDetail.users")} className="im-preview-card">
            <div className="im-users-summary">
              <span>{t("orgDetail.totalUsers")}: {usersPreview.summary.totalUsers}</span>
              <span>{t("orgDetail.activeToday")}: {usersPreview.summary.activeToday}</span>
            </div>
            {usersPreview.items.length === 0 ? (
              <p className="im-preview-empty">{t("orgDetail.noUsers")}</p>
            ) : (
              <div className="im-users-preview-list">
                {usersPreview.items.map((user) => (
                  <div key={user.id} className="im-user-preview-item">
                    <span className="im-user-name">{user.name || user.email}</span>
                    <span className="im-user-email">{user.email}</span>
                    <span className="im-user-last-booking">
                      {new Date(user.lastBookingAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Activity Feed */}
        <Card title={t("orgDetail.activity")} className="im-preview-card">
          {org.recentActivity.length === 0 ? (
            <p className="im-preview-empty">{t("orgDetail.noActivity")}</p>
          ) : (
            <div className="im-activity-list">
              {org.recentActivity.map((item) => (
                <div key={item.id} className="im-activity-item">
                  <span className="im-activity-action">{formatAction(item.action)}</span>
                  <span className="im-activity-actor">
                    {item.actor.name || item.actor.email || t("orgDetail.unknownActor")}
                  </span>
                  <span className="im-activity-time">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Danger Zone */}
        {isRoot && (
          <Card title={t("orgDetail.dangerZone")} className="im-danger-zone-card">
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
          </Card>
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
                {searchedUsers.length === 0 ? (
                  <p className="im-user-list-empty">{t("organizations.noUsersFound")}</p>
                ) : (
                  searchedUsers.map((user) => (
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
