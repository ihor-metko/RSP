"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IMLink, PageHeader, Select } from "@/components/ui";
import { AdminClubCard } from "@/components/admin/AdminClubCard";
import { CardListSkeleton } from "@/components/ui/skeletons";
import { useListController, useDeferredLoading } from "@/hooks";
import {
  ListControllerProvider,
  ListToolbar,
  ListSearch,
  OrgSelector,
  SortSelect,
  PaginationControls,
  QuickPresets,
} from "@/components/list-controls";
import { useUserStore } from "@/stores/useUserStore";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { SPORT_TYPE_OPTIONS, SportType } from "@/constants/sports";
import "@/components/admin/AdminClubCard.css";

// Define filters interface
interface ClubFilters extends Record<string, unknown> {
  searchQuery: string;
  organizationFilter: string;
  selectedCity: string;
  selectedStatus: string;
  selectedSportType: string;
  courtCountMin: string;
  courtCountMax: string;
}

export default function AdminClubsPage() {
  const t = useTranslations();
  const router = useRouter();

  // Use deferred loading to prevent flicker on fast responses
  const clubs = useAdminClubStore((state) => state.clubs);
  const loadingClubs = useAdminClubStore((state) => state.loadingClubs);
  const clubsError = useAdminClubStore((state) => state.clubsError);
  const fetchClubsIfNeeded = useAdminClubStore((state) => state.fetchClubsIfNeeded);

  const deferredLoading = useDeferredLoading(loadingClubs);

  // Get admin status from user store
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingStore = useUserStore((state) => state.isLoading);
  const isHydrated = useUserStore((state) => state.isHydrated);

  // Track if we've performed the initial auth check to prevent redirects on page reload
  const hasPerformedAuthCheck = useRef(false);

  // Use list controller hook for persistent filters
  const controller = useListController<ClubFilters>({
    entityKey: "clubs",
    defaultFilters: {
      searchQuery: "",
      organizationFilter: "",
      selectedCity: "",
      selectedStatus: "",
      selectedSportType: "",
      courtCountMin: "",
      courtCountMax: "",
    },
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    defaultPage: 1,
    defaultPageSize: 25,
  });

  // Fetch clubs from store when component mounts or organizationFilter changes
  useEffect(() => {
    // Wait for hydration before checking auth
    if (!isHydrated || isLoadingStore) return;

    // Only perform auth redirect on the first check, not on page reloads
    if (!hasPerformedAuthCheck.current) {
      hasPerformedAuthCheck.current = true;
      
      if (!isLoggedIn) {
        router.push("/auth/sign-in");
        return;
      }

      // User is not an admin, redirect
      if (!adminStatus?.isAdmin) {
        router.push("/auth/sign-in");
        return;
      }
    }

    // Fetch clubs if user is admin
    if (adminStatus?.isAdmin) {
      fetchClubsIfNeeded({ 
        organizationId: controller.filters.organizationFilter || null 
      }).catch((err) => {
        console.error("Failed to fetch clubs:", err);
      });
    }
  }, [isLoggedIn, isLoadingStore, adminStatus, router, fetchClubsIfNeeded, controller.filters.organizationFilter, isHydrated]);

  // Client-side filtering and sorting
  const filteredAndSortedClubs = useMemo(() => {
    let result = [...clubs];

    // Filter by search query
    if (controller.filters.searchQuery) {
      const query = controller.filters.searchQuery.toLowerCase();
      result = result.filter(
        (club) =>
          club.name.toLowerCase().includes(query) ||
          club.location?.toLowerCase().includes(query) ||
          club.city?.toLowerCase().includes(query)
      );
    }

    // Filter by city
    if (controller.filters.selectedCity) {
      result = result.filter((club) => club.city === controller.filters.selectedCity);
    }

    // Filter by status
    if (controller.filters.selectedStatus) {
      result = result.filter((club) => club.status === controller.filters.selectedStatus);
    }

    // Filter by sport type
    if (controller.filters.selectedSportType) {
      result = result.filter((club) => 
        club.supportedSports?.includes(controller.filters.selectedSportType as SportType)
      );
    }

    // Filter by court count range
    if (controller.filters.courtCountMin || controller.filters.courtCountMax) {
      result = result.filter((club) => {
        const courtCount = club.courtCount || 0;
        const min = controller.filters.courtCountMin ? parseInt(controller.filters.courtCountMin) : 0;
        const max = controller.filters.courtCountMax ? parseInt(controller.filters.courtCountMax) : Infinity;
        return courtCount >= min && courtCount <= max;
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (controller.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "courtCount":
          comparison = (a.courtCount || 0) - (b.courtCount || 0);
          break;
      }
      return controller.sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [clubs, controller.filters, controller.sortBy, controller.sortOrder]);

  // Paginated clubs
  const paginatedClubs = useMemo(() => {
    const startIndex = (controller.page - 1) * controller.pageSize;
    return filteredAndSortedClubs.slice(startIndex, startIndex + controller.pageSize);
  }, [filteredAndSortedClubs, controller.page, controller.pageSize]);

  // Total pages
  const totalPages = Math.ceil(filteredAndSortedClubs.length / controller.pageSize);
  const totalCount = filteredAndSortedClubs.length;

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
  const showOrganizationFilter = adminStatus?.adminType === "root_admin";

  // Show skeleton loaders instead of blocking spinner (include hydration state)
  const isLoading = !isHydrated || isLoadingStore || deferredLoading;

  // Sort options for SortSelect component
  const sortOptions = [
    { key: "name", label: t("admin.clubs.sortNameAsc"), direction: "asc" as const },
    { key: "name", label: t("admin.clubs.sortNameDesc"), direction: "desc" as const },
    { key: "createdAt", label: t("admin.clubs.sortNewest"), direction: "desc" as const },
    { key: "createdAt", label: t("admin.clubs.sortOldest"), direction: "asc" as const },
    { key: "courtCount", label: t("admin.clubs.sortCourts"), direction: "desc" as const },
  ];

  // Quick filter presets for court count
  const quickFilterPresets = [
    {
      id: "small_clubs",
      label: t("admin.clubs.smallClubs"),
      filters: {
        courtCountMin: "",
        courtCountMax: "2",
      },
    },
    {
      id: "large_clubs",
      label: t("admin.clubs.largeClubs"),
      filters: {
        courtCountMin: "5",
        courtCountMax: "",
      },
    },
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
            <div className="full-row flex w-full gap-4">
              <ListSearch
                className="flex-1"
                placeholder={t("common.search")}
                filterKey="searchQuery"
              />

              <QuickPresets
                className="flex-1"
                presets={quickFilterPresets} />
            </div>

            <div className="full-row flex w-full gap-4">
              {showOrganizationFilter && (
                <OrgSelector
                  filterKey="organizationFilter"
                  label={t("admin.clubs.filterByOrganization")}
                  placeholder={t("admin.clubs.allOrganizations")}
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
            </div>

            <div className="full-row flex w-full gap-4">
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

              <SortSelect
                options={sortOptions}
                label={t("admin.clubs.sortBy")}
              />
            </div>
          </ListToolbar>

          {clubsError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
              {clubsError}
            </div>
          )}

          {isLoading ? (
            <CardListSkeleton count={controller.pageSize > 12 ? 12 : controller.pageSize} variant="default" />
          ) : paginatedClubs.length === 0 ? (
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
                {paginatedClubs.map((club) => (
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
