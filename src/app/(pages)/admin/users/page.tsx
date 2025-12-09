"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button, Input, Modal, PageHeader, Breadcrumbs, Select, Badge, Card, Tooltip } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useClubStore } from "@/stores/useClubStore";
import "./page.css";

/* Icon Components */
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
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
  const storeOrganizations = useOrganizationStore((state) => state.organizations);
  const fetchOrganizationsFromStore = useOrganizationStore((state) => state.fetchOrganizations);
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
      await fetchOrganizationsFromStore();
      // Don't map here - let useEffect handle it when store updates
    } catch {
      // Silent fail
    }
  }, [fetchOrganizationsFromStore]);

  // Update local organizations when store organizations change
  useEffect(() => {
    if (storeOrganizations.length > 0) {
      setOrganizations(storeOrganizations.map((org) => ({ id: org.id, name: org.name })));
    }
  }, [storeOrganizations]);

  const fetchClubs = useCallback(async () => {
    try {
      // Use store with inflight guard
      await useClubStore.getState().fetchClubsIfNeeded();
      const data = useClubStore.getState().clubs;
      setClubs(data.map((club) => ({ id: club.id, name: club.name })));
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

  const getRoleBadgeVariant = (role: string): "error" | "info" | "warning" | "default" => {
    const variants: Record<string, "error" | "info" | "warning" | "default"> = {
      root_admin: "error",
      organization_admin: "info",
      club_admin: "warning",
      user: "default",
    };
    return variants[role] || "default";
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "root_admin":
        return <ShieldIcon />;
      case "organization_admin":
        return <BuildingIcon />;
      case "club_admin":
        return <HomeIcon />;
      default:
        return <UserIcon />;
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
            { label: t("users.breadcrumb") },
          ]}
          className="mb-6"
          ariaLabel={t("breadcrumbs.navigation")}
        />

        {/* Filters Card */}
        <Card className="im-filters-card">
          <div className="im-filters-header">
            <div className="im-filters-title">
              <FilterIcon />
              <span>{t("users.filters")}</span>
            </div>
            {(searchQuery || roleFilter || statusFilter || organizationFilter || clubFilter) && (
              <Button variant="outline" size="small" onClick={handleClearFilters}>
                <XIcon />
                {t("users.clearFilters")}
              </Button>
            )}
          </div>
          <div className="im-filters-grid">
            <div className="im-filter-field im-filter-field--search">
              <div className="im-search-input-wrapper">
                <span className="im-search-icon"><SearchIcon /></span>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("users.searchPlaceholder")}
                  aria-label={t("common.search")}
                />
              </div>
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
            <span className="im-error-icon">!</span>
            <span>{error || (errorKey && t(errorKey))}</span>
          </div>
        )}

        {users.length === 0 && !loading ? (
          <Card className="im-empty-state">
            <div className="im-empty-state-icon">
              <UserIcon />
            </div>
            <h3 className="im-empty-state-title">{t("users.noUsers")}</h3>
            <p className="im-empty-state-description">{t("users.noUsersDescription")}</p>
          </Card>
        ) : (
          <>
            {/* Users Table */}
            <div className="im-users-table-container">
              <table className="im-users-table" aria-label={t("users.tableLabel")}>
                <thead className="im-users-table-head">
                  <tr>
                    <th
                      className={`im-th-sortable ${sortBy === "name" ? "im-th-sorted" : ""}`}
                      onClick={() => handleSort("name")}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("name")}
                      tabIndex={0}
                      role="button"
                      aria-sort={sortBy === "name" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                    >
                      <span className="im-th-content">
                        {t("users.columns.name")}
                        <span className="im-sort-indicator" aria-hidden="true">
                          {sortBy === "name" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </span>
                    </th>
                    <th
                      className={`im-th-sortable ${sortBy === "email" ? "im-th-sorted" : ""}`}
                      onClick={() => handleSort("email")}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("email")}
                      tabIndex={0}
                      role="button"
                      aria-sort={sortBy === "email" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                    >
                      <span className="im-th-content">
                        {t("users.columns.email")}
                        <span className="im-sort-indicator" aria-hidden="true">
                          {sortBy === "email" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </span>
                    </th>
                    <th>{t("users.columns.role")}</th>
                    <th>{t("users.columns.organization")}</th>
                    <th>{t("users.columns.club")}</th>
                    <th>{t("users.columns.status")}</th>
                    <th
                      className={`im-th-sortable ${sortBy === "createdAt" ? "im-th-sorted" : ""}`}
                      onClick={() => handleSort("createdAt")}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("createdAt")}
                      tabIndex={0}
                      role="button"
                      aria-sort={sortBy === "createdAt" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                    >
                      <span className="im-th-content">
                        {t("users.columns.registeredAt")}
                        <span className="im-sort-indicator" aria-hidden="true">
                          {sortBy === "createdAt" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </span>
                    </th>
                    <th
                      className={`im-th-sortable ${sortBy === "lastLoginAt" ? "im-th-sorted" : ""}`}
                      onClick={() => handleSort("lastLoginAt")}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("lastLoginAt")}
                      tabIndex={0}
                      role="button"
                      aria-sort={sortBy === "lastLoginAt" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                    >
                      <span className="im-th-content">
                        {t("users.columns.lastActivity")}
                        <span className="im-sort-indicator" aria-hidden="true">
                          {sortBy === "lastLoginAt" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </span>
                    </th>
                    <th className="im-th-actions">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="im-users-table-body">
                  {users.map((user) => (
                    <tr key={user.id} className="im-user-row">
                      <td className="im-td-user">
                        <div className="im-user-info">
                          <div className="im-user-avatar">
                            {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <span className="im-user-name">{user.name || "-"}</span>
                        </div>
                      </td>
                      <td className="im-td-email">
                        <div className="im-email-wrapper">
                          <MailIcon />
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td className="im-td-role">
                        <Badge 
                          variant={getRoleBadgeVariant(user.role)} 
                          icon={getRoleIcon(user.role)}
                        >
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="im-td-organization">
                        {user.organization ? (
                          <Link href="/admin/organizations" className="im-link">
                            <BuildingIcon />
                            <span>{user.organization.name}</span>
                          </Link>
                        ) : (
                          <span className="im-empty-cell">—</span>
                        )}
                      </td>
                      <td className="im-td-club">
                        {user.club ? (
                          <Link href={`/admin/clubs/${user.club.id}`} className="im-link">
                            <HomeIcon />
                            <span>{user.club.name}</span>
                          </Link>
                        ) : (
                          <span className="im-empty-cell">—</span>
                        )}
                      </td>
                      <td className="im-td-status">
                        <Badge variant={user.blocked ? "error" : "success"}>
                          <span className={`im-status-dot ${user.blocked ? "im-status-dot--blocked" : "im-status-dot--active"}`} />
                          {user.blocked ? t("users.status.blocked") : t("users.status.active")}
                        </Badge>
                      </td>
                      <td className="im-td-date">
                        <Tooltip content={formatDateTime(user.createdAt)}>
                          <div className="im-date-display">
                            <CalendarIcon />
                            <span>{formatDate(user.createdAt)}</span>
                          </div>
                        </Tooltip>
                      </td>
                      <td className="im-td-date">
                        <Tooltip content={user.lastActivity ? formatDateTime(user.lastActivity) : t("users.neverLoggedIn")}>
                          <div className="im-date-display">
                            <CalendarIcon />
                            <span>{formatDate(user.lastActivity)}</span>
                          </div>
                        </Tooltip>
                      </td>
                      <td className="im-td-actions">
                        <div className="im-actions-group">
                          <Tooltip content={t("users.actions.viewDetails")}>
                            <button
                              className="im-icon-btn im-icon-btn--view"
                              onClick={() => handleViewUser(user)}
                              aria-label={t("users.actions.view")}
                            >
                              <EyeIcon />
                            </button>
                          </Tooltip>
                          {user.role !== "root_admin" && (
                            <>
                              <Tooltip content={t("users.actions.editRole")}>
                                <button
                                  className="im-icon-btn im-icon-btn--edit"
                                  onClick={() => handleEditRole(user)}
                                  aria-label={t("users.actions.editRole")}
                                >
                                  <EditIcon />
                                </button>
                              </Tooltip>
                              <Tooltip content={user.blocked ? t("users.actions.unblock") : t("users.actions.block")}>
                                <button
                                  className={`im-icon-btn ${user.blocked ? "im-icon-btn--unblock" : "im-icon-btn--block"}`}
                                  onClick={() => handleToggleBlock(user)}
                                  disabled={processing}
                                  aria-label={user.blocked ? t("users.actions.unblock") : t("users.actions.block")}
                                >
                                  {user.blocked ? <UnlockIcon /> : <LockIcon />}
                                </button>
                              </Tooltip>
                              <Tooltip content={t("users.actions.delete")}>
                                <button
                                  className="im-icon-btn im-icon-btn--delete"
                                  onClick={() => handleDeleteUser(user)}
                                  disabled={processing}
                                  aria-label={t("users.actions.delete")}
                                >
                                  <TrashIcon />
                                </button>
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

            {/* Pagination */}
            <Card className="im-pagination-card">
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
                <button
                  className="im-pagination-btn"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                  aria-label={t("users.pagination.previous")}
                >
                  <ChevronLeftIcon />
                  <span className="im-pagination-btn-text">{t("users.pagination.previous")}</span>
                </button>
                <div className="im-pagination-pages">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = pagination.page <= 3 
                      ? i + 1 
                      : pagination.page + i - 2;
                    if (pageNum < 1 || pageNum > pagination.totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        className={`im-pagination-page ${pagination.page === pageNum ? "im-pagination-page--active" : ""}`}
                        onClick={() => setPagination((prev) => ({ ...prev, page: pageNum }))}
                        aria-label={`Page ${pageNum}`}
                        aria-current={pagination.page === pageNum ? "page" : undefined}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="im-pagination-btn"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  aria-label={t("users.pagination.next")}
                >
                  <span className="im-pagination-btn-text">{t("users.pagination.next")}</span>
                  <ChevronRightIcon />
                </button>
              </div>
              <div className="im-pagination-size">
                <label htmlFor="page-size" className="im-pagination-size-label">
                  {t("users.pagination.pageSize")}
                </label>
                <select
                  id="page-size"
                  className="im-pagination-size-select"
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
        <div className="im-modal-content">
          {loadingDetail ? (
            <div className="im-modal-loading">
              <div className="im-loading-spinner" />
            </div>
          ) : userDetail ? (
            <div className="im-user-details">
              {/* User Header */}
              <div className="im-user-details-header">
                <div className="im-user-details-avatar">
                  {userDetail.name ? userDetail.name.charAt(0).toUpperCase() : "?"}
                </div>
                <div className="im-user-details-info">
                  <h3 className="im-user-details-name">{userDetail.name || t("users.unnamed")}</h3>
                  <p className="im-user-details-email">{userDetail.email}</p>
                </div>
                <Badge variant={userDetail.blocked ? "error" : "success"}>
                  <span className={`im-status-dot ${userDetail.blocked ? "im-status-dot--blocked" : "im-status-dot--active"}`} />
                  {userDetail.blocked ? t("users.status.blocked") : t("users.status.active")}
                </Badge>
              </div>

              {/* Basic Info Section */}
              <div className="im-details-section">
                <h4 className="im-details-section-title">{t("users.sections.basicInfo")}</h4>
                <div className="im-details-grid">
                  <div className="im-details-item">
                    <span className="im-details-label">{t("users.columns.role")}</span>
                    <Badge variant={getRoleBadgeVariant(userDetail.role)} icon={getRoleIcon(userDetail.role)}>
                      {getRoleLabel(userDetail.role)}
                    </Badge>
                  </div>
                  <div className="im-details-item">
                    <span className="im-details-label">{t("users.columns.registeredAt")}</span>
                    <span className="im-details-value">{formatDateTime(userDetail.createdAt)}</span>
                  </div>
                  <div className="im-details-item">
                    <span className="im-details-label">{t("users.columns.lastLogin")}</span>
                    <span className="im-details-value">{formatDateTime(userDetail.lastLoginAt)}</span>
                  </div>
                </div>
              </div>

              {/* Organizations Section */}
              {userDetail.memberships.length > 0 && (
                <div className="im-details-section">
                  <h4 className="im-details-section-title">
                    <BuildingIcon />
                    {t("users.sections.organizations")}
                  </h4>
                  <div className="im-details-list">
                    {userDetail.memberships.map((m) => (
                      <div key={m.id} className="im-details-list-item">
                        <span className="im-details-list-name">{m.organization.name}</span>
                        <Badge variant="info" size="small">
                          {m.role} {m.isPrimaryOwner && `(${t("organizations.owner")})`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clubs Section */}
              {userDetail.clubMemberships.length > 0 && (
                <div className="im-details-section">
                  <h4 className="im-details-section-title">
                    <HomeIcon />
                    {t("users.sections.clubs")}
                  </h4>
                  <div className="im-details-list">
                    {userDetail.clubMemberships.map((m) => (
                      <div key={m.id} className="im-details-list-item">
                        <span className="im-details-list-name">{m.club.name}</span>
                        <Badge variant="warning" size="small">{m.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Bookings Section */}
              {userDetail.bookings.length > 0 && (
                <div className="im-details-section">
                  <h4 className="im-details-section-title">
                    <CalendarIcon />
                    {t("users.sections.recentBookings")}
                  </h4>
                  <div className="im-bookings-list">
                    {userDetail.bookings.map((b) => (
                      <div key={b.id} className="im-booking-item">
                        <div className="im-booking-info">
                          <span className="im-booking-venue">{b.court.club.name} - {b.court.name}</span>
                          <span className="im-booking-date">{formatDateTime(b.start)}</span>
                        </div>
                        <Badge variant={b.status === "confirmed" ? "success" : "default"} size="small">
                          {b.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="im-modal-empty">{t("users.noDetailsAvailable")}</p>
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
        <div className="im-modal-content">
          <div className="im-edit-role-header">
            <p className="im-edit-role-subtitle">
              {t("users.editRoleFor")}:
            </p>
            <div className="im-edit-role-user">
              <div className="im-user-avatar im-user-avatar--small">
                {selectedUser?.name ? selectedUser.name.charAt(0).toUpperCase() : "?"}
              </div>
              <span className="im-edit-role-user-name">{selectedUser?.name || selectedUser?.email}</span>
            </div>
          </div>

          <div className="im-role-options">
            <label
              className={`im-role-card ${newRole === "organization_admin" ? "im-role-card--selected" : ""}`}
            >
              <input
                type="radio"
                name="role"
                value="organization_admin"
                checked={newRole === "organization_admin"}
                onChange={(e) => setNewRole(e.target.value)}
                className="im-role-radio"
              />
              <div className="im-role-card-icon im-role-card-icon--org">
                <BuildingIcon />
              </div>
              <div className="im-role-card-content">
                <span className="im-role-card-title">{t("users.roles.organizationAdmin")}</span>
                <span className="im-role-card-description">{t("users.roleDescriptions.organizationAdmin")}</span>
              </div>
            </label>

            <label
              className={`im-role-card ${newRole === "club_admin" ? "im-role-card--selected" : ""}`}
            >
              <input
                type="radio"
                name="role"
                value="club_admin"
                checked={newRole === "club_admin"}
                onChange={(e) => setNewRole(e.target.value)}
                className="im-role-radio"
              />
              <div className="im-role-card-icon im-role-card-icon--club">
                <HomeIcon />
              </div>
              <div className="im-role-card-content">
                <span className="im-role-card-title">{t("users.roles.clubAdmin")}</span>
                <span className="im-role-card-description">{t("users.roleDescriptions.clubAdmin")}</span>
              </div>
            </label>

            <label
              className={`im-role-card ${newRole === "user" ? "im-role-card--selected" : ""}`}
            >
              <input
                type="radio"
                name="role"
                value="user"
                checked={newRole === "user"}
                onChange={(e) => setNewRole(e.target.value)}
                className="im-role-radio"
              />
              <div className="im-role-card-icon im-role-card-icon--user">
                <UserIcon />
              </div>
              <div className="im-role-card-content">
                <span className="im-role-card-title">{t("users.roles.user")}</span>
                <span className="im-role-card-description">{t("users.roleDescriptions.user")}</span>
              </div>
            </label>
          </div>

          {newRole === "organization_admin" && (
            <div className="im-role-entity-select">
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
            <div className="im-role-entity-select">
              <Select
                label={t("users.selectClub")}
                options={clubs.map((club) => ({ value: club.id, label: club.name }))}
                value={selectedClubId}
                onChange={setSelectedClubId}
                placeholder={t("users.selectClubPlaceholder")}
              />
            </div>
          )}

          <div className="im-modal-footer">
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
        <div className="im-modal-content im-delete-modal">
          <div className="im-delete-icon">
            <TrashIcon />
          </div>
          <p className="im-delete-warning">{t("users.deleteWarning")}</p>
          <p className="im-delete-message">
            {t("users.deleteConfirmMessage", {
              name: selectedUser?.name ?? selectedUser?.email ?? "",
            })}
          </p>
          <div className="im-modal-footer">
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
