"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Card, Modal, IMLink, PageHeader } from "@/components/ui";
import { CourtForm, CourtFormData } from "@/components/admin/CourtForm";
import { CourtCard } from "@/components/courts";
import type { AdminType } from "@/app/api/me/admin-status/route";
import type { Club } from "@/types/club";
import type { Organization } from "@/types/organization";

interface Court {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  surface: string | null;
  indoor: boolean;
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

export default function AdminCourtsPage() {
  const t = useTranslations();
    const router = useRouter();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [deletingCourt, setDeletingCourt] = useState<Court | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingStore = useUserStore((state) => state.isLoading);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  // Filtering and sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "bookings">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Admin status is loaded from store via UserStoreInitializer
  const fetchCourts = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (searchQuery) params.append("search", searchQuery);
      if (selectedClub) params.append("clubId", selectedClub);
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

      const response = await fetch(`/api/admin/courts?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch courts");
      }
      
      const data = await response.json();
      
      if (append) {
        setCourts((prev) => [...prev, ...data.courts]);
      } else {
        setCourts(data.courts);
      }
      
      setPagination(data.pagination);
      setError("");
    } catch {
      setError(t("admin.courts.noResults"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [router, t, searchQuery, selectedClub, selectedStatus, sortBy, sortOrder]);

  useEffect(() => {
    if (isLoadingStore) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Check admin status and fetch data
    if (adminStatus?.isAdmin) {
      fetchCourts(1, false);
    } else if (!isLoadingStore) {
      // User is not an admin, redirect
      router.push("/auth/sign-in");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isLoadingStore, adminStatus, router]);

  // Refetch when filters or sorting change
  useEffect(() => {
    if (adminStatus?.isAdmin) {
      fetchCourts(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedClub, selectedStatus, sortBy, sortOrder]);

  // Extract unique organizations and clubs for filters
  const { organizations, clubs } = useMemo(() => {
    const orgs = new Map<string, string>();
    const clubMap = new Map<string, { name: string; orgId: string | null }>();

    courts.forEach((court) => {
      if (court.organization) {
        orgs.set(court.organization.id, court.organization.name);
      }
      clubMap.set(court.club.id, {
        name: court.club.name,
        orgId: court.organization?.id || null,
      });
    });

    // Filter clubs by selected organization if applicable
    let filteredClubs = Array.from(clubMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      orgId: data.orgId,
    }));

    if (selectedOrganization) {
      filteredClubs = filteredClubs.filter((c) => c.orgId === selectedOrganization);
    }

    return {
      organizations: Array.from(orgs.entries()).map(([id, name]) => ({ id, name })),
      clubs: filteredClubs.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [courts, selectedOrganization]);

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
      fetchCourts(1, false);
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
      fetchCourts(1, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete court");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedOrganization("");
    setSelectedClub("");
    setSelectedStatus("all");
  };

  const handleLoadMore = () => {
    if (pagination.hasMore && !loadingMore) {
      fetchCourts(pagination.page + 1, true);
    }
  };

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split("-") as ["name" | "bookings", "asc" | "desc"];
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  if (loading || isLoadingStore) {
    return (
      <main className="rsp-container p-8">
        <div className="rsp-loading text-center">{t("common.loading")}</div>
      </main>
    );
  }

  return (
    <main className="rsp-container p-8">
      <PageHeader
        title={t("admin.courts.title")}
        description={t("admin.courts.subtitle")}
      />

      <section className="rsp-content">
        {/* Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Input
            placeholder={t("common.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />

          {showOrganizationFilter && organizations.length > 0 && (
            <select
              value={selectedOrganization}
              onChange={(e) => {
                setSelectedOrganization(e.target.value);
                setSelectedClub(""); // Reset club filter when org changes
              }}
              className="im-native-select"
              aria-label={t("admin.courts.filterByOrganization")}
            >
              <option value="">{t("admin.courts.allOrganizations")}</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}

          {showClubFilter && clubs.length > 0 && (
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="im-native-select"
              aria-label={t("admin.courts.filterByClub")}
            >
              <option value="">{t("admin.courts.allClubs")}</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as "all" | "active" | "inactive")}
            className="im-native-select"
            aria-label={t("admin.courts.filterByStatus")}
          >
            <option value="all">{t("admin.courts.allStatuses")}</option>
            <option value="active">{t("admin.courts.active")}</option>
            <option value="inactive">{t("admin.courts.inactive")}</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => handleSortChange(e.target.value)}
            className="im-native-select"
            aria-label={t("admin.courts.sortBy")}
          >
            <option value="name-asc">{t("admin.courts.sortNameAsc")}</option>
            <option value="name-desc">{t("admin.courts.sortNameDesc")}</option>
            <option value="bookings-desc">{t("admin.courts.sortBookingsDesc")}</option>
            <option value="bookings-asc">{t("admin.courts.sortBookingsAsc")}</option>
          </select>

          {(searchQuery || selectedOrganization || selectedClub || selectedStatus !== "all") && (
            <Button variant="outline" onClick={handleClearFilters}>
              {t("common.clearFilters")}
            </Button>
          )}
        </div>

        {/* Quick Actions */}
        {canCreate(adminStatus?.adminType) && (
          <div className="mb-6">
            <IMLink href="/admin/clubs">
              <Button variant="primary">
                {t("admin.courts.createCourt")}
              </Button>
            </IMLink>
          </div>
        )}

        {error && (
          <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
            {error}
          </div>
        )}

        {courts.length === 0 && !loading ? (
          <Card>
            <div className="py-8 text-center text-gray-500">
              {t("admin.courts.noResults")}
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courts.map((court) => (
                <CourtCard
                  key={court.id}
                  court={{
                    id: court.id,
                    name: court.name,
                    slug: court.slug,
                    type: court.type,
                    surface: court.surface,
                    indoor: court.indoor,
                    defaultPriceCents: court.defaultPriceCents,
                    imageUrl: null,
                  }}
                  club={
                    // Pass minimal club info - only id and name are used by CourtCard
                    {
                      id: court.club.id,
                      name: court.club.name,
                    } as Club
                  }
                  organization={
                    // Pass minimal org info - only name is used by CourtCard
                    court.organization
                      ? ({ name: court.organization.name } as Organization)
                      : undefined
                  }
                  isActive={court.isActive}
                  showBookButton={false}
                  showViewSchedule={false}
                  showViewDetails={true}
                  onViewDetails={(courtId) => router.push(`/admin/clubs/${court.club.id}/courts/${courtId}`)}
                  onEdit={canEdit(adminStatus?.adminType) ? () => handleOpenEditModal(court) : undefined}
                  onDelete={canDelete(adminStatus?.adminType) ? () => handleOpenDeleteModal(court) : undefined}
                  showLegend={false}
                  showAvailabilitySummary={false}
                  showDetailedAvailability={false}
                />
            ))}
          </div>

          {/* Load More Button */}
          {pagination.hasMore && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? t("admin.courts.loading") : t("admin.courts.loadMore")}
              </Button>
            </div>
          )}
          </>
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
  );
}
