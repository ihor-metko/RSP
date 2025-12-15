"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, IMLink, PageHeader, Table } from "@/components/ui";
import type { TableColumn } from "@/components/ui";
import { TableSkeleton } from "@/components/ui/skeletons";
import { useUserStore } from "@/stores/useUserStore";
import { useListController } from "@/hooks";
import {
  ListControllerProvider,
  ListToolbar,
  ListSearch,
  SortSelect,
  StatusFilter,
  PaginationControls,
} from "@/components/list-controls";
import { SPORT_TYPE_OPTIONS } from "@/constants/sports";
import "./page.css";

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  clubCount?: number;
  superAdmins?: Array<{
    id: string;
    name: string | null;
    email: string;
    isPrimaryOwner: boolean;
  }>;
}

interface OrganizationFilters {
  searchQuery: string;
  sportTypeFilter: string;
}



export default function AdminOrganizationsPage() {
  const t = useTranslations();
  const router = useRouter();

  // User store for authentication
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingStore = useUserStore((state) => state.isLoading);
  const hasRole = useUserStore((state) => state.hasRole);

  // State for organizations data
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Use list controller hook for persistent filters
  const controller = useListController<OrganizationFilters>({
    entityKey: "organizations",
    defaultFilters: {
      searchQuery: "",
      sportTypeFilter: "",
    },
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    defaultPage: 1,
    defaultPageSize: 25,
  });



  // Fetch organizations based on controller state
  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (controller.filters.searchQuery) params.append("search", controller.filters.searchQuery);
      if (controller.filters.sportTypeFilter) params.append("sportType", controller.filters.sportTypeFilter);
      params.append("sortBy", controller.sortBy);
      params.append("sortOrder", controller.sortOrder);
      params.append("page", controller.page.toString());
      params.append("pageSize", controller.pageSize.toString());

      const response = await fetch(`/api/admin/organizations?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch organizations");
      }
      
      const data = await response.json();
      
      // Handle both array response and paginated response
      if (Array.isArray(data)) {
        setOrganizations(data);
        setTotalCount(data.length);
        setTotalPages(Math.ceil(data.length / controller.pageSize));
      } else {
        setOrganizations(data.organizations || data);
        setTotalCount(data.pagination?.totalCount || data.length);
        setTotalPages(data.pagination?.totalPages || Math.ceil((data.organizations?.length || 0) / controller.pageSize));
      }
      
      setError("");
    } catch (err) {
      setError(t("organizations.failedToLoad"));
      console.error("Error fetching organizations:", err);
    } finally {
      setLoading(false);
    }
  }, [router, t, controller.filters, controller.sortBy, controller.sortOrder, controller.page, controller.pageSize]);

  // Check authentication and fetch data
  useEffect(() => {
    if (isLoadingStore) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Check if user is root admin
    if (!hasRole("ROOT_ADMIN")) {
      router.push("/auth/sign-in");
      return;
    }

    fetchOrganizations();
  }, [isLoggedIn, isLoadingStore, hasRole, router, fetchOrganizations]);

  // Sort options for SortSelect component
  const sortOptions = [
    { key: "name", label: t("organizations.sortName") || "Name (A-Z)", direction: "asc" as const },
    { key: "name", label: t("organizations.sortName") || "Name (Z-A)", direction: "desc" as const },
    { key: "createdAt", label: t("organizations.sortDate") || "Newest", direction: "desc" as const },
    { key: "createdAt", label: t("organizations.sortDate") || "Oldest", direction: "asc" as const },
    { key: "clubCount", label: t("organizations.sortClubs") || "Most Clubs", direction: "desc" as const },
  ];

  // Sport type filter options
  const sportTypeOptions = [
    { value: "PADEL", label: "Padel" },
    { value: "TENNIS", label: "Tennis" },
    { value: "PICKLEBALL", label: "Pickleball" },
    ...SPORT_TYPE_OPTIONS.filter(opt => !["PADEL", "TENNIS", "PICKLEBALL"].includes(opt.value))
  ];

  // Define table columns
  const columns: TableColumn<Organization>[] = [
    {
      key: "name",
      header: t("organizations.name") || "Name",
      sortable: true,
      render: (org) => (
        <button
          onClick={() => router.push(`/admin/organizations/${org.id}`)}
          className="im-table-link"
          aria-label={t("organizations.viewDetails")}
        >
          {org.name}
        </button>
      ),
    },
    {
      key: "superAdmins",
      header: t("organizations.superAdmins") || "Super Admins",
      render: (org) => {
        const admins = org.superAdmins || [];
        if (admins.length === 0) return "-";
        return (
          <div className="im-table-admins">
            {admins.map((admin, idx) => (
              <span key={admin.id} className="im-table-admin-name">
                {admin.name || admin.email}
                {idx < admins.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "clubCount",
      header: t("organizations.clubs") || "Clubs",
      sortable: true,
      render: (org) => org.clubCount || 0,
    },
    {
      key: "actions",
      header: t("organizations.actions") || "Actions",
      render: (org) => (
        <Button
          size="small"
          variant="outline"
          onClick={() => router.push(`/admin/organizations/${org.id}`)}
          aria-label={`${t("organizations.view")} ${org.name}`}
        >
          {t("organizations.view") || "View"}
        </Button>
      ),
    },
  ];

  // Show skeleton loaders instead of blocking spinner
  const isLoading = isLoadingStore || loading;

  return (
    <ListControllerProvider controller={controller}>
      <main className="im-admin-organizations-page">
        <PageHeader
          title={t("organizations.title") || "Organizations"}
          description={t("organizations.subtitle") || "Manage organizations across the platform"}
        />

        <section className="rsp-content space-y-4">
          {/* List Controls Toolbar with consolidated filters */}
          <ListToolbar
            showReset
            actionButton={
              <IMLink href="/admin/organizations/new" asButton variant="primary">
                {t("organizations.createOrganization") || "Create Organization"}
              </IMLink>
            }
          >
            <ListSearch
              placeholder={t("organizations.searchOrganizations") || "Search organizations..."}
              filterKey="searchQuery"
            />
            
            <StatusFilter
              filterKey="sportTypeFilter"
              statuses={sportTypeOptions}
              label={t("organizations.filterBySport") || "Sport"}
              placeholder={t("organizations.allSports") || "All Sports"}
            />
            
            <SortSelect
              options={sortOptions}
              label={t("organizations.sortBy") || "Sort by"}
            />
          </ListToolbar>

          {/* Error Message */}
          {error && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {error}
            </div>
          )}

          {/* Organizations Table */}
          {isLoading ? (
            <TableSkeleton columns={4} rows={controller.pageSize > 12 ? 12 : controller.pageSize} />
          ) : organizations.length === 0 ? (
            <div className="im-admin-organizations-empty">
              <p className="im-admin-organizations-empty-text">
                {t("organizations.noOrganizations") || "No organizations found"}
              </p>
            </div>
          ) : (
            <Table
              columns={columns}
              data={organizations}
              keyExtractor={(org) => org.id}
              sortBy={controller.sortBy}
              sortOrder={controller.sortOrder}
              onSort={(key) => controller.setSortBy(key)}
              emptyMessage={t("organizations.noResults") || "No organizations match your filters"}
              ariaLabel={t("organizations.title") || "Organizations"}
            />
          )}

          {/* Pagination */}
          {!isLoading && organizations.length > 0 && (
            <PaginationControls
              totalCount={totalCount}
              totalPages={totalPages}
              showPageSize
            />
          )}
        </section>
      </main>
    </ListControllerProvider>
  );
}
