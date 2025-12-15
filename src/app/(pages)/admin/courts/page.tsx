"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, Modal, IMLink, PageHeader, Table } from "@/components/ui";
import type { TableColumn } from "@/components/ui";
import { TableSkeleton } from "@/components/ui/skeletons";
import { CourtForm, CourtFormData } from "@/components/admin/CourtForm";
import type { AdminType } from "@/app/api/me/admin-status/route";
import { useUserStore } from "@/stores/useUserStore";
import { SPORT_TYPE_OPTIONS } from "@/constants/sports";
import { useListController } from "@/hooks";
import {
  ListControllerProvider,
  ListToolbar,
  ListSearch,
  OrgSelector,
  ClubSelector,
  StatusFilter,
  SortSelect,
  PaginationControls,
  QuickPresets,
} from "@/components/list-controls";

interface Court {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  surface: string | null;
  indoor: boolean;
  /** Sport type (e.g., padel, tennis, squash) - used for filtering courts by sport */
  sportType: string | null;
  isActive: boolean;
  defaultPriceCents: number;
  createdAt: string;
  updatedAt: string;
  club: {
    id: string;
    name: string;
  };
  organization: {
    id: string;
    name: string;
  } | null;
  bookingCount: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// Define filters interface
interface CourtFilters {
  searchQuery: string;
  organizationFilter: string;
  clubFilter: string;
  statusFilter: string;
  sportTypeFilter: string;
  surfaceTypeFilter: string;
  indoorFilter: string;
  primeTimeFilter: string; // String to match filter pattern; "true" when Prime Time preset active
}

export default function AdminCourtsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [deletingCourt, setDeletingCourt] = useState<Court | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingStore = useUserStore((state) => state.isLoading);
  const isHydrated = useUserStore((state) => state.isHydrated);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  // Use list controller hook for persistent filters
  const controller = useListController<CourtFilters>({
    entityKey: "courts",
    defaultFilters: {
      searchQuery: "",
      organizationFilter: "",
      clubFilter: "",
      statusFilter: "",
      sportTypeFilter: "",
      surfaceTypeFilter: "",
      indoorFilter: "",
      primeTimeFilter: "",
    },
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    defaultPage: 1,
    defaultPageSize: 25,
  });

  // Admin status is loaded from store via UserStoreInitializer
  const fetchCourts = useCallback(async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams({
        page: controller.page.toString(),
        limit: controller.pageSize.toString(),
      });

      if (controller.filters.searchQuery) params.append("search", controller.filters.searchQuery);
      if (controller.filters.clubFilter) params.append("clubId", controller.filters.clubFilter);
      if (controller.filters.statusFilter) params.append("status", controller.filters.statusFilter);
      if (controller.filters.sportTypeFilter) params.append("sportType", controller.filters.sportTypeFilter);
      if (controller.filters.surfaceTypeFilter) params.append("surfaceType", controller.filters.surfaceTypeFilter);
      if (controller.filters.indoorFilter) params.append("indoor", controller.filters.indoorFilter);
      params.append("sortBy", controller.sortBy);
      params.append("sortOrder", controller.sortOrder);

      const response = await fetch(`/api/admin/courts?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch courts");
      }

      const data = await response.json();

      setCourts(data.courts);
      setPagination(data.pagination);
      setError("");
    } catch {
      setError(t("admin.courts.noResults"));
    } finally {
      setLoading(false);
    }
  }, [router, t, controller.filters, controller.sortBy, controller.sortOrder, controller.page, controller.pageSize]);

  // Handle Prime Time preset - auto-sort by bookings when active
  useEffect(() => {
    if (controller.filters.primeTimeFilter === "true") {
      // Set sort to bookings descending when Prime Time is active
      if (controller.sortBy !== "bookings" || controller.sortOrder !== "desc") {
        controller.setSortBy("bookings");
        controller.setSortOrder("desc");
      }
    }
  }, [controller.filters.primeTimeFilter, controller.sortBy, controller.sortOrder, controller.setSortBy, controller.setSortOrder]);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!isHydrated || isLoadingStore) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Check admin status and fetch data
    if (adminStatus?.isAdmin) {
      fetchCourts();
    } else if (!isLoadingStore) {
      // User is not an admin, redirect
      router.push("/auth/sign-in");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isLoadingStore, adminStatus, router, fetchCourts, isHydrated]);

  // Determine permissions based on admin type
  const canCreate = (adminType: AdminType | undefined): boolean =>
    adminType === "root_admin" || adminType === "club_admin";

  const canEdit = (adminType: AdminType | undefined): boolean =>
    adminType === "root_admin" || adminType === "organization_admin" || adminType === "club_admin";

  const canDelete = (adminType: AdminType | undefined): boolean =>
    adminType === "root_admin" || adminType === "organization_admin";

  const showOrganizationFilter = adminStatus?.adminType === "root_admin";
  const showClubFilter =
    adminStatus?.adminType === "root_admin" ||
    adminStatus?.adminType === "organization_admin";

  const handleOpenEditModal = (court: Court) => {
    setEditingCourt(court);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (court: Court) => {
    setDeletingCourt(court);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCourt(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingCourt(null);
  };

  const handleSubmit = async (formData: CourtFormData) => {
    if (!editingCourt) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/clubs/${editingCourt.club.id}/courts/${editingCourt.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update court");
      }

      handleCloseModal();
      fetchCourts();
    } catch (err) {
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCourt) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/clubs/${deletingCourt.club.id}/courts/${deletingCourt.id}`,
        { method: "DELETE" }
      );

      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete court");
      }

      handleCloseDeleteModal();
      fetchCourts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete court");
    } finally {
      setSubmitting(false);
    }
  };

  // Define sort options
  const sortOptions = [
    { key: 'name', label: t('admin.courts.sortNameAsc'), direction: 'asc' as const },
    { key: 'name', label: t('admin.courts.sortNameDesc'), direction: 'desc' as const },
    { key: 'sportType', label: t('admin.courts.sortSportType'), direction: 'asc' as const },
    { key: 'createdAt', label: t('admin.clubs.sortNewest'), direction: 'desc' as const },
    { key: 'createdAt', label: t('admin.clubs.sortOldest'), direction: 'asc' as const },
    { key: 'bookings', label: t('admin.courts.sortBookingsDesc'), direction: 'desc' as const },
    { key: 'bookings', label: t('admin.courts.sortBookingsAsc'), direction: 'asc' as const },
  ];

  // Define status options for filter
  const statusOptions = [
    { value: 'active', label: t('admin.courts.active') },
    { value: 'inactive', label: t('admin.courts.inactive') },
  ];

  // Define sport type options for filter
  const sportTypeOptions = SPORT_TYPE_OPTIONS.map(sport => ({
    value: sport.value,
    label: sport.label,
  }));

  // Define surface type options for filter
  const surfaceTypeOptions = [
    { value: 'Hard', label: t('admin.courts.new.surfaces.hard') },
    { value: 'Clay', label: t('admin.courts.new.surfaces.clay') },
    { value: 'Grass', label: t('admin.courts.new.surfaces.grass') },
    { value: 'Artificial Grass', label: t('admin.courts.new.surfaces.artificialGrass') },
    { value: 'Carpet', label: t('admin.courts.new.surfaces.carpet') },
  ];

  // Define indoor/outdoor options for filter
  const indoorOptions = [
    { value: 'indoor', label: t('admin.courts.indoor') },
    { value: 'outdoor', label: t('admin.courts.outdoor') },
  ];

  // Quick presets for common court filters
  const quickPresets = useMemo<Array<{
    id: string;
    label: string;
    filters: Partial<CourtFilters>;
  }>>(() => [
    {
      id: "active_courts",
      label: t("admin.courts.presetActiveCourts"),
      filters: { statusFilter: "active" },
    },
    {
      id: "maintenance_courts",
      label: t("admin.courts.presetMaintenanceCourts"),
      filters: { statusFilter: "inactive" },
    },
    {
      id: "prime_time",
      label: t("admin.courts.presetPrimeTime"),
      filters: {
        statusFilter: "active",
        primeTimeFilter: "true", // Flag to trigger sort by bookings
      },
    },
  ], [t]);

  // Define table columns
  const columns: TableColumn<Court>[] = [
    {
      key: 'name',
      header: t('common.name'),
      sortable: true,
      render: (court) => (
        <div className="font-medium">{court.name}</div>
      ),
    },
    {
      key: 'organization',
      header: t('common.organization'),
      render: (court) => (
        <div className="text-sm">{court.organization?.name || '-'}</div>
      ),
    },
    {
      key: 'club',
      header: t('common.club'),
      render: (court) => (
        <div className="text-sm">{court.club.name}</div>
      ),
    },
    {
      key: 'sportType',
      header: t('admin.courts.sport'),
      render: (court) => (
        <div className="text-sm">{court.sportType || '-'}</div>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (court) => (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${court.isActive
          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
          }`}>
          {court.isActive ? t('admin.courts.active') : t('admin.courts.inactive')}
        </span>
      ),
    },
    {
      key: 'bookingCount',
      header: t('admin.clubs.bookings'),
      sortable: true,
      render: (court) => (
        <div className="text-sm">{court.bookingCount}</div>
      ),
    },
    {
      key: 'createdAt',
      header: t('common.created'),
      sortable: true,
      render: (court) => (
        <div className="text-sm">{new Date(court.createdAt).toLocaleDateString()}</div>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      render: (court) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/clubs/${court.club.id}/courts/${court.id}`)}
            aria-label={t('common.viewItem', { name: court.name })}
          >
            {t('common.view')}
          </Button>
          {canEdit(adminStatus?.adminType) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenEditModal(court)}
              aria-label={t('common.editItem', { name: court.name })}
            >
              {t('common.edit')}
            </Button>
          )}
          {canDelete(adminStatus?.adminType) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenDeleteModal(court)}
              aria-label={t('common.deleteItem', { name: court.name })}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading || isLoadingStore || !isHydrated) {
    return (
      <main className="rsp-container p-8">
        <PageHeader
          title={t("admin.courts.title")}
          description={t("admin.courts.subtitle")}
        />
        <TableSkeleton columns={8} rows={10} />
      </main>
    );
  }

  return (
    <ListControllerProvider controller={controller}>
      <main className="rsp-container p-8">
        <PageHeader
          title={t("admin.courts.title")}
          description={t("admin.courts.subtitle")}
        />

        <section className="rsp-content space-y-4">
          {/* List Toolbar with Filters */}
          <ListToolbar
            showReset
            resetLabel={t("common.clearFilters")}
            actionButton={
              canCreate(adminStatus?.adminType) ? (
                <IMLink href="/admin/courts/new" asButton variant="primary">
                  {t("admin.courts.createCourt")}
                </IMLink>
              ) : undefined
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
                presets={quickPresets}
              />
            </div>

            <div className="full-row flex w-full gap-4 items-end">
              {showOrganizationFilter && (
                <OrgSelector
                  filterKey="organizationFilter"
                  label={t("common.organization")}
                  placeholder={t("admin.courts.allOrganizations")}
                />
              )}

              {showClubFilter && (
                <ClubSelector
                  filterKey="clubFilter"
                  orgFilterKey="organizationFilter"
                  label={t("common.club")}
                  placeholder={t("admin.courts.allClubs")}
                />
              )}

              <StatusFilter
                filterKey="statusFilter"
                label={t("common.status")}
                placeholder={t("admin.courts.allStatuses")}
                statuses={statusOptions}
              />
            </div>

            <div className="full-row flex w-full gap-4 items-end">
              <StatusFilter
                filterKey="sportTypeFilter"
                label={t("admin.courts.sport")}
                placeholder={t("admin.courts.allSports")}
                statuses={sportTypeOptions}
              />

              <StatusFilter
                filterKey="surfaceTypeFilter"
                label={t("admin.courts.surface")}
                placeholder={t("admin.courts.allSurfaces")}
                statuses={surfaceTypeOptions}
              />
            </div>

            <div className="full-row flex w-full gap-4 items-end">
              <StatusFilter
                filterKey="indoorFilter"
                label={t("admin.courts.courtLocation")}
                placeholder={t("admin.courts.allLocations")}
                statuses={indoorOptions}
              />

              <SortSelect
                label={t("admin.courts.sortBy")}
                options={sortOptions}
              />
            </div>
          </ListToolbar>

          {error && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {error}
            </div>
          )}

          {/* Courts Table */}
          {loading ? (
            <TableSkeleton columns={8} rows={10} />
          ) : courts.length === 0 ? (
            <Card>
              <div className="py-8 text-center text-gray-500">
                {t("admin.courts.noResultsMatch")}
              </div>
            </Card>
          ) : (
            <Table
              columns={columns}
              data={courts}
              keyExtractor={(court) => court.id}
              sortBy={controller.sortBy}
              sortOrder={controller.sortOrder}
              onSort={(key) => {
                controller.setSortBy(key);
              }}
              emptyMessage={t("admin.courts.noResults")}
              ariaLabel={t("admin.courts.title")}
            />
          )}

          {/* Pagination */}
          {!loading && courts.length > 0 && (
            <PaginationControls
              totalCount={pagination.total}
              totalPages={pagination.totalPages}
              showPageSize
            />
          )}
        </section>

        {/* Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={t("admin.courts.editCourt")}
        >
          <CourtForm
            initialValues={
              editingCourt
                ? {
                  name: editingCourt.name,
                  slug: editingCourt.slug || "",
                  type: editingCourt.type || "",
                  surface: editingCourt.surface || "",
                  indoor: editingCourt.indoor,
                  defaultPriceCents: editingCourt.defaultPriceCents,
                }
                : undefined
            }
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            isSubmitting={submitting}
          />
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          title={t("admin.courts.deleteCourt")}
        >
          <p className="mb-4">
            {t("admin.courts.deleteConfirm", { name: deletingCourt?.name || "" })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCloseDeleteModal}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-500 hover:bg-red-600"
            >
              {submitting ? t("common.processing") : t("common.delete")}
            </Button>
          </div>
        </Modal>
      </main>
    </ListControllerProvider>
  );
}
