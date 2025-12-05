"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button, Input, Modal, PageHeader, Breadcrumbs, Select, Badge, Card, Tooltip } from "@/components/ui";
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

  const getRoleBadgeVariant = (role: string): "danger" | "info" | "warning" | "default" => {
    switch (role) {
      case "root_admin":
        return "danger";
      case "organization_admin":
        return "info";
      case "club_admin":
        return "warning";
      default:
        return "default";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "root_admin":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        );
      case "organization_admin":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
          </svg>
        );
      case "club_admin":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        );
    }
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
        <PageHeader
          title={t("users.title")}
          description={t("users.subtitle")}
        />
        <div className="im-admin-users-loading">
          <div className="im-admin-users-loading-spinner" aria-label={t("common.loading")} />
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
        <div className={`im-toast im-toast--${toast.type}`} role="alert">
          <span className="im-toast-icon" aria-hidden="true">
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      <section className="im-admin-users-content">
        <Breadcrumbs
          items={[
            { label: t("breadcrumbs.home"), href: "/" },
            { label: t("breadcrumbs.admin"), href: "/admin/dashboard" },
            { label: t("users.breadcrumb") },
          ]}
          className="im-breadcrumbs-wrapper"
          ariaLabel={t("breadcrumbs.navigation")}
        />

        {/* Filters Card */}
        <Card className="im-filters-card">
          <div className="im-filters-header">
            <h2 className="im-filters-title">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-section-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
              </svg>
              {t("users.filters")}
            </h2>
            <Button variant="outline" size="small" onClick={handleClearFilters}>
              {t("users.clearFilters")}
            </Button>
          </div>
          <div className="im-filters-grid">
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
          </div>
        </Card>

        {(error || errorKey) && (
          <div className="im-error-alert" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-error-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{error || (errorKey && t(errorKey))}</span>
          </div>
        )}

        {users.length === 0 && !loading ? (
          <Card className="im-empty-state-card">
            <div className="im-empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="im-empty-state-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <h3 className="im-empty-state-title">{t("users.noUsers")}</h3>
              <p className="im-empty-state-description">{t("users.noUsersDescription")}</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Users Table Card */}
            <Card className="im-users-table-card">
              <div className="im-table-header">
                <h2 className="im-table-title">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-section-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  {t("users.usersList")}
                </h2>
                <span className="im-table-count">
                  {t("users.totalUsers", { count: pagination.totalCount })}
                </span>
              </div>
              <div className="im-admin-users-table-wrapper">
                <table className="im-admin-users-table" role="grid">
                  <thead>
                    <tr>
                      <th
                        className={`im-sortable ${sortBy === "name" ? "im-sorted" : ""}`}
                        onClick={() => handleSort("name")}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleSort("name")}
                        aria-sort={sortBy === "name" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                      >
                        <span className="im-th-content">
                          {t("users.columns.name")}
                          <span className="im-sort-icon" aria-hidden="true">
                            {sortBy === "name" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </span>
                      </th>
                      <th
                        className={`im-sortable ${sortBy === "email" ? "im-sorted" : ""}`}
                        onClick={() => handleSort("email")}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleSort("email")}
                        aria-sort={sortBy === "email" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                      >
                        <span className="im-th-content">
                          {t("users.columns.email")}
                          <span className="im-sort-icon" aria-hidden="true">
                            {sortBy === "email" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </span>
                      </th>
                      <th>{t("users.columns.role")}</th>
                      <th>{t("users.columns.organization")}</th>
                      <th>{t("users.columns.club")}</th>
                      <th>{t("users.columns.status")}</th>
                      <th
                        className={`im-sortable ${sortBy === "createdAt" ? "im-sorted" : ""}`}
                        onClick={() => handleSort("createdAt")}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleSort("createdAt")}
                        aria-sort={sortBy === "createdAt" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                      >
                        <span className="im-th-content">
                          {t("users.columns.registeredAt")}
                          <span className="im-sort-icon" aria-hidden="true">
                            {sortBy === "createdAt" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </span>
                      </th>
                      <th
                        className={`im-sortable ${sortBy === "lastLoginAt" ? "im-sorted" : ""}`}
                        onClick={() => handleSort("lastLoginAt")}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleSort("lastLoginAt")}
                        aria-sort={sortBy === "lastLoginAt" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                      >
                        <span className="im-th-content">
                          {t("users.columns.lastActivity")}
                          <span className="im-sort-icon" aria-hidden="true">
                            {sortBy === "lastLoginAt" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </span>
                      </th>
                      <th className="im-actions-header">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="im-user-row">
                        <td className="im-user-name-cell">
                          <div className="im-user-avatar">
                            {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="im-user-name">{user.name || "-"}</span>
                        </td>
                        <td className="im-user-email-cell">
                          <span className="im-user-email">{user.email}</span>
                        </td>
                        <td>
                          <Badge
                            variant={getRoleBadgeVariant(user.role)}
                            icon={getRoleIcon(user.role)}
                            size="small"
                          >
                            {getRoleLabel(user.role)}
                          </Badge>
                        </td>
                        <td>
                          {user.organization ? (
                            <Link
                              href={`/admin/organizations`}
                              className="im-entity-link"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-entity-icon">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                              </svg>
                              {user.organization.name}
                            </Link>
                          ) : (
                            <span className="im-no-entity">—</span>
                          )}
                        </td>
                        <td>
                          {user.club ? (
                            <Link
                              href={`/admin/clubs/${user.club.id}`}
                              className="im-entity-link"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-entity-icon">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                              </svg>
                              {user.club.name}
                            </Link>
                          ) : (
                            <span className="im-no-entity">—</span>
                          )}
                        </td>
                        <td>
                          <Badge
                            variant={user.blocked ? "danger" : "success"}
                            dot
                            dotColor={user.blocked ? "danger" : "success"}
                            size="small"
                          >
                            {user.blocked ? t("users.status.blocked") : t("users.status.active")}
                          </Badge>
                        </td>
                        <td className="im-date-cell">
                          <Tooltip content={formatDateTime(user.createdAt)}>
                            <span>{formatDate(user.createdAt)}</span>
                          </Tooltip>
                        </td>
                        <td className="im-date-cell">
                          <Tooltip content={user.lastActivity ? formatDateTime(user.lastActivity) : t("users.neverLoggedIn")}>
                            <span>{formatDate(user.lastActivity)}</span>
                          </Tooltip>
                        </td>
                        <td>
                          <div className="im-user-actions">
                            <Tooltip content={t("users.actions.viewDetails")}>
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => handleViewUser(user)}
                                aria-label={t("users.actions.view")}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-action-icon">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </Button>
                            </Tooltip>
                            {user.role !== "root_admin" && (
                              <>
                                <Tooltip content={t("users.actions.editRole")}>
                                  <Button
                                    variant="outline"
                                    size="small"
                                    onClick={() => handleEditRole(user)}
                                    aria-label={t("users.actions.editRole")}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-action-icon">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                  </Button>
                                </Tooltip>
                                <Tooltip content={user.blocked ? t("users.actions.unblock") : t("users.actions.block")}>
                                  <Button
                                    variant="outline"
                                    size="small"
                                    onClick={() => handleToggleBlock(user)}
                                    disabled={processing}
                                    aria-label={user.blocked ? t("users.actions.unblock") : t("users.actions.block")}
                                    className={user.blocked ? "im-unblock-btn" : "im-block-btn"}
                                  >
                                    {user.blocked ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-action-icon">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-action-icon">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                      </svg>
                                    )}
                                  </Button>
                                </Tooltip>
                                <Tooltip content={t("users.actions.delete")}>
                                  <Button
                                    variant="danger"
                                    size="small"
                                    onClick={() => handleDeleteUser(user)}
                                    disabled={processing}
                                    aria-label={t("users.actions.delete")}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-action-icon">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                  </Button>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pagination Card */}
            <Card className="im-pagination-card">
              <div className="im-pagination">
                <div className="im-pagination-info">
                  <span className="im-pagination-text">
                    {t("users.pagination.showing", {
                      start: (pagination.page - 1) * pagination.pageSize + 1,
                      end: Math.min(pagination.page * pagination.pageSize, pagination.totalCount),
                      total: pagination.totalCount,
                    })}
                  </span>
                </div>
                <div className="im-pagination-controls">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page <= 1}
                    aria-label={t("users.pagination.previous")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="im-pagination-icon">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    <span className="im-pagination-btn-text">{t("users.pagination.previous")}</span>
                  </Button>
                  <div className="im-pagination-pages">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          className={`im-pagination-page ${pagination.page === pageNum ? "im-pagination-page--active" : ""}`}
                          onClick={() => setPagination((prev) => ({ ...prev, page: pageNum }))}
                          aria-current={pagination.page === pageNum ? "page" : undefined}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    aria-label={t("users.pagination.next")}
                  >
                    <span className="im-pagination-btn-text">{t("users.pagination.next")}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="im-pagination-icon">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Button>
                </div>
                <div className="im-pagination-page-size">
                  <Select
                    label={t("users.pagination.pageSize")}
                    options={[
                      { value: "10", label: "10" },
                      { value: "25", label: "25" },
                      { value: "50", label: "50" },
                      { value: "100", label: "100" },
                    ]}
                    value={pagination.pageSize.toString()}
                    onChange={(value) =>
                      setPagination((prev) => ({
                        ...prev,
                        pageSize: parseInt(value),
                        page: 1,
                      }))
                    }
                  />
                </div>
              </div>
            </Card>
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
            <div className="im-modal-loading">
              <div className="im-admin-users-loading-spinner" />
              <span>{t("common.loading")}</span>
            </div>
          ) : userDetail ? (
            <>
              {/* User Header */}
              <div className="im-user-detail-header">
                <div className="im-user-detail-avatar">
                  {userDetail.name ? userDetail.name.charAt(0).toUpperCase() : userDetail.email.charAt(0).toUpperCase()}
                </div>
                <div className="im-user-detail-identity">
                  <h3 className="im-user-detail-name">{userDetail.name || t("users.unnamed")}</h3>
                  <p className="im-user-detail-email">{userDetail.email}</p>
                </div>
                <div className="im-user-detail-badges">
                  <Badge
                    variant={getRoleBadgeVariant(userDetail.role)}
                    icon={getRoleIcon(userDetail.role)}
                  >
                    {getRoleLabel(userDetail.role)}
                  </Badge>
                  <Badge
                    variant={userDetail.blocked ? "danger" : "success"}
                    dot
                    dotColor={userDetail.blocked ? "danger" : "success"}
                  >
                    {userDetail.blocked ? t("users.status.blocked") : t("users.status.active")}
                  </Badge>
                </div>
              </div>

              {/* Basic Info Section */}
              <div className="im-user-detail-section">
                <h4 className="im-section-title">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-section-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  {t("users.sections.basicInfo")}
                </h4>
                <div className="im-detail-grid">
                  <div className="im-detail-item">
                    <span className="im-detail-label">{t("users.columns.registeredAt")}</span>
                    <span className="im-detail-value">{formatDateTime(userDetail.createdAt)}</span>
                  </div>
                  <div className="im-detail-item">
                    <span className="im-detail-label">{t("users.columns.lastLogin")}</span>
                    <span className="im-detail-value">{formatDateTime(userDetail.lastLoginAt) || t("users.neverLoggedIn")}</span>
                  </div>
                  <div className="im-detail-item">
                    <span className="im-detail-label">{t("users.emailVerified")}</span>
                    <span className="im-detail-value">
                      {userDetail.emailVerified ? (
                        <Badge variant="success" size="small">{t("common.yes")}</Badge>
                      ) : (
                        <Badge variant="warning" size="small">{t("common.no")}</Badge>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Organizations Section */}
              {userDetail.memberships.length > 0 && (
                <div className="im-user-detail-section">
                  <h4 className="im-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-section-icon">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                    </svg>
                    {t("users.sections.organizations")}
                  </h4>
                  <div className="im-membership-list">
                    {userDetail.memberships.map((m) => (
                      <div key={m.id} className="im-membership-item">
                        <span className="im-membership-name">{m.organization.name}</span>
                        <div className="im-membership-badges">
                          <Badge variant="info" size="small">{m.role}</Badge>
                          {m.isPrimaryOwner && (
                            <Badge variant="primary" size="small">{t("organizations.owner")}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clubs Section */}
              {userDetail.clubMemberships.length > 0 && (
                <div className="im-user-detail-section">
                  <h4 className="im-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-section-icon">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {t("users.sections.clubs")}
                  </h4>
                  <div className="im-membership-list">
                    {userDetail.clubMemberships.map((m) => (
                      <div key={m.id} className="im-membership-item">
                        <span className="im-membership-name">{m.club.name}</span>
                        <Badge variant="warning" size="small">{m.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Bookings Section */}
              {userDetail.bookings.length > 0 && (
                <div className="im-user-detail-section">
                  <h4 className="im-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="im-section-icon">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {t("users.sections.recentBookings")}
                  </h4>
                  <div className="im-bookings-list">
                    {userDetail.bookings.map((b) => (
                      <div key={b.id} className="im-booking-item">
                        <div className="im-booking-info">
                          <span className="im-booking-court">{b.court.club.name} — {b.court.name}</span>
                          <span className="im-booking-time">{formatDateTime(b.start)}</span>
                        </div>
                        <Badge 
                          variant={b.status === "confirmed" ? "success" : b.status === "pending" ? "warning" : "default"}
                          size="small"
                        >
                          {b.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="im-no-details">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="im-no-details-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p>{t("users.noDetailsAvailable")}</p>
            </div>
          )}
          <div className="im-modal-footer">
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
