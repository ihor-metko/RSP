"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button, Input, Modal, PageHeader, Breadcrumbs, Select, Card, Badge, Toast, ToastContainer, Tooltip } from "@/components/ui";
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
          <div className="im-admin-users-loading-spinner" aria-hidden="true" />
          <span className="im-admin-users-loading-text">{t("common.loading")}</span>
        </div>
      </main>
    );
  }

  // Icons for roles
  const RoleIcon = ({ role }: { role: string }) => {
    switch (role) {
      case "root_admin":
        return (
          <svg className="im-role-icon-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
          </svg>
        );
      case "organization_admin":
        return (
          <svg className="im-role-icon-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 010-1.5h12.5a.75.75 0 010 1.5H16v13h.25a.75.75 0 010 1.5h-12.5a.75.75 0 010-1.5H4zm3-11a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 017 5.5zm0 3a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 017 8.5zm0 3a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
          </svg>
        );
      case "club_admin":
        return (
          <svg className="im-role-icon-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.219-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25zM10 10a1 1 0 00-1 1v.01a1 1 0 001 1h.01a1 1 0 001-1V11a1 1 0 00-1-1H10z" clipRule="evenodd" />
            <path d="M3 15.055v-.684c.126.053.255.1.39.142 2.092.642 4.313.987 6.61.987 2.297 0 4.518-.345 6.61-.987.135-.041.264-.089.39-.142v.684c0 1.347-.985 2.53-2.363 2.686a41.454 41.454 0 01-9.274 0C3.985 17.585 3 16.402 3 15.055z" />
          </svg>
        );
      default:
        return (
          <svg className="im-role-icon-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
          </svg>
        );
    }
  };

  // Status icon component
  const StatusIcon = ({ blocked }: { blocked: boolean }) => {
    if (blocked) {
      return (
        <svg className="im-status-icon-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="im-status-icon-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <main className="im-admin-users-page">
      <PageHeader
        title={t("users.title")}
        description={t("users.subtitle")}
      />

      {/* Toast Notification */}
      {toast && (
        <ToastContainer position="top-right">
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onDismiss={() => setToast(null)}
          />
        </ToastContainer>
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

        {/* Stats Overview */}
        <div className="im-users-stats">
          <Card className="im-stat-card">
            <div className="im-stat-content">
              <div className="im-stat-icon im-stat-icon--users">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                </svg>
              </div>
              <div className="im-stat-info">
                <span className="im-stat-value">{pagination.totalCount}</span>
                <span className="im-stat-label">{t("users.stats.totalUsers")}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="im-filters-card">
          <div className="im-filters-header">
            <h2 className="im-filters-title">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
              </svg>
              {t("users.filters")}
            </h2>
            <Button variant="outline" size="small" onClick={handleClearFilters}>
              {t("users.clearFilters")}
            </Button>
          </div>
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
          </div>
        </Card>

        {(error || errorKey) && (
          <Card className="im-error-card">
            <div className="im-error-content">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <span>{error || (errorKey && t(errorKey))}</span>
            </div>
          </Card>
        )}

        {users.length === 0 && !loading ? (
          <Card className="im-empty-card">
            <div className="im-empty-content">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
              </svg>
              <h3>{t("users.noUsers")}</h3>
              <p>{t("users.noUsersDescription")}</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Users Table */}
            <Card className="im-table-card">
              <div className="im-table-header">
                <h2 className="im-table-title">
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                  </svg>
                  {t("users.usersList")}
                </h2>
                <span className="im-table-count">
                  {t("users.pagination.showing", {
                    start: (pagination.page - 1) * pagination.pageSize + 1,
                    end: Math.min(pagination.page * pagination.pageSize, pagination.totalCount),
                    total: pagination.totalCount,
                  })}
                </span>
              </div>
              <div className="im-admin-users-table-wrapper">
                <table className="im-admin-users-table" role="grid" aria-label={t("users.usersList")}>
                  <thead>
                    <tr>
                      <th
                        className={`im-sortable ${sortBy === "name" ? "im-sorted" : ""}`}
                        onClick={() => handleSort("name")}
                        onKeyDown={(e) => e.key === "Enter" && handleSort("name")}
                        tabIndex={0}
                        role="columnheader"
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
                        onKeyDown={(e) => e.key === "Enter" && handleSort("email")}
                        tabIndex={0}
                        role="columnheader"
                        aria-sort={sortBy === "email" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                      >
                        <span className="im-th-content">
                          {t("users.columns.email")}
                          <span className="im-sort-icon" aria-hidden="true">
                            {sortBy === "email" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </span>
                      </th>
                      <th role="columnheader">{t("users.columns.role")}</th>
                      <th role="columnheader">{t("users.columns.organization")}</th>
                      <th role="columnheader">{t("users.columns.club")}</th>
                      <th role="columnheader">{t("users.columns.status")}</th>
                      <th
                        className={`im-sortable ${sortBy === "createdAt" ? "im-sorted" : ""}`}
                        onClick={() => handleSort("createdAt")}
                        onKeyDown={(e) => e.key === "Enter" && handleSort("createdAt")}
                        tabIndex={0}
                        role="columnheader"
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
                        onKeyDown={(e) => e.key === "Enter" && handleSort("lastLoginAt")}
                        tabIndex={0}
                        role="columnheader"
                        aria-sort={sortBy === "lastLoginAt" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                      >
                        <span className="im-th-content">
                          {t("users.columns.lastActivity")}
                          <span className="im-sort-icon" aria-hidden="true">
                            {sortBy === "lastLoginAt" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </span>
                      </th>
                      <th role="columnheader">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="im-table-row">
                        <td className="im-user-name-cell" role="gridcell">
                          <div className="im-user-info">
                            <div className="im-user-avatar">
                              {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </div>
                            <span className="im-user-name">{user.name || "-"}</span>
                          </div>
                        </td>
                        <td className="im-user-email-cell" role="gridcell">{user.email}</td>
                        <td role="gridcell">
                          <Badge 
                            variant={user.role as "root_admin" | "organization_admin" | "club_admin" | "user"}
                            icon={<RoleIcon role={user.role} />}
                          >
                            {getRoleLabel(user.role)}
                          </Badge>
                        </td>
                        <td role="gridcell">
                          {user.organization ? (
                            <Link
                              href={`/admin/organizations`}
                              className="im-entity-link"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 010-1.5h12.5a.75.75 0 010 1.5H16v13h.25a.75.75 0 010 1.5h-12.5a.75.75 0 010-1.5H4zm3-11a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 017 5.5z" clipRule="evenodd" />
                              </svg>
                              {user.organization.name}
                            </Link>
                          ) : (
                            <span className="im-no-entity">—</span>
                          )}
                        </td>
                        <td role="gridcell">
                          {user.club ? (
                            <Link
                              href={`/admin/clubs/${user.club.id}`}
                              className="im-entity-link"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.219-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 016 4.193V3.75z" clipRule="evenodd" />
                              </svg>
                              {user.club.name}
                            </Link>
                          ) : (
                            <span className="im-no-entity">—</span>
                          )}
                        </td>
                        <td role="gridcell">
                          <Badge 
                            variant={user.blocked ? "blocked" : "active"}
                            icon={<StatusIcon blocked={user.blocked} />}
                          >
                            {user.blocked ? t("users.status.blocked") : t("users.status.active")}
                          </Badge>
                        </td>
                        <td className="im-date-cell" role="gridcell">
                          <Tooltip content={formatDateTime(user.createdAt)}>
                            <span>{formatDate(user.createdAt)}</span>
                          </Tooltip>
                        </td>
                        <td className="im-date-cell" role="gridcell">
                          <Tooltip content={user.lastActivity ? formatDateTime(user.lastActivity) : t("users.neverLoggedIn")}>
                            <span>{formatDate(user.lastActivity)}</span>
                          </Tooltip>
                        </td>
                        <td role="gridcell">
                          <div className="im-user-actions">
                            <Tooltip content={t("users.actions.viewDetails")}>
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => handleViewUser(user)}
                                aria-label={t("users.actions.viewDetails")}
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z" clipRule="evenodd" />
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
                                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
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
                                    className={user.blocked ? "im-btn-unblock" : "im-btn-block"}
                                  >
                                    {user.blocked ? (
                                      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                      </svg>
                                    ) : (
                                      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
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
                                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
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

            {/* Pagination */}
            <Card className="im-pagination-card">
              <div className="im-pagination">
                <div className="im-pagination-info">
                  {t("users.pagination.showing", {
                    start: (pagination.page - 1) * pagination.pageSize + 1,
                    end: Math.min(pagination.page * pagination.pageSize, pagination.totalCount),
                    total: pagination.totalCount,
                  })}
                </div>
                <div className="im-pagination-controls">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page <= 1}
                    aria-label={t("users.pagination.previous")}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                    {t("users.pagination.previous")}
                  </Button>
                  <div className="im-pagination-pages">
                    {t("users.pagination.pageOf", {
                      page: pagination.page,
                      total: pagination.totalPages,
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    aria-label={t("users.pagination.next")}
                  >
                    {t("users.pagination.next")}
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </Button>
                  <div className="im-pagination-page-size">
                    <label htmlFor="page-size">{t("users.pagination.pageSize")}</label>
                    <Select
                      id="page-size"
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
            <div className="im-admin-users-loading">
              <div className="im-admin-users-loading-spinner" aria-hidden="true" />
            </div>
          ) : userDetail ? (
            <>
              <div className="im-user-detail-header">
                <div className="im-user-detail-avatar">
                  {userDetail.name ? userDetail.name.charAt(0).toUpperCase() : userDetail.email.charAt(0).toUpperCase()}
                </div>
                <div className="im-user-detail-identity">
                  <h3>{userDetail.name || userDetail.email}</h3>
                  <p>{userDetail.email}</p>
                </div>
              </div>
              <div className="im-user-detail-section">
                <h4>{t("users.sections.basicInfo")}</h4>
                <div className="im-user-detail-grid">
                  <div className="im-user-detail-item">
                    <span className="im-user-detail-label">{t("users.columns.role")}</span>
                    <Badge 
                      variant={userDetail.role as "root_admin" | "organization_admin" | "club_admin" | "user"}
                      icon={<RoleIcon role={userDetail.role} />}
                    >
                      {getRoleLabel(userDetail.role)}
                    </Badge>
                  </div>
                  <div className="im-user-detail-item">
                    <span className="im-user-detail-label">{t("users.columns.status")}</span>
                    <Badge variant={userDetail.blocked ? "blocked" : "active"}>
                      {userDetail.blocked ? t("users.status.blocked") : t("users.status.active")}
                    </Badge>
                  </div>
                  <div className="im-user-detail-item">
                    <span className="im-user-detail-label">{t("users.columns.registeredAt")}</span>
                    <span className="im-user-detail-value">{formatDateTime(userDetail.createdAt)}</span>
                  </div>
                  <div className="im-user-detail-item">
                    <span className="im-user-detail-label">{t("users.columns.lastLogin")}</span>
                    <span className="im-user-detail-value">{formatDateTime(userDetail.lastLoginAt)}</span>
                  </div>
                </div>
              </div>

              {userDetail.memberships.length > 0 && (
                <div className="im-user-detail-section">
                  <h4>{t("users.sections.organizations")}</h4>
                  <div className="im-membership-list">
                    {userDetail.memberships.map((m) => (
                      <div key={m.id} className="im-membership-item">
                        <div className="im-membership-icon">
                          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 010-1.5h12.5a.75.75 0 010 1.5H16v13h.25a.75.75 0 010 1.5h-12.5a.75.75 0 010-1.5H4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="im-membership-info">
                          <span className="im-membership-name">{m.organization.name}</span>
                          <span className="im-membership-role">
                            {m.role} {m.isPrimaryOwner && <Badge variant="primary">{t("organizations.owner")}</Badge>}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {userDetail.clubMemberships.length > 0 && (
                <div className="im-user-detail-section">
                  <h4>{t("users.sections.clubs")}</h4>
                  <div className="im-membership-list">
                    {userDetail.clubMemberships.map((m) => (
                      <div key={m.id} className="im-membership-item">
                        <div className="im-membership-icon">
                          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="im-membership-info">
                          <span className="im-membership-name">{m.club.name}</span>
                          <span className="im-membership-role">{m.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {userDetail.bookings.length > 0 && (
                <div className="im-user-detail-section">
                  <h4>{t("users.sections.recentBookings")}</h4>
                  <div className="im-user-bookings-list">
                    {userDetail.bookings.map((b) => (
                      <div key={b.id} className="im-user-booking-item">
                        <div className="im-booking-header">
                          <span className="im-booking-court">{b.court.club.name} - {b.court.name}</span>
                          <Badge variant={b.status === "confirmed" ? "success" : "warning"}>{b.status}</Badge>
                        </div>
                        <span className="im-booking-time">{formatDateTime(b.start)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="im-no-details">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p>{t("users.noDetailsAvailable")}</p>
            </div>
          )}
          <div className="im-modal-actions">
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
        <div className="im-edit-role-modal">
          <p className="im-edit-role-user">
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

          <div className="im-modal-actions">
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
        <div className="im-delete-modal">
          <div className="im-delete-icon">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="im-delete-warning">{t("users.deleteWarning")}</p>
          <p className="im-delete-message">
            {t("users.deleteConfirmMessage", {
              name: selectedUser?.name ?? selectedUser?.email ?? "",
            })}
          </p>
          <div className="im-modal-actions">
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
