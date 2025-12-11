/**
 * INTEGRATION EXAMPLE: How to use List Controls in admin pages
 * 
 * This file demonstrates how to refactor admin list pages (Users, Clubs, etc.)
 * to use the reusable List Controls components.
 * 
 * Key changes from original implementation:
 * 1. Remove duplicate filter UI - use List Controls components instead
 * 2. Remove duplicate pagination UI - use PaginationControls component
 * 3. Optionally wrap components in ListControllerProvider for cleaner code
 */

"use client";

import { useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader, Breadcrumbs, Card } from "@/components/ui";
import { TableSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { useListController } from "@/hooks";

// Import List Controls
import {
  ListControllerProvider,
  ListToolbar,
  ListSearch,
  PaginationControls,
  SortSelect,
  OrgSelector,
  ClubSelector,
  RoleFilter,
  DateRangeFilter,
  QuickPresets,
} from "@/components/list-controls";

// Your existing stores
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";

// Define filters interface matching your existing filters
interface UserFilters {
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
  organizationFilter: string;
  clubFilter: string;
  dateFrom: string;
  dateTo: string;
  activeLast30d: boolean;
  neverBooked: boolean;
  showOnlyAdmins: boolean;
  showOnlyUsers: boolean;
}

export default function AdminUsersPageExample() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();

  // ==========================================
  // STEP 1: Initialize List Controller
  // ==========================================
  const controller = useListController<UserFilters>({
    entityKey: "users",
    defaultFilters: {
      searchQuery: "",
      roleFilter: "",
      statusFilter: "",
      organizationFilter: "",
      clubFilter: "",
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

  // ==========================================
  // STEP 2: Use existing stores (no changes)
  // ==========================================
  const users = useAdminUsersStore((state) => state.users);
  const pagination = useAdminUsersStore((state) => state.pagination);
  const loading = useAdminUsersStore((state) => state.loading);
  const error = useAdminUsersStore((state) => state.error);
  const fetchUsersFromStore = useAdminUsersStore((state) => state.fetchUsers);

  const totalCount = pagination?.totalCount || 0;
  const totalPages = pagination?.totalPages || 0;

  // ==========================================
  // STEP 3: Fetch data using controller state
  // ==========================================
  const fetchUsers = useCallback(async () => {
    try {
      await fetchUsersFromStore({
        page: controller.page,
        pageSize: controller.pageSize,
        filters: {
          search: controller.filters.searchQuery,
          role: controller.filters.roleFilter || undefined,
          status: controller.filters.statusFilter || undefined,
          organizationId: controller.filters.organizationFilter || undefined,
          clubId: controller.filters.clubFilter || undefined,
          sortBy: controller.sortBy,
          sortOrder: controller.sortOrder,
          dateFrom: controller.filters.dateFrom || undefined,
          dateTo: controller.filters.dateTo || undefined,
          activeLast30d: controller.filters.activeLast30d || undefined,
          neverBooked: controller.filters.neverBooked || undefined,
          showOnlyAdmins: controller.filters.showOnlyAdmins || undefined,
          showOnlyUsers: controller.filters.showOnlyUsers || undefined,
        },
        force: true,
      });
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, [controller.page, controller.pageSize, controller.sortBy, controller.sortOrder, controller.filters, fetchUsersFromStore]);

  // Auth check
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || !session.user.isRoot) {
      router.push("/auth/sign-in");
      return;
    }
    fetchUsers();
  }, [session, status, router, fetchUsers]);

  const isLoadingData = status === "loading" || loading;

  // ==========================================
  // STEP 4: Render UI with List Controls
  // ==========================================
  return (
    <ListControllerProvider controller={controller}>
      <main className="im-admin-users-page">
        {isLoadingData ? (
          <PageHeaderSkeleton showDescription />
        ) : (
          <PageHeader
            title={t("users.title")}
            description={t("users.subtitle")}
          />
        )}

        <section className="rsp-content">
          {!isLoadingData && (
            <Breadcrumbs
              items={[
                { label: t("breadcrumbs.home"), href: "/" },
                { label: t("breadcrumbs.admin"), href: "/admin/dashboard" },
                { label: t("users.breadcrumb") },
              ]}
              className="mb-6"
              ariaLabel={t("breadcrumbs.navigation")}
            />
          )}

          {/* ==========================================
              REPLACED: Old filter UI with List Controls
              ========================================== */}
          {!isLoadingData && (
            <>
              {/* Main Toolbar with Filters */}
              <ListToolbar showReset>
                <ListSearch 
                  placeholder={t("users.searchPlaceholder")}
                  filterKey="searchQuery"
                />

                <SortSelect
                  options={[
                    { key: 'lastActive', label: t("users.sort.lastActive"), direction: 'desc' },
                    { key: 'createdAt', label: t("users.sort.newest"), direction: 'desc' },
                    { key: 'createdAt', label: t("users.sort.oldest"), direction: 'asc' },
                    { key: 'name', label: t("users.sort.nameAsc"), direction: 'asc' },
                  ]}
                  label={t("users.sortBy")}
                />

                <RoleFilter
                  roles={[
                    { value: 'root_admin', label: t("users.roles.rootAdmin") },
                    { value: 'organization_admin', label: t("users.roles.organizationAdmin") },
                    { value: 'club_admin', label: t("users.roles.clubAdmin") },
                    { value: 'user', label: t("users.roles.user") },
                  ]}
                  filterKey="roleFilter"
                  label={t("users.filterByRole")}
                />

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
              </ListToolbar>

              {/* Quick Presets */}
              <QuickPresets
                presets={[
                  {
                    id: 'active_30d',
                    label: t("users.quickFilters.activeLast30d"),
                    filters: { activeLast30d: true },
                  },
                  {
                    id: 'never_booked',
                    label: t("users.quickFilters.neverBooked"),
                    filters: { neverBooked: true },
                  },
                  {
                    id: 'admins_only',
                    label: t("users.quickFilters.showOnlyAdmins"),
                    filters: { showOnlyAdmins: true, showOnlyUsers: false },
                  },
                  {
                    id: 'users_only',
                    label: t("users.quickFilters.showOnlyUsers"),
                    filters: { showOnlyUsers: true, showOnlyAdmins: false },
                  },
                ]}
              />

              {/* Advanced Date Range Filter */}
              <DateRangeFilter
                field="createdAt"
                label={t("users.dateRange.label")}
                fromKey="dateFrom"
                toKey="dateTo"
                fromLabel={t("users.dateRange.from")}
                toLabel={t("users.dateRange.to")}
              />
            </>
          )}

          {/* Error Display */}
          {error && (
            <div className="im-error-alert" role="alert">
              <span className="im-error-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoadingData ? (
            <TableSkeleton rows={controller.pageSize > 20 ? 20 : controller.pageSize} columns={7} showHeader />
          ) : users.length === 0 ? (
            <Card className="im-empty-state">
              <h3 className="im-empty-state-title">{t("users.noUsers")}</h3>
              <p className="im-empty-state-description">{t("users.noUsersDescription")}</p>
            </Card>
          ) : (
            <>
              {/* Your existing table UI - no changes needed */}
              <div className="im-users-table-container">
                <table className="im-users-table" aria-label={t("users.tableLabel")}>
                  {/* ... existing table markup ... */}
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      {/* ... other columns ... */}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        {/* ... existing row markup ... */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ==========================================
                  REPLACED: Old pagination UI with PaginationControls
                  ========================================== */}
              <PaginationControls
                totalCount={totalCount}
                totalPages={totalPages}
                showPageSize={true}
                pageSizeOptions={[10, 25, 50, 100]}
                t={(key, params) => {
                  // Pass translation function
                  const translations: Record<string, string> = {
                    "pagination.showing": t("users.pagination.showing", params),
                    "pagination.previous": t("users.pagination.previous"),
                    "pagination.next": t("users.pagination.next"),
                    "pagination.pageSize": t("users.pagination.pageSize"),
                  };
                  return translations[key] || key;
                }}
              />
            </>
          )}
        </section>
      </main>
    </ListControllerProvider>
  );
}

/**
 * MIGRATION NOTES:
 * 
 * 1. Code Removed:
 *    - All manual filter input components (search, selects, date inputs)
 *    - Manual pagination controls
 *    - Filter state management (moved to useListController)
 *    - Reset/clear filter logic (handled by ListToolbar)
 * 
 * 2. Code Added:
 *    - ListControllerProvider wrapper
 *    - List Control components (ListToolbar, ListSearch, etc.)
 *    - Import statements for new components
 * 
 * 3. Code Changed:
 *    - fetchUsers now reads from controller instead of local state
 *    - useEffect dependencies updated to use controller properties
 * 
 * 4. Benefits:
 *    - ~200-300 lines of duplicate UI code removed
 *    - Consistent filter UX across all admin pages
 *    - Automatic localStorage persistence
 *    - Better accessibility (built-in ARIA)
 *    - Easier to maintain and test
 * 
 * 5. SSR/Hydration Pattern:
 *    If you fetch initial data on the server:
 *    
 *    ```typescript
 *    // Server Component
 *    export default async function UsersPage() {
 *      const initialData = await fetchUsers({ page: 1, pageSize: 25 });
 *      return <UsersClient initialData={initialData} />;
 *    }
 *    
 *    // Client Component
 *    "use client";
 *    export function UsersClient({ initialData }) {
 *      const [data, setData] = useState(initialData);
 *      const controller = useListController({...});
 *      
 *      useEffect(() => {
 *        // Only fetch if filters have changed from defaults
 *        if (controller.isLoaded) {
 *          fetchUsers(controller).then(setData);
 *        }
 *      }, [controller.filters, controller.sortBy, controller.page]);
 *      
 *      // render...
 *    }
 *    ```
 */
