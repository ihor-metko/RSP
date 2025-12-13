"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IMLink, PageHeader, Select } from "@/components/ui";
import { AdminClubCard } from "@/components/admin/AdminClubCard";
import { CardListSkeleton } from "@/components/ui/skeletons";
import { useListController } from "@/hooks";
import {
  ListControllerProvider,
  ListToolbar,
  ListSearch,
  OrgSelector,
  SortSelect,
  PaginationControls,
} from "@/components/list-controls";
import type { ClubWithCounts } from "@/types/club";
import { useUserStore } from "@/stores/useUserStore";
import { SPORT_TYPE_OPTIONS } from "@/constants/sports";
import "@/components/admin/AdminClubCard.css";

// Define filters interface
interface ClubFilters {
  searchQuery: string;
  organizationFilter: string;
  selectedCity: string;
  selectedStatus: string;
  selectedSportType: string;
}

/**
 * Admin Clubs Page
 *
 * Note: This page uses direct API calls instead of useClubStore because it requires
 * server-side filtering, pagination, and sorting with query parameters that are not
 * supported by the basic store implementation. Complex admin pages with server-side
 * features should continue using direct API calls for optimal performance.
 */

export default function AdminClubsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [clubs, setClubs] = useState<ClubWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get admin status from user store
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingStore = useUserStore((state) => state.isLoading);

  // Use list controller hook for persistent filters
  const controller = useListController<ClubFilters>({
    entityKey: "clubs",
    defaultFilters: {
      searchQuery: "",
      organizationFilter: "",
      selectedCity: "",
      selectedStatus: "",
      selectedSportType: "",
    },
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    defaultPage: 1,
    defaultPageSize: 25,
  });

  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Admin status is loaded from store via UserStoreInitializer

  const fetchClubs = useCallback(async () => {
    try {
      setLoading(true);
      // Build query parameters
      const params = new URLSearchParams();
      if (controller.filters.searchQuery) params.append("search", controller.filters.searchQuery);
      if (controller.filters.selectedCity) params.append("city", controller.filters.selectedCity);
      if (controller.filters.selectedStatus) params.append("status", controller.filters.selectedStatus);
      if (controller.filters.organizationFilter) params.append("organizationId", controller.filters.organizationFilter);
      if (controller.filters.selectedSportType) params.append("sportType", controller.filters.selectedSportType);
      params.append("sortBy", controller.sortBy);
      params.append("sortOrder", controller.sortOrder);
      params.append("page", controller.page.toString());
      params.append("pageSize", controller.pageSize.toString());

      const response = await fetch(`/api/admin/clubs?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch clubs");
      }
      const data = await response.json();
      setClubs(data.clubs || data); // Support both old and new response format
      if (data.pagination) {
        setTotalCount(data.pagination.totalCount);
        setTotalPages(data.pagination.totalPages);
      }
      setError("");
    } catch {
      setError(t("clubs.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [router, t, controller.filters, controller.sortBy, controller.sortOrder, controller.page, controller.pageSize]);

  useEffect(() => {
    if (isLoadingStore) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Fetch clubs if user is admin
    if (adminStatus?.isAdmin) {
      fetchClubs();
    } else {
      // User is not an admin, redirect
      router.push("/auth/sign-in");
    }
  }, [isLoggedIn, isLoadingStore, adminStatus, router, fetchClubs]);

  // Extract unique cities for filters (client-side for now)
  const cities = useMemo(() => {
    const citySet = new Set<string>();

    clubs.forEach((club) => {
      if (club.city) {
        citySet.add(club.city);
      }
    });

    return Array.from(citySet).sort();
  }, [clubs]);

  // Determine permissions based on admin type
  const canCreate = adminStatus?.adminType === "root_admin" || adminStatus?.adminType === "organization_admin";
  const showOrganizationFilter = adminStatus?.adminType === "root_admin";

  // Show skeleton loaders instead of blocking spinner
  const isLoading = isLoadingStore || loading;

  // Sort options for SortSelect component
  const sortOptions = [
    { key: "name", label: t("admin.clubs.sortNameAsc"), direction: "asc" as const },
    { key: "name", label: t("admin.clubs.sortNameDesc"), direction: "desc" as const },
    { key: "createdAt", label: t("admin.clubs.sortNewest"), direction: "desc" as const },
    { key: "createdAt", label: t("admin.clubs.sortOldest"), direction: "asc" as const },
    { key: "bookingCount", label: t("admin.clubs.sortBookings"), direction: "desc" as const },
  ];

  return (
    <ListControllerProvider controller={controller}>
      <main className="im-admin-clubs-page">
        <PageHeader
          title={t("admin.clubs.title")}
          description={t("admin.clubs.subtitle")}
        />

        <section className="rsp-content">
          {/* List Controls Toolbar with consolidated filters */}
          <ListToolbar
            showReset
            actionButton={
              <IMLink href="/admin/clubs/new" asButton variant="primary">
                {t("admin.clubs.createClub")}
              </IMLink>
            }
          >
            <ListSearch
              placeholder={t("common.search")}
              filterKey="searchQuery"
            />

            {showOrganizationFilter && (
              <OrgSelector
                filterKey="organizationFilter"
                label={t("admin.clubs.filterByOrganization")}
                placeholder={t("admin.clubs.allOrganizations")}
              />
            )}

            {cities.length > 0 && (
              <Select
                label={t("admin.clubs.filterByCity")}
                options={[
                  { value: "", label: t("admin.clubs.allCities") },
                  ...cities.map((city) => ({ value: city, label: city })),
                ]}
                value={controller.filters.selectedCity}
                onChange={(value) => controller.setFilter("selectedCity", value)}
                aria-label={t("admin.clubs.filterByCity")}
              />
            )}

            <Select
              label={t("admin.clubs.filterByStatus")}
              options={[
                { value: "", label: t("admin.clubs.allStatuses") },
                { value: "active", label: t("admin.clubs.statusActive") },
                { value: "draft", label: t("admin.clubs.statusDraft") },
                { value: "suspended", label: t("admin.clubs.statusSuspended") },
              ]}
              value={controller.filters.selectedStatus}
              onChange={(value) => controller.setFilter("selectedStatus", value)}
              aria-label={t("admin.clubs.filterByStatus")}
            />

            <Select
              label={t("admin.clubs.filterBySport")}
              options={[
                { value: "", label: t("admin.clubs.allSports") },
                ...SPORT_TYPE_OPTIONS.map((sport) => ({
                  value: sport.value,
                  label: sport.label,
                })),
              ]}
              value={controller.filters.selectedSportType}
              onChange={(value) => controller.setFilter("selectedSportType", value)}
              aria-label={t("admin.clubs.filterBySport")}
            />

            <SortSelect
              options={sortOptions}
              label={t("admin.clubs.sortBy")}
            />
          </ListToolbar>

          {error && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <CardListSkeleton count={controller.pageSize > 12 ? 12 : controller.pageSize} variant="default" />
          ) : clubs.length === 0 ? (
            <div className="im-admin-clubs-empty">
              <p className="im-admin-clubs-empty-text">
                {totalCount === 0
                  ? t("admin.clubs.noClubs")
                  : t("admin.clubs.noClubsMatch")}
              </p>
            </div>
          ) : (
            <>
              <section className="im-admin-clubs-grid">
                {clubs.map((club) => (
                  <AdminClubCard
                    key={club.id}
                    club={club}
                    showOrganization={showOrganizationFilter}
                  />
                ))}
              </section>

              {/* Pagination Controls */}
              <PaginationControls
                totalCount={totalCount}
                totalPages={totalPages}
                showPageSize={true}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </>
          )}
        </section>
      </main>
    </ListControllerProvider>
  );
}
