"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, IMLink, PageHeader } from "@/components/ui";
import { AdminClubCard } from "@/components/admin/AdminClubCard";
import type { ClubWithCounts } from "@/types/club";
import { useUserStore } from "@/stores/useUserStore";
import "@/components/admin/AdminClubCard.css";

type SortField = "name" | "city" | "createdAt" | "bookingCount";
type SortDirection = "asc" | "desc";

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

  // Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Admin status is loaded from store via UserStoreInitializer

  const fetchClubs = useCallback(async () => {
    try {
      setLoading(true);
      // Build query parameters
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedCity) params.append("city", selectedCity);
      if (selectedStatus) params.append("status", selectedStatus);
      if (selectedOrganization) params.append("organizationId", selectedOrganization);
      params.append("sortBy", sortField);
      params.append("sortOrder", sortDirection);
      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());

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
  }, [router, t, searchQuery, selectedCity, selectedStatus, selectedOrganization, sortField, sortDirection, page, pageSize]);

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

  // Extract unique organizations and cities for filters (client-side for now)
  const { organizations, cities } = useMemo(() => {
    const orgs = new Map<string, string>();
    const citySet = new Set<string>();

    clubs.forEach((club) => {
      if (club.organization) {
        orgs.set(club.organization.id, club.organization.name);
      }
      if (club.city) {
        citySet.add(club.city);
      }
    });

    return {
      organizations: Array.from(orgs.entries()).map(([id, name]) => ({ id, name })),
      cities: Array.from(citySet).sort(),
    };
  }, [clubs]);

  // Determine permissions based on admin type
  const canCreate = adminStatus?.adminType === "root_admin" || adminStatus?.adminType === "organization_admin";
  const showOrganizationFilter = adminStatus?.adminType === "root_admin";

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedOrganization("");
    setSelectedCity("");
    setSelectedStatus("");
    setSortField("createdAt");
    setSortDirection("desc");
    setPage(1);
  };

  if (isLoadingStore || loading) {
    return (
      <main className="im-admin-clubs-page">
        <div className="im-admin-clubs-loading">
          <div className="im-admin-clubs-loading-spinner" />
          <span className="im-admin-clubs-loading-text">{t("common.loading")}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="im-admin-clubs-page">
      <PageHeader
        title={t("admin.clubs.title")}
        description={t("admin.clubs.subtitle")}
      />

      <section className="rsp-content">
        {/* Actions Bar */}
        <div className="im-admin-clubs-actions">
          {/* Left side - Filters */}
          <div className="im-admin-clubs-actions-left">
            <Input
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="im-admin-clubs-search"
            />

            {showOrganizationFilter && organizations.length > 0 && (
              <select
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="im-admin-clubs-filter im-native-select"
                aria-label={t("admin.clubs.filterByOrganization")}
              >
                <option value="">{t("admin.clubs.allOrganizations")}</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}

            {cities.length > 0 && (
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="im-admin-clubs-filter im-native-select"
                aria-label={t("admin.clubs.filterByCity")}
              >
                <option value="">{t("admin.clubs.allCities")}</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="im-admin-clubs-filter im-native-select"
              aria-label={t("admin.clubs.filterByStatus")}
            >
              <option value="">{t("admin.clubs.allStatuses")}</option>
              <option value="active">{t("admin.clubs.statusActive")}</option>
              <option value="draft">{t("admin.clubs.statusDraft")}</option>
              <option value="suspended">{t("admin.clubs.statusSuspended")}</option>
            </select>

            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split("-") as [SortField, SortDirection];
                setSortField(field);
                setSortDirection(direction);
              }}
              className="im-admin-clubs-filter im-native-select"
              aria-label={t("admin.clubs.sortBy")}
            >
              <option value="createdAt-desc">{t("admin.clubs.sortNewest")}</option>
              <option value="createdAt-asc">{t("admin.clubs.sortOldest")}</option>
              <option value="name-asc">{t("admin.clubs.sortNameAsc")}</option>
              <option value="name-desc">{t("admin.clubs.sortNameDesc")}</option>
              <option value="city-asc">{t("admin.clubs.sortCityAsc")}</option>
              <option value="bookingCount-desc">{t("admin.clubs.sortBookings")}</option>
            </select>

            {(searchQuery || selectedOrganization || selectedCity || selectedStatus) && (
              <Button variant="outline" onClick={handleClearFilters}>
                {t("common.clearFilters")}
              </Button>
            )}
          </div>

          {/* Right side - Create Actions */}
          {canCreate && (
            <div className="im-admin-clubs-actions-right">
              <IMLink href="/admin/clubs/new" asButton variant="primary">
                {t("admin.clubs.createClub")}
              </IMLink>
            </div>
          )}
        </div>

        {error && (
          <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
            {error}
          </div>
        )}

        {clubs.length === 0 ? (
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
            {totalPages > 1 && (
              <div className="im-pagination">
                <div className="im-pagination-info">
                  {t("admin.clubs.showing")} {((page - 1) * pageSize) + 1} {t("admin.clubs.to")} {Math.min(page * pageSize, totalCount)} {t("admin.clubs.of")} {totalCount} {t("admin.clubs.results")}
                </div>
                <div className="im-pagination-controls">
                  <Button
                    variant="outline"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    {t("common.previous")}
                  </Button>
                  <span className="im-pagination-page">
                    {t("admin.clubs.page")} {page} {t("admin.clubs.of")} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    {t("common.next")}
                  </Button>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                    className="im-native-select im-pagination-size"
                  >
                    <option value="10">10 {t("admin.clubs.itemsPerPage")}</option>
                    <option value="20">20 {t("admin.clubs.itemsPerPage")}</option>
                    <option value="50">50 {t("admin.clubs.itemsPerPage")}</option>
                    <option value="100">100 {t("admin.clubs.itemsPerPage")}</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
