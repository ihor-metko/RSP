"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { PageHeader, Badge, Card, Tooltip, Button } from "@/components/ui";
import { TableSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { useListController, useDeferredLoading } from "@/hooks";
import {
  ListControllerProvider,
  ListToolbar,
  ListSearch,
  OrgSelector,
  ClubSelector,
  RoleFilter,
  StatusFilter,
  DateRangeFilter,
  QuickPresets,
  PaginationControls,
} from "@/components/list-controls";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import { useUserStore } from "@/stores/useUserStore";
import { CreateAdminModal } from "@/components/admin/admin-wizard";
import type { CreateAdminWizardConfig } from "@/types/adminWizard";
import type { UserRole, UserStatus } from "@/types/adminUser";

import "./page.css";

/* Icon Components */

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

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

// Define filters interface
interface UserFilters extends Record<string, unknown> {
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
  organizationFilter: string;
  clubFilter: string;
  dateRangeField: "createdAt" | "lastActive";
  dateFrom: string;
  dateTo: string;
  activeLast30d: boolean;
  neverBooked: boolean;
  showOnlyAdmins: boolean;
  showOnlyUsers: boolean;
}

export default function AdminUsersPage() {
  const t = useTranslations();
  const router = useRouter();
  
  // Use store for auth state
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const hasAnyRole = useUserStore((state) => state.hasAnyRole);

  // Use list controller hook for persistent filters
  const controller = useListController<UserFilters>({
    entityKey: "users",
    defaultFilters: {
      searchQuery: "",
      roleFilter: "",
      statusFilter: "",
      organizationFilter: "",
      clubFilter: "",
      dateRangeField: "createdAt",
      dateFrom: "",
      dateTo: "",
      activeLast30d: false,
      neverBooked: false,
      showOnlyAdmins: false,
      showOnlyUsers: false,
    },
    defaultSortBy: "lastActive",
    defaultSortOrder: "desc",
    defaultPage: 1,
    defaultPageSize: 25,
  });

  const {
    filters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    page,
    pageSize,
  } = controller;

  // Get users from store
  const users = useAdminUsersStore((state) => state.users);
  const pagination = useAdminUsersStore((state) => state.pagination);
  const loading = useAdminUsersStore((state) => state.loading);
  const error = useAdminUsersStore((state) => state.error);
  const fetchUsersFromStore = useAdminUsersStore((state) => state.fetchUsers);

  // Use deferred loading to prevent flicker on fast responses
  const deferredLoading = useDeferredLoading(loading);

  const totalCount = pagination?.totalCount || 0;
  const totalPages = pagination?.totalPages || 0;

  // State for Create Admin modal
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);

  // Error key for translated messages
  const [errorKey, setErrorKey] = useState<string>("");

  // showToast function removed as we no longer show in-page toasts

  const fetchUsers = useCallback(async () => {
    try {
      await fetchUsersFromStore({
        page,
        pageSize,
        filters: {
          search: filters.searchQuery,
          role: (filters.roleFilter as UserRole) || undefined,
          status: (filters.statusFilter as UserStatus) || undefined,
          organizationId: filters.organizationFilter || undefined,
          clubId: filters.clubFilter || undefined,
          sortBy: sortBy as "name" | "email" | "createdAt" | "lastLoginAt" | "lastActive" | "totalBookings",
          sortOrder: sortOrder as "asc" | "desc",
          dateRangeField: filters.dateRangeField,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          activeLast30d: filters.activeLast30d || undefined,
          neverBooked: filters.neverBooked || undefined,
          showOnlyAdmins: filters.showOnlyAdmins || undefined,
          showOnlyUsers: filters.showOnlyUsers || undefined,
        },
        force: true,
      });
      setErrorKey("");
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setErrorKey("users.failedToLoad");
    }
  }, [page, pageSize, sortBy, sortOrder, filters, fetchUsersFromStore]);

  useEffect(() => {
    // Wait for hydration and store initialization
    if (!isHydrated || isLoading) return;

    // Check if user has any admin role (ROOT_ADMIN, ORGANIZATION_ADMIN, CLUB_OWNER, or CLUB_ADMIN)
    if (!isLoggedIn || !hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN", "CLUB_OWNER", "CLUB_ADMIN"])) {
      router.push("/auth/sign-in");
      return;
    }

    fetchUsers();
  }, [isLoggedIn, isLoading, router, fetchUsers, isHydrated, hasAnyRole]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleOpenCreateAdminModal = () => {
    setIsCreateAdminModalOpen(true);
  };

  const handleCloseCreateAdminModal = () => {
    setIsCreateAdminModalOpen(false);
  };

  // Get wizard configuration based on user role
  const getWizardConfig = useCallback((): CreateAdminWizardConfig => {
    const adminStatus = useUserStore.getState().adminStatus;

    if (adminStatus?.adminType === "root_admin") {
      // Root admin can create both org and club admins
      return {
        context: "root",
        allowedRoles: ["ORGANIZATION_ADMIN", "CLUB_ADMIN"],
        onSuccess: (userId) => {
          // Refresh users list after successful creation
          fetchUsers();
          router.push(`/admin/users/${userId}`);
        },
      };
    } else if (adminStatus?.adminType === "organization_admin" && adminStatus.managedIds.length > 0) {
      // Organization admin can create admins for their organization
      return {
        context: "organization",
        defaultOrgId: adminStatus.managedIds[0],
        allowedRoles: ["ORGANIZATION_ADMIN", "CLUB_ADMIN"],
        onSuccess: () => {
          // Refresh users list after successful creation
          fetchUsers();
        },
      };
    }

    // Fallback (shouldn't reach here due to auth check)
    return {
      context: "root",
      allowedRoles: ["ORGANIZATION_ADMIN"],
      onSuccess: () => {
        fetchUsers();
      },
    };
  }, [fetchUsers, router]);

  const formatDate = (dateInput: string | Date | null) => {
    if (!dateInput) return "-";
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return date.toLocaleDateString("uk-UA", {
      timeZone: "Europe/Kyiv",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatDateTime = (dateInput: string | Date | null) => {
    if (!dateInput) return "-";
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return date.toLocaleString("uk-UA", {
      timeZone: "Europe/Kyiv",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const isLoadingData = !isHydrated || isLoading || deferredLoading;

  return (
    <main className="im-admin-users-page">
      {isLoadingData ? (
        <PageHeaderSkeleton showDescription />
      ) : (
        <PageHeader
          title={t("users.title")}
          description={t("users.subtitle")}
        />
      )}

      {/* No toast notifications needed */}

      <section className="rsp-content">
        {/* Filters using list-controls components - consolidated toolbar */}
        {!isLoadingData && (
          <div className="mb-4">
          <ListControllerProvider controller={controller}>
            <ListToolbar 
              showReset 
              actionButton={
                hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN"]) && (
                  <Button onClick={handleOpenCreateAdminModal} variant="primary" aria-label={t("users.createUser")} className="im-create-user-btn">
                    <UserPlusIcon />
                    {t("users.createUser")}
                  </Button>
                )
              }
            >
              <div className="full-row flex w-full gap-4">
                <ListSearch
                  className="flex-1"
                  placeholder={t("users.searchPlaceholder")}
                  filterKey="searchQuery"
                />

                <QuickPresets<UserFilters>
                  className="flex-1"
                  presets={[
                    {
                      id: "active_last_30d",
                      label: t("users.quickFilters.activeLast30d"),
                      filters: { activeLast30d: true },
                    },
                    {
                      id: "show_only_admins",
                      label: t("users.quickFilters.showOnlyAdmins"),
                      filters: { showOnlyAdmins: true, showOnlyUsers: false },
                    },
                    {
                      id: "show_only_users",
                      label: t("users.quickFilters.showOnlyUsers"),
                      filters: { showOnlyUsers: true, showOnlyAdmins: false },
                    },
                  ]}
                />
              </div>

              <div className="full-row flex w-full gap-4">
                <OrgSelector
                  filterKey="organizationFilter"
                  label={t("users.filterByOrganization")}
                  placeholder={t("users.allOrganizations")}
                />

                <ClubSelector
                  filterKey="clubFilter"
                  orgFilterKey="organizationFilter"
                  label={t("users.filterByClub")}
                  placeholder={t("users.allClubs")}
                />

                <RoleFilter
                  filterKey="roleFilter"
                  label={t("users.filterByRole")}
                  roles={[
                    { value: "root_admin", label: t("users.roles.rootAdmin") },
                    { value: "organization_admin", label: t("users.roles.organizationAdmin") },
                    { value: "club_owner", label: t("users.roles.clubOwner") },
                    { value: "club_admin", label: t("users.roles.clubAdmin") },
                    { value: "user", label: t("users.roles.user") },
                  ]}
                />
              </div>

              <div className="full-row flex w-full gap-4">
                <StatusFilter
                  className="flex-1"
                  filterKey="statusFilter"
                  label={t("users.filterByStatus")}
                  statuses={[
                    { value: "active", label: t("users.status.active") },
                    { value: "blocked", label: t("users.status.blocked") },
                    { value: "suspended", label: t("users.status.suspended") },
                    { value: "invited", label: t("users.status.invited") },
                    { value: "deleted", label: t("users.status.deleted") },
                  ]}
                />

                <DateRangeFilter
                  field={filters.dateRangeField}
                  label={t("users.dateRange.createdAt")}
                  fromKey="dateFrom"
                  toKey="dateTo"
                  fromLabel={t("users.dateRange.from")}
                  toLabel={t("users.dateRange.to")}
                />
              </div>
            </ListToolbar>
          </ListControllerProvider>
          </div>
        )}

        {(error || errorKey) && (
          <div className="im-error-alert" role="alert">
            <span className="im-error-icon">!</span>
            <span>{error || (errorKey && t(errorKey))}</span>
          </div>
        )}

        {isLoadingData ? (
          <TableSkeleton rows={pageSize > 20 ? 20 : pageSize} columns={7} showHeader />
        ) : users.length === 0 ? (
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
                    <th>{t("users.columns.email")}</th>
                    <th>{t("users.columns.role")}</th>
                    <th
                      className={`im-th-sortable ${sortBy === "lastActive" ? "im-th-sorted" : ""}`}
                      onClick={() => handleSort("lastActive")}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("lastActive")}
                      tabIndex={0}
                      role="button"
                      aria-sort={sortBy === "lastActive" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                    >
                      <span className="im-th-content">
                        {t("users.columns.lastActive")}
                        <span className="im-sort-indicator" aria-hidden="true">
                          {sortBy === "lastActive" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </span>
                    </th>
                    <th
                      className={`im-th-sortable ${sortBy === "totalBookings" ? "im-th-sorted" : ""}`}
                      onClick={() => handleSort("totalBookings")}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("totalBookings")}
                      tabIndex={0}
                      role="button"
                      aria-sort={sortBy === "totalBookings" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                    >
                      <span className="im-th-content">
                        {t("users.columns.totalBookings")}
                        <span className="im-sort-indicator" aria-hidden="true">
                          {sortBy === "totalBookings" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </span>
                    </th>
                    <th
                      className={`im-th-sortable ${sortBy === "createdAt" ? "im-th-sorted" : ""}`}
                      onClick={() => handleSort("createdAt")}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("createdAt")}
                      tabIndex={0}
                      role="button"
                      aria-sort={sortBy === "createdAt" ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                    >
                      <span className="im-th-content">
                        {t("users.columns.createdAt")}
                        <span className="im-sort-indicator" aria-hidden="true">
                          {sortBy === "createdAt" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="im-users-table-body">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="im-user-row im-user-row--clickable"
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.code === "Enter" || e.code === "Space") {
                          e.preventDefault();
                          router.push(`/admin/users/${user.id}`);
                        }
                      }}
                      aria-label={t("users.actions.viewUserDetail", { name: user.name || user.email || "" })}
                    >
                      <td className="im-td-user">
                        <div className="im-user-info">
                          <div className="im-user-avatar">
                            {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <Link href={`/admin/users/${user.id}`} className="im-user-name-link">
                            {user.name || t("users.unnamed")}
                          </Link>
                        </div>
                      </td>
                      {/* Email (mailto link) */}
                      <td className="im-td-email">
                        <a href={`mailto:${user.email}`} className="im-email-link">
                          <MailIcon />
                          <span>{user.email}</span>
                        </a>
                      </td>
                      {/* Role (with org/club info below, no avatars) */}
                      <td className="im-td-role">
                        <div className="im-role-cell">
                          <Badge
                            variant={getRoleBadgeVariant(user.role)}
                            icon={getRoleIcon(user.role)}
                          >
                            {getRoleLabel(user.role)}
                          </Badge>
                          {user.organization && (
                            <div className="im-role-context">
                              {t("users.org")}: {user.organization.name}
                            </div>
                          )}
                          {user.club && (
                            <div className="im-role-context">
                              {t("users.club")}: {user.club.name}
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Last active / Last login (Europe/Kyiv timezone) */}
                      <td className="im-td-date">
                        <Tooltip content={user.lastActivity ? formatDateTime(user.lastActivity) : t("users.neverActive")}>
                          <div className="im-date-display">
                            <CalendarIcon />
                            <span>{user.lastActivity ? formatDateTime(user.lastActivity) : t("users.never")}</span>
                          </div>
                        </Tooltip>
                      </td>
                      {/* Total bookings (with last 30d subtext) */}
                      <td className="im-td-bookings">
                        <div className="im-bookings-cell">
                          <span className="im-bookings-total">{user.totalBookings || 0}</span>
                          <span className="im-bookings-recent">
                            {user.bookingsLast30d || 0} {t("users.inLast30d")}
                          </span>
                        </div>
                      </td>
                      {/* Created at */}
                      <td className="im-td-date">
                        <Tooltip content={user.createdAt ? formatDateTime(user.createdAt) : t("users.noCreationDate")}>
                          <div className="im-date-display">
                            <CalendarIcon />
                            <span>{formatDate(user.createdAt)}</span>
                          </div>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination using list-controls component */}
            <ListControllerProvider controller={controller}>
              <PaginationControls
                totalCount={totalCount}
                totalPages={totalPages}
                showPageSize={true}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </ListControllerProvider>
          </>
        )}
      </section>

      {/* Create Admin Modal */}
      <CreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={handleCloseCreateAdminModal}
        config={getWizardConfig()}
      />
    </main>
  );
}
