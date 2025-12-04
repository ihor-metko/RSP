"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button, Input, Modal, PageHeader, Breadcrumbs, Select } from "@/components/ui";
import "./page.css";

interface Organization {
  id: string;
  name: string;
}

interface Club {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: "root_admin" | "organization_admin" | "club_admin" | "user";
  organization: Organization | null;
  club: Club | null;
  blocked: boolean;
  createdAt: string;
  lastActivity: string | null;
}

interface UserDetail extends User {
  emailVerified: string | null;
  image: string | null;
  lastLoginAt: string | null;
  memberships: Array<{
    id: string;
    role: string;
    isPrimaryOwner: boolean;
    organization: { id: string; name: string; slug: string };
  }>;
  clubMemberships: Array<{
    id: string;
    role: string;
    club: { id: string; name: string; slug: string };
  }>;
  bookings: Array<{
    id: string;
    start: string;
    end: string;
    status: string;
    createdAt: string;
    court: { name: string; club: { name: string } };
  }>;
  coaches: Array<{
    id: string;
    bio: string | null;
    club: { id: string; name: string } | null;
  }>;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface OrganizationOption {
  id: string;
  name: string;
}

interface ClubOption {
  id: string;
  name: string;
}

export default function AdminUsersPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();

  // Users list state
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [clubFilter, setClubFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Options for filters
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);

  // Modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Role edit state
  const [newRole, setNewRole] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);

  // Action state
  const [processing, setProcessing] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Error key for translated messages
  const [errorKey, setErrorKey] = useState<string>("");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("pageSize", pagination.pageSize.toString());
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      if (searchQuery) params.set("search", searchQuery);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (organizationFilter) params.set("organizationId", organizationFilter);
      if (clubFilter) params.set("clubId", clubFilter);

      const response = await fetch(`/api/admin/users/list?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
      setError("");
      setErrorKey("");
    } catch {
      setErrorKey("users.failedToLoad");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortBy, sortOrder, searchQuery, roleFilter, statusFilter, organizationFilter, clubFilter, router]);

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.map((org: { id: string; name: string }) => ({ id: org.id, name: org.name })));
      }
    } catch {
      // Silent fail
    }
  }, []);

  const fetchClubs = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/clubs");
      if (response.ok) {
        const data = await response.json();
        setClubs(data.map((club: { id: string; name: string }) => ({ id: club.id, name: club.name })));
      }
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || !session.user.isRoot) {
      router.push("/auth/sign-in");
      return;
    }

    fetchUsers();
    fetchOrganizations();
    fetchClubs();
  }, [session, status, router, fetchUsers, fetchOrganizations, fetchClubs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination((prev) => ({ ...prev, page: 1 }));
      } else {
        fetchUsers();
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleViewUser = async (user: User) => {
    setSelectedUser(user);
    setViewModalOpen(true);
    setLoadingDetail(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUserDetail(data);
      }
    } catch {
      showToast(t("users.failedToLoadDetails"), "error");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleEditRole = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setSelectedOrgId(user.organization?.id || "");
    setSelectedClubId(user.club?.id || "");
    setEditRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;

    setUpdatingRole(true);
    try {
      const body: { role: string; organizationId?: string; clubId?: string } = { role: newRole };
      if (newRole === "organization_admin" && selectedOrgId) {
        body.organizationId = selectedOrgId;
      } else if (newRole === "club_admin" && selectedClubId) {
        body.clubId = selectedClubId;
      }

      const response = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      showToast(t("users.roleUpdated"), "success");
      setEditRoleModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("users.failedToUpdateRole"), "error");
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleToggleBlock = async (user: User) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: !user.blocked }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update user");
      }

      showToast(user.blocked ? t("users.userUnblocked") : t("users.userBlocked"), "success");
      fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("users.failedToUpdateUser"), "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      showToast(t("users.userDeleted"), "success");
      setDeleteModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("users.failedToDeleteUser"), "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setRoleFilter("");
    setStatusFilter("");
    setOrganizationFilter("");
    setClubFilter("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      root_admin: t("users.roles.rootAdmin"),
      organization_admin: t("users.roles.organizationAdmin"),
      club_admin: t("users.roles.clubAdmin"),
      user: t("users.roles.user"),
    };
    return labels[role] || role;
  };

  const roleOptions = [
    { value: "", label: t("common.allRoles") },
    { value: "root_admin", label: t("users.roles.rootAdmin") },
    { value: "organization_admin", label: t("users.roles.organizationAdmin") },
    { value: "club_admin", label: t("users.roles.clubAdmin") },
    { value: "user", label: t("users.roles.user") },
  ];

  const statusOptions = [
    { value: "", label: t("users.allStatuses") },
    { value: "active", label: t("users.status.active") },
    { value: "blocked", label: t("users.status.blocked") },
  ];

  const organizationOptions = [
    { value: "", label: t("users.allOrganizations") },
    ...organizations.map((org) => ({ value: org.id, label: org.name })),
  ];

  const clubOptions = [
    { value: "", label: t("users.allClubs") },
    ...clubs.map((club) => ({ value: club.id, label: club.name })),
  ];

  if (status === "loading" || loading) {
    return (
      <main className="im-admin-users-page">
        <div className="im-admin-users-loading">
          <div className="im-admin-users-loading-spinner" />
          <span className="im-admin-users-loading-text">{t("common.loading")}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="im-admin-users-page">
      <PageHeader
        title={t("users.title")}
        description={t("users.subtitle")}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`im-toast im-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      <section className="rsp-content">
        <Breadcrumbs
          items={[
            { label: t("breadcrumbs.home"), href: "/" },
            { label: t("breadcrumbs.admin"), href: "/admin/dashboard" },
            { label: t("users.breadcrumb") },
          ]}
          className="mb-6"
          ariaLabel={t("breadcrumbs.navigation")}
        />

        {/* Filters */}
        <div className="im-admin-users-filters">
          <div className="im-filter-field im-filter-field--search">
            <Input
              label={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("users.searchPlaceholder")}
            />
          </div>
          <div className="im-filter-field">
            <Select
              label={t("users.filterByRole")}
              options={roleOptions}
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            />
          </div>
          <div className="im-filter-field">
            <Select
              label={t("users.filterByStatus")}
              options={statusOptions}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            />
          </div>
          <div className="im-filter-field">
            <Select
              label={t("users.filterByOrganization")}
              options={organizationOptions}
              value={organizationFilter}
              onChange={(value) => {
                setOrganizationFilter(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            />
          </div>
          <div className="im-filter-field">
            <Select
              label={t("users.filterByClub")}
              options={clubOptions}
              value={clubFilter}
              onChange={(value) => {
                setClubFilter(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            />
          </div>
          <div className="im-filter-actions">
            <Button variant="outline" onClick={handleClearFilters}>
              {t("users.clearFilters")}
            </Button>
          </div>
        </div>

        {(error || errorKey) && (
          <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
            {error || (errorKey && t(errorKey))}
          </div>
        )}

        {users.length === 0 && !loading ? (
          <div className="im-admin-users-empty">
            <p className="im-admin-users-empty-text">{t("users.noUsers")}</p>
          </div>
        ) : (
          <>
            {/* Users Table */}
            <div className="im-admin-users-table-wrapper">
              <table className="im-admin-users-table">
                <thead>
                  <tr>
                    <th
                      className={`im-sortable ${sortBy === "name" ? "im-sorted" : ""}`}
                      onClick={() => handleSort("name")}
                    >
                      {t("users.columns.name")}
                      <span className="im-sort-icon">
                        {sortBy === "name" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </th>
                    <th
                      className={`im-sortable ${sortBy === "email" ? "im-sorted" : ""}`}
                      onClick={() => handleSort("email")}
                    >
                      {t("users.columns.email")}
                      <span className="im-sort-icon">
                        {sortBy === "email" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </th>
                    <th>{t("users.columns.role")}</th>
                    <th>{t("users.columns.organization")}</th>
                    <th>{t("users.columns.club")}</th>
                    <th>{t("users.columns.status")}</th>
                    <th
                      className={`im-sortable ${sortBy === "createdAt" ? "im-sorted" : ""}`}
                      onClick={() => handleSort("createdAt")}
                    >
                      {t("users.columns.registeredAt")}
                      <span className="im-sort-icon">
                        {sortBy === "createdAt" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </th>
                    <th
                      className={`im-sortable ${sortBy === "lastLoginAt" ? "im-sorted" : ""}`}
                      onClick={() => handleSort("lastLoginAt")}
                    >
                      {t("users.columns.lastActivity")}
                      <span className="im-sort-icon">
                        {sortBy === "lastLoginAt" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </th>
                    <th>{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="im-user-name-cell">{user.name || "-"}</td>
                      <td className="im-user-email-cell">{user.email}</td>
                      <td>
                        <span className={`im-role-badge im-role-badge--${user.role}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td>
                        {user.organization ? (
                          <Link
                            href={`/admin/organizations`}
                            className="im-entity-link"
                          >
                            {user.organization.name}
                          </Link>
                        ) : (
                          <span className="im-no-entity">-</span>
                        )}
                      </td>
                      <td>
                        {user.club ? (
                          <Link
                            href={`/admin/clubs/${user.club.id}`}
                            className="im-entity-link"
                          >
                            {user.club.name}
                          </Link>
                        ) : (
                          <span className="im-no-entity">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`im-status-badge im-status-badge--${user.blocked ? "blocked" : "active"}`}>
                          <span className={`im-status-icon im-status-icon--${user.blocked ? "blocked" : "active"}`} />
                          {user.blocked ? t("users.status.blocked") : t("users.status.active")}
                        </span>
                      </td>
                      <td className="im-date-cell">{formatDate(user.createdAt)}</td>
                      <td className="im-date-cell">{formatDate(user.lastActivity)}</td>
                      <td>
                        <div className="im-user-actions">
                          <button
                            className="im-action-btn im-action-btn--view"
                            onClick={() => handleViewUser(user)}
                          >
                            {t("users.actions.view")}
                          </button>
                          {user.role !== "root_admin" && (
                            <>
                              <button
                                className="im-action-btn im-action-btn--edit"
                                onClick={() => handleEditRole(user)}
                              >
                                {t("users.actions.editRole")}
                              </button>
                              <button
                                className={`im-action-btn ${user.blocked ? "im-action-btn--unblock" : "im-action-btn--block"}`}
                                onClick={() => handleToggleBlock(user)}
                                disabled={processing}
                              >
                                {user.blocked ? t("users.actions.unblock") : t("users.actions.block")}
                              </button>
                              <button
                                className="im-action-btn im-action-btn--delete"
                                onClick={() => handleDeleteUser(user)}
                                disabled={processing}
                              >
                                {t("users.actions.delete")}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="im-pagination">
              <div className="im-pagination-info">
                {t("users.pagination.showing", {
                  start: (pagination.page - 1) * pagination.pageSize + 1,
                  end: Math.min(pagination.page * pagination.pageSize, pagination.totalCount),
                  total: pagination.totalCount,
                })}
              </div>
              <div className="im-pagination-controls">
                <button
                  className="im-pagination-btn"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  {t("users.pagination.previous")}
                </button>
                <span>
                  {t("users.pagination.pageOf", {
                    page: pagination.page,
                    total: pagination.totalPages,
                  })}
                </span>
                <button
                  className="im-pagination-btn"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  {t("users.pagination.next")}
                </button>
                <div className="im-pagination-page-size">
                  <label>{t("users.pagination.pageSize")}</label>
                  <select
                    value={pagination.pageSize}
                    onChange={(e) =>
                      setPagination((prev) => ({
                        ...prev,
                        pageSize: parseInt(e.target.value),
                        page: 1,
                      }))
                    }
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* View User Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setUserDetail(null);
        }}
        title={t("users.viewDetails")}
      >
        <div className="im-user-detail-modal">
          {loadingDetail ? (
            <div className="im-admin-users-loading">
              <div className="im-admin-users-loading-spinner" />
            </div>
          ) : userDetail ? (
            <>
              <div className="im-user-detail-section">
                <h3>{t("users.sections.basicInfo")}</h3>
                <div className="im-user-detail-row">
                  <span className="im-user-detail-label">{t("common.name")}</span>
                  <span className="im-user-detail-value">{userDetail.name || "-"}</span>
                </div>
                <div className="im-user-detail-row">
                  <span className="im-user-detail-label">{t("common.email")}</span>
                  <span className="im-user-detail-value">{userDetail.email}</span>
                </div>
                <div className="im-user-detail-row">
                  <span className="im-user-detail-label">{t("users.columns.role")}</span>
                  <span className={`im-role-badge im-role-badge--${userDetail.role}`}>
                    {getRoleLabel(userDetail.role)}
                  </span>
                </div>
                <div className="im-user-detail-row">
                  <span className="im-user-detail-label">{t("users.columns.status")}</span>
                  <span className={`im-status-badge im-status-badge--${userDetail.blocked ? "blocked" : "active"}`}>
                    {userDetail.blocked ? t("users.status.blocked") : t("users.status.active")}
                  </span>
                </div>
                <div className="im-user-detail-row">
                  <span className="im-user-detail-label">{t("users.columns.registeredAt")}</span>
                  <span className="im-user-detail-value">{formatDateTime(userDetail.createdAt)}</span>
                </div>
                <div className="im-user-detail-row">
                  <span className="im-user-detail-label">{t("users.columns.lastLogin")}</span>
                  <span className="im-user-detail-value">{formatDateTime(userDetail.lastLoginAt)}</span>
                </div>
              </div>

              {userDetail.memberships.length > 0 && (
                <div className="im-user-detail-section">
                  <h3>{t("users.sections.organizations")}</h3>
                  {userDetail.memberships.map((m) => (
                    <div key={m.id} className="im-user-detail-row">
                      <span className="im-user-detail-label">{m.organization.name}</span>
                      <span className="im-user-detail-value">
                        {m.role} {m.isPrimaryOwner && `(${t("organizations.owner")})`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {userDetail.clubMemberships.length > 0 && (
                <div className="im-user-detail-section">
                  <h3>{t("users.sections.clubs")}</h3>
                  {userDetail.clubMemberships.map((m) => (
                    <div key={m.id} className="im-user-detail-row">
                      <span className="im-user-detail-label">{m.club.name}</span>
                      <span className="im-user-detail-value">{m.role}</span>
                    </div>
                  ))}
                </div>
              )}

              {userDetail.bookings.length > 0 && (
                <div className="im-user-detail-section">
                  <h3>{t("users.sections.recentBookings")}</h3>
                  <div className="im-user-bookings-list">
                    {userDetail.bookings.map((b) => (
                      <div key={b.id} className="im-user-booking-item">
                        <strong>{b.court.club.name} - {b.court.name}</strong>
                        <div>{formatDateTime(b.start)} - {b.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p>{t("users.noDetailsAvailable")}</p>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={editRoleModalOpen}
        onClose={() => setEditRoleModalOpen(false)}
        title={t("users.editRole")}
      >
        <div>
          <p className="mb-4">
            {t("users.editRoleFor")}: <strong>{selectedUser?.name || selectedUser?.email}</strong>
          </p>

          <div className="im-role-select-group">
            <label
              className={`im-role-option ${newRole === "organization_admin" ? "im-selected" : ""}`}
            >
              <input
                type="radio"
                name="role"
                value="organization_admin"
                checked={newRole === "organization_admin"}
                onChange={(e) => setNewRole(e.target.value)}
              />
              <span className="im-role-option-label">
                <strong>{t("users.roles.organizationAdmin")}</strong>
                <span>{t("users.roleDescriptions.organizationAdmin")}</span>
              </span>
            </label>

            <label
              className={`im-role-option ${newRole === "club_admin" ? "im-selected" : ""}`}
            >
              <input
                type="radio"
                name="role"
                value="club_admin"
                checked={newRole === "club_admin"}
                onChange={(e) => setNewRole(e.target.value)}
              />
              <span className="im-role-option-label">
                <strong>{t("users.roles.clubAdmin")}</strong>
                <span>{t("users.roleDescriptions.clubAdmin")}</span>
              </span>
            </label>

            <label
              className={`im-role-option ${newRole === "user" ? "im-selected" : ""}`}
            >
              <input
                type="radio"
                name="role"
                value="user"
                checked={newRole === "user"}
                onChange={(e) => setNewRole(e.target.value)}
              />
              <span className="im-role-option-label">
                <strong>{t("users.roles.user")}</strong>
                <span>{t("users.roleDescriptions.user")}</span>
              </span>
            </label>
          </div>

          {newRole === "organization_admin" && (
            <div className="im-entity-select">
              <Select
                label={t("users.selectOrganization")}
                options={organizations.map((org) => ({ value: org.id, label: org.name }))}
                value={selectedOrgId}
                onChange={setSelectedOrgId}
                placeholder={t("users.selectOrganizationPlaceholder")}
              />
            </div>
          )}

          {newRole === "club_admin" && (
            <div className="im-entity-select">
              <Select
                label={t("users.selectClub")}
                options={clubs.map((club) => ({ value: club.id, label: club.name }))}
                value={selectedClubId}
                onChange={setSelectedClubId}
                placeholder={t("users.selectClubPlaceholder")}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditRoleModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={
                updatingRole ||
                (newRole === "organization_admin" && !selectedOrgId) ||
                (newRole === "club_admin" && !selectedClubId)
              }
            >
              {updatingRole ? t("common.processing") : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={t("users.confirmDelete")}
      >
        <div>
          <p className="im-delete-warning">{t("users.deleteWarning")}</p>
          <p>
            {t("users.deleteConfirmMessage", {
              name: selectedUser?.name ?? selectedUser?.email ?? "",
            })}
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={confirmDeleteUser}
              disabled={processing}
            >
              {processing ? t("common.processing") : t("common.delete")}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
