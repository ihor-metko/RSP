"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, PageHeader, Select } from "@/components/ui";
import { CardListSkeleton } from "@/components/ui/skeletons";
import { AdminOrganizationCard } from "@/components/admin/AdminOrganizationCard";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import type { Organization } from "@/types/organization";
import { SportType, SPORT_TYPE_OPTIONS } from "@/constants/sports";
import { useListController, useAuthGuardOnce } from "@/hooks";
import {
  ListControllerProvider,
  ListToolbar,
  ListSearch,
  SortSelect,
  StatusFilter,
  PaginationControls,
  DateRangeFilter,
  RangeFilter,
} from "@/components/list-controls";
import "@/components/admin/AdminOrganizationCard.css";
import "./page.css";

interface Club {
  id: string;
  name: string;
}



interface ClubAdmin {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  clubId: string;
  clubName: string;
  createdAt: string;
}

interface SimpleUser {
  id: string;
  name: string | null;
  email: string;
}

type SortField = "name" | "createdAt" | "clubCount" | "adminCount";

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 25, 50];
const MAX_SKELETON_COUNT = 10; // Maximum number of skeletons to show during loading

// Define filters interface for list controller
interface OrganizationFilters extends Record<string, unknown> {
  searchQuery: string;
  sportTypeFilter: string;
  statusFilter: string;
  clubCountRange: string;
  dateFrom: string;
  dateTo: string;
  adminSearch: string;
}

export default function AdminOrganizationsPage() {
  const t = useTranslations();
  const router = useRouter();
  
  // Use auth guard hook (prevents redirect on page reload)
  const { isLoading: isAuthLoading } = useAuthGuardOnce({
    requireAuth: true,
    requireRoot: true,
  });

  // Use Zustand store for organizations with auto-fetch
  const organizations = useOrganizationStore((state) => state.getOrganizationsWithAutoFetch());
  const loading = useOrganizationStore((state) => state.loading);
  const storeError = useOrganizationStore((state) => state.error);
  const createOrganization = useOrganizationStore((state) => state.createOrganization);
  const refetch = useOrganizationStore((state) => state.refetch);

  // Local error state for specific operations
  const [error, setError] = useState("");

  // Use list controller hook for persistent filters, sort, and pagination
  const controller = useListController<OrganizationFilters>({
    entityKey: "organizations",
    defaultFilters: {
      searchQuery: "",
      sportTypeFilter: "",
      statusFilter: "",
      clubCountRange: "",
      dateFrom: "",
      dateTo: "",
      adminSearch: "",
    },
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    defaultPage: 1,
    defaultPageSize: 10,
  });

  // State for create organization modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  // State for assign admin modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [assignMode, setAssignMode] = useState<"existing" | "new">("existing");
  const simpleUsers = useAdminUsersStore((state) => state.simpleUsers);
  const fetchSimpleUsers = useAdminUsersStore((state) => state.fetchSimpleUsers);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Note: Manage Admins, Edit, and Delete actions are now available only from the organization detail page

  // State for club admins management modal
  const [isClubAdminsModalOpen, setIsClubAdminsModalOpen] = useState(false);
  const [clubAdminsOrg, setClubAdminsOrg] = useState<Organization | null>(null);
  const [clubAdmins, setClubAdmins] = useState<ClubAdmin[]>([]);
  const [orgClubs, setOrgClubs] = useState<Club[]>([]);
  const [clubAdminsLoading, setClubAdminsLoading] = useState(false);
  const [clubAdminsError, setClubAdminsError] = useState("");

  // State for add club admin modal
  const [isAddClubAdminModalOpen, setIsAddClubAdminModalOpen] = useState(false);
  const [clubAdminUserSearch, setClubAdminUserSearch] = useState("");
  const [clubAdminUsers, setClubAdminUsers] = useState<SimpleUser[]>([]);
  const [selectedClubAdminUserId, setSelectedClubAdminUserId] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");
  const [clubAdminAssignMode, setClubAdminAssignMode] = useState<"existing" | "new">("existing");
  const [newClubAdminName, setNewClubAdminName] = useState("");
  const [newClubAdminEmail, setNewClubAdminEmail] = useState("");
  const [addClubAdminError, setAddClubAdminError] = useState("");
  const [addingClubAdmin, setAddingClubAdmin] = useState(false);

  // State for edit club admin modal
  const [isEditClubAdminModalOpen, setIsEditClubAdminModalOpen] = useState(false);
  const [editingClubAdmin, setEditingClubAdmin] = useState<ClubAdmin | null>(null);
  const [editClubAdminClubId, setEditClubAdminClubId] = useState("");
  const [editClubAdminError, setEditClubAdminError] = useState("");
  const [editingClubAdminSubmitting, setEditingClubAdminSubmitting] = useState(false);

  // State for remove club admin confirmation
  const [isRemoveClubAdminModalOpen, setIsRemoveClubAdminModalOpen] = useState(false);
  const [removingClubAdmin, setRemovingClubAdmin] = useState<ClubAdmin | null>(null);
  const [removeClubAdminError, setRemoveClubAdminError] = useState("");
  const [removingClubAdminSubmitting, setRemovingClubAdminSubmitting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Filter, sort, and paginate organizations
  const filteredAndSortedOrganizations = useMemo(() => {
    let result = [...organizations];

    // Filter by search query (name or slug)
    if (controller.filters.searchQuery.trim()) {
      const query = controller.filters.searchQuery.toLowerCase();
      result = result.filter(
        (org) =>
          org.name.toLowerCase().includes(query) ||
          org.slug.toLowerCase().includes(query)
      );
    }

    // Filter by sport type
    if (controller.filters.sportTypeFilter) {
      result = result.filter(
        (org) => org.supportedSports?.includes(controller.filters.sportTypeFilter as SportType)
      );
    }

    // Filter by status (Active/Inactive based on archivedAt)
    if (controller.filters.statusFilter) {
      if (controller.filters.statusFilter === "active") {
        result = result.filter((org) => !org.archivedAt);
      } else if (controller.filters.statusFilter === "inactive") {
        result = result.filter((org) => org.archivedAt);
      }
    }

    // Filter by club count range
    if (controller.filters.clubCountRange) {
      const range = controller.filters.clubCountRange;
      result = result.filter((org) => {
        const count = org.clubCount || 0;
        if (range === "1-5") return count >= 1 && count <= 5;
        if (range === "6-10") return count >= 6 && count <= 10;
        if (range === "10+") return count > 10;
        return true;
      });
    }

    // Filter by creation date range
    if (controller.filters.dateFrom || controller.filters.dateTo) {
      result = result.filter((org) => {
        const orgDate = new Date(org.createdAt);
        const fromDate = controller.filters.dateFrom ? new Date(controller.filters.dateFrom) : null;
        const toDate = controller.filters.dateTo ? new Date(controller.filters.dateTo) : null;

        if (fromDate && orgDate < fromDate) return false;
        if (toDate && orgDate > toDate) return false;
        return true;
      });
    }

    // Filter by admin/owner search
    if (controller.filters.adminSearch.trim()) {
      const adminQuery = controller.filters.adminSearch.toLowerCase();
      result = result.filter((org) => {
        if (!org.superAdmins || org.superAdmins.length === 0) return false;
        return org.superAdmins.some(
          (admin) =>
            admin.name?.toLowerCase().includes(adminQuery) ||
            admin.email.toLowerCase().includes(adminQuery)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (controller.sortBy as SortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "clubCount":
          comparison = (a.clubCount || 0) - (b.clubCount || 0);
          break;
        case "adminCount":
          comparison = (a.superAdmins?.length || 0) - (b.superAdmins?.length || 0);
          break;
      }
      return controller.sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    organizations,
    controller.filters.searchQuery,
    controller.filters.sportTypeFilter,
    controller.filters.statusFilter,
    controller.filters.clubCountRange,
    controller.filters.dateFrom,
    controller.filters.dateTo,
    controller.filters.adminSearch,
    controller.sortBy,
    controller.sortOrder,
  ]);

  // Paginated organizations
  const paginatedOrganizations = useMemo(() => {
    const startIndex = (controller.page - 1) * controller.pageSize;
    return filteredAndSortedOrganizations.slice(startIndex, startIndex + controller.pageSize);
  }, [filteredAndSortedOrganizations, controller.page, controller.pageSize]);

  // Total pages
  const totalPages = Math.ceil(filteredAndSortedOrganizations.length / controller.pageSize);

  // Sort options for SortSelect component
  const sortOptions = [
    { key: "name", label: t("organizations.sortName") + " (A-Z)", direction: "asc" as const },
    { key: "name", label: t("organizations.sortName") + " (Z-A)", direction: "desc" as const },
    { key: "createdAt", label: t("organizations.sortDate") + " (Newest)", direction: "desc" as const },
    { key: "createdAt", label: t("organizations.sortDate") + " (Oldest)", direction: "asc" as const },
    { key: "clubCount", label: t("organizations.sortClubs") + " (Most)", direction: "desc" as const },
    { key: "clubCount", label: t("organizations.sortClubs") + " (Least)", direction: "asc" as const },
    { key: "adminCount", label: t("organizations.sortAdmins") + " (Most)", direction: "desc" as const },
    { key: "adminCount", label: t("organizations.sortAdmins") + " (Least)", direction: "asc" as const },
  ];

  // Sport type filter options for StatusFilter component
  const sportTypeOptions = [
    { value: "", label: t("organizations.allSports") },
    ...SPORT_TYPE_OPTIONS
  ];

  const loadOrganizations = useCallback(async () => {
    try {
      await refetch();
      setError("");
    } catch (err) {
      // Error is already set in the store, but we handle routing here
      const errorMessage = err instanceof Error ? err.message : "";
      if (errorMessage.includes("401") || errorMessage.includes("403")) {
        router.push("/auth/sign-in");
      } else {
        setError(t("organizations.failedToLoad"));
      }
    }
  }, [refetch, router, t]);

  const fetchUsers = useCallback(async (query: string = "") => {
    try {
      await fetchSimpleUsers(query);
    } catch {
      // Silent fail for user search
    }
  }, [fetchSimpleUsers]);

  // Auth check for error conditions (e.g., session expired)
  useEffect(() => {
    // Wait for auth to complete
    if (isAuthLoading) return;

    // Check for auth errors if present
    if (storeError && (storeError.includes("401") || storeError.includes("403"))) {
      router.push("/auth/sign-in");
    }
  }, [isAuthLoading, router, storeError]);

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAssignModalOpen && assignMode === "existing") {
        fetchUsers(userSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, isAssignModalOpen, assignMode, fetchUsers]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);

    try {
      const data = await createOrganization({
        name: newOrgName,
        slug: newOrgSlug || undefined,
      });

      showToast(t("organizations.createSuccess"), "success");
      setIsCreateModalOpen(false);
      setNewOrgName("");
      setNewOrgSlug("");

      // Open assign admin modal for the new organization
      setSelectedOrg(data);
      setIsAssignModalOpen(true);
      fetchUsers();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t("organizations.errors.createFailed"));
    } finally {
      setCreating(false);
    }
  };



  const handleCloseAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedOrg(null);
    setAssignError("");
  };

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError("");
    setAssigning(true);

    try {
      const payload =
        assignMode === "new"
          ? {
            organizationId: selectedOrg?.id,
            createNew: true,
            name: newAdminName,
            email: newAdminEmail,
            password: newAdminPassword,
          }
          : {
            organizationId: selectedOrg?.id,
            userId: selectedUserId,
          };

      const response = await fetch(`/api/admin/organizations/${selectedOrg?.id}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("organizations.errors.assignSuperAdminFailed"));
      }

      showToast(t("organizations.assignSuccess"), "success");
      handleCloseAssignModal();
      loadOrganizations();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : t("organizations.errors.assignSuperAdminFailed"));
    } finally {
      setAssigning(false);
    }
  };

  // Manage Admins, Edit, and Delete handlers removed - these actions are now only available from the organization detail page

  // ============ Club Admins Management Functions ============

  // Fetch club admins for an organization
  const fetchClubAdmins = useCallback(async (orgId: string) => {
    try {
      setClubAdminsLoading(true);
      setClubAdminsError("");

      const response = await fetch(`/api/orgs/${orgId}/club-admins`);
      if (!response.ok) {
        throw new Error(t("organizations.errors.fetchClubAdminsFailed"));
      }
      const data = await response.json();
      setClubAdmins(data);
    } catch {
      setClubAdminsError(t("clubAdmins.failedToLoad"));
    } finally {
      setClubAdminsLoading(false);
    }
  }, [t]);

  // Fetch clubs for an organization using store
  const clubs = useAdminClubStore((state) => state.clubs);
  const fetchClubsIfNeeded = useAdminClubStore((state) => state.fetchClubsIfNeeded);

  const fetchOrgClubs = useCallback(async (orgId: string) => {
    try {
      // Use store method with inflight guard and organization context
      await fetchClubsIfNeeded({ organizationId: orgId });

      // Get clubs from store and filter to organization
      const orgClubsList = clubs.filter((club) => club.organizationId === orgId);
      setOrgClubs(orgClubsList.map((club) => ({
        id: club.id,
        name: club.name,
      })));
    } catch {
      setClubAdminsError(t("clubAdmins.failedToLoadClubs"));
    }
  }, [t, fetchClubsIfNeeded, clubs]);

  // Open club admins modal
  // Note: This is kept for the Club Admins modal functionality but not directly exposed in the card view
  // Access to club admins management is available through the organization detail page
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleOpenClubAdminsModal = (org: Organization) => {
    setClubAdminsOrg(org);
    setClubAdminsError("");
    setIsClubAdminsModalOpen(true);
    fetchClubAdmins(org.id);
    fetchOrgClubs(org.id);
  };

  // Close club admins modal
  const handleCloseClubAdminsModal = () => {
    setIsClubAdminsModalOpen(false);
    setClubAdminsOrg(null);
    setClubAdmins([]);
    setOrgClubs([]);
    setClubAdminsError("");
  };

  // Open add club admin modal
  const handleOpenAddClubAdminModal = () => {
    setClubAdminAssignMode("existing");
    setClubAdminUserSearch("");
    setClubAdminUsers([]);
    setSelectedClubAdminUserId("");
    setSelectedClubId("");
    setNewClubAdminName("");
    setNewClubAdminEmail("");
    setAddClubAdminError("");
    setIsAddClubAdminModalOpen(true);
  };

  // Close add club admin modal
  const handleCloseAddClubAdminModal = () => {
    setIsAddClubAdminModalOpen(false);
    setAddClubAdminError("");
  };

  // Fetch users for club admin assignment
  const fetchClubAdminUsers = useCallback(async (query: string = "") => {
    try {
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setClubAdminUsers(data);
      }
    } catch {
      // Silent fail for user search
    }
  }, []);

  // Debounced user search for club admin
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAddClubAdminModalOpen && clubAdminAssignMode === "existing") {
        fetchClubAdminUsers(clubAdminUserSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clubAdminUserSearch, isAddClubAdminModalOpen, clubAdminAssignMode, fetchClubAdminUsers]);

  // Handle add club admin form submission
  const handleAddClubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubAdminsOrg) return;

    setAddClubAdminError("");
    setAddingClubAdmin(true);

    try {
      const payload = clubAdminAssignMode === "new"
        ? {
          email: newClubAdminEmail,
          name: newClubAdminName,
          clubId: selectedClubId,
        }
        : {
          userId: selectedClubAdminUserId,
          clubId: selectedClubId,
        };

      const response = await fetch(`/api/orgs/${clubAdminsOrg.id}/club-admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("organizations.errors.assignClubAdminFailed"));
      }

      showToast(t("clubAdmins.assignSuccess"), "success");
      handleCloseAddClubAdminModal();
      fetchClubAdmins(clubAdminsOrg.id);
    } catch (err) {
      setAddClubAdminError(err instanceof Error ? err.message : t("organizations.errors.assignClubAdminFailed"));
    } finally {
      setAddingClubAdmin(false);
    }
  };

  // Open edit club admin modal
  const handleOpenEditClubAdminModal = (clubAdmin: ClubAdmin) => {
    setEditingClubAdmin(clubAdmin);
    setEditClubAdminClubId(clubAdmin.clubId);
    setEditClubAdminError("");
    setIsEditClubAdminModalOpen(true);
  };

  // Close edit club admin modal
  const handleCloseEditClubAdminModal = () => {
    setIsEditClubAdminModalOpen(false);
    setEditingClubAdmin(null);
    setEditClubAdminError("");
  };

  // Handle edit club admin form submission
  const handleEditClubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubAdminsOrg || !editingClubAdmin) return;

    setEditClubAdminError("");
    setEditingClubAdminSubmitting(true);

    try {
      const response = await fetch(
        `/api/orgs/${clubAdminsOrg.id}/club-admins/${editingClubAdmin.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clubId: editClubAdminClubId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("organizations.errors.updateClubAdminFailed"));
      }

      showToast(t("clubAdmins.updateSuccess"), "success");
      handleCloseEditClubAdminModal();
      fetchClubAdmins(clubAdminsOrg.id);
    } catch (err) {
      setEditClubAdminError(err instanceof Error ? err.message : t("organizations.errors.updateClubAdminFailed"));
    } finally {
      setEditingClubAdminSubmitting(false);
    }
  };

  // Open remove club admin confirmation modal
  const handleOpenRemoveClubAdminModal = (clubAdmin: ClubAdmin) => {
    setRemovingClubAdmin(clubAdmin);
    setRemoveClubAdminError("");
    setIsRemoveClubAdminModalOpen(true);
  };

  // Close remove club admin confirmation modal
  const handleCloseRemoveClubAdminModal = () => {
    setIsRemoveClubAdminModalOpen(false);
    setRemovingClubAdmin(null);
    setRemoveClubAdminError("");
  };

  // Handle remove club admin
  const handleRemoveClubAdmin = async () => {
    if (!clubAdminsOrg || !removingClubAdmin) return;

    setRemoveClubAdminError("");
    setRemovingClubAdminSubmitting(true);

    try {
      const response = await fetch(
        `/api/orgs/${clubAdminsOrg.id}/club-admins/${removingClubAdmin.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("organizations.errors.removeClubAdminFailed"));
      }

      showToast(t("clubAdmins.removeSuccess"), "success");
      handleCloseRemoveClubAdminModal();
      fetchClubAdmins(clubAdminsOrg.id);
    } catch (err) {
      setRemoveClubAdminError(err instanceof Error ? err.message : t("organizations.errors.removeClubAdminFailed"));
    } finally {
      setRemovingClubAdminSubmitting(false);
    }
  };


  // Combined loading state for consistent loading UI
  const isLoadingState = isAuthLoading || loading;

  return (
    <ListControllerProvider controller={controller}>
      <main className="im-admin-organizations-page">
        <PageHeader
          title={t("organizations.title")}
          description={t("organizations.subtitle")}
        />

        {/* Toast Notification */}
        {toast && (
          <div className={`im-toast im-toast--${toast.type}`}>
            {toast.message}
          </div>
        )}

        <section className="rsp-content">
          {/* List Controls Toolbar */}
          <ListToolbar
            showReset
            actionButton={
              <Button onClick={() => router.push("/admin/organizations/new")}>
                {t("organizations.createOrganization")}
              </Button>
            }
          >
            <div className="full-row flex w-full gap-4">
              <ListSearch
                className="flex-1"
                placeholder={t("organizations.searchOrganizations")}
                filterKey="searchQuery"
              />

              <Input
                className="flex-1"
                placeholder={t("organizations.searchByAdmin")}
                value={controller.filters.adminSearch}
                onChange={(e) => controller.setFilter("adminSearch", e.target.value)}
                aria-label={t("organizations.searchByAdmin")}
              />
            </div>

            <div className="full-row flex w-full gap-4">
              <StatusFilter
                filterKey="statusFilter"
                statuses={[
                  { value: "active", label: t("organizations.active") },
                  { value: "inactive", label: t("organizations.inactive") },
                ]}
                label={t("organizations.status")}
                placeholder={t("organizations.allStatuses")}
              />

              <RangeFilter
                filterKey="clubCountRange"
                ranges={[
                  { value: "1-5", label: "1-5" },
                  { value: "6-10", label: "6-10" },
                  { value: "10+", label: "10+" },
                ]}
                label={t("organizations.clubCount")}
                placeholder={t("organizations.allRanges")}
              />

              <StatusFilter
                filterKey="sportTypeFilter"
                statuses={sportTypeOptions}
                label={t("organizations.filterBySport")}
                placeholder={t("organizations.allSports")}
              />
            </div>

            <div className="full-row flex w-full gap-4">
              <SortSelect
                className="flex-1"
                options={sortOptions}
                label={t("organizations.sortBy")}
              />

              <DateRangeFilter
                field="createdAt"
                label={t("organizations.createdDate")}
                fromKey="dateFrom"
                toKey="dateTo"
                fromLabel={t("common.from")}
                toLabel={t("common.to")}
              />
            </div>
          </ListToolbar>

          {(error || storeError) && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
              {error || storeError}
            </div>
          )}

          {isLoadingState ? (
            <CardListSkeleton count={Math.min(controller.pageSize, MAX_SKELETON_COUNT)} variant="default" />
          ) : organizations.length === 0 ? (
            <div className="im-admin-organizations-empty">
              <p className="im-admin-organizations-empty-text">
                {t("organizations.noOrganizations")}
              </p>
            </div>
          ) : filteredAndSortedOrganizations.length === 0 ? (
            <div className="im-admin-organizations-empty">
              <p className="im-admin-organizations-empty-text">
                {t("organizations.noResults")}
              </p>
              <Button variant="outline" onClick={() => controller.clearFilters()}>
                {t("organizations.clearSearch")}
              </Button>
            </div>
          ) : (
            <>
              {/* Card Grid Layout */}
              <div className="im-admin-orgs-grid">
                {paginatedOrganizations.map((org) => (
                  <AdminOrganizationCard
                    key={org.id}
                    organization={org}
                    onView={(orgId) => router.push(`/admin/organizations/${orgId}`)}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <PaginationControls
                  totalCount={filteredAndSortedOrganizations.length}
                  totalPages={totalPages}
                  showPageSize
                  pageSizeOptions={ITEMS_PER_PAGE_OPTIONS}
                />
              )}
            </>
          )}
        </section>

        {/* Create Organization Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={t("organizations.createOrganization")}
        >
          <form onSubmit={handleCreateOrganization} className="space-y-4">
            {createError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {createError}
              </div>
            )}
            <Input
              label={t("organizations.orgName")}
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder={t("organizations.orgNamePlaceholder")}
              required
            />
            <Input
              label={t("organizations.orgSlug")}
              value={newOrgSlug}
              onChange={(e) => setNewOrgSlug(e.target.value)}
              placeholder={t("organizations.orgSlugPlaceholder")}
            />
            <p className="im-form-hint">{t("organizations.slugHint")}</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? t("common.processing") : t("common.create")}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Assign SuperAdmin Modal */}
        <Modal
          isOpen={isAssignModalOpen}
          onClose={handleCloseAssignModal}
          title={t("organizations.addSuperAdmin")}
        >
          <form onSubmit={handleAssignAdmin} className="space-y-4">
            {assignError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {assignError}
              </div>
            )}

            <p className="im-assign-org-name">
              {t("organizations.assigningTo")}: <strong>{selectedOrg?.name}</strong>
            </p>

            <div className="im-assign-mode-tabs">
              <button
                type="button"
                className={`im-assign-mode-tab ${assignMode === "existing" ? "im-assign-mode-tab--active" : ""}`}
                onClick={() => setAssignMode("existing")}
              >
                {t("organizations.existingUser")}
              </button>
              <button
                type="button"
                className={`im-assign-mode-tab ${assignMode === "new" ? "im-assign-mode-tab--active" : ""}`}
                onClick={() => setAssignMode("new")}
              >
                {t("organizations.newUser")}
              </button>
            </div>

            {assignMode === "existing" ? (
              <>
                <Input
                  label={t("organizations.searchUsers")}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t("organizations.searchUsersPlaceholder")}
                />
                <div className="im-user-list">
                  {simpleUsers.length === 0 ? (
                    <p className="im-user-list-empty">{t("organizations.noUsersFound")}</p>
                  ) : (
                    simpleUsers.map((user) => {
                      // Check if user is already an admin of the selected org
                      const isAlreadyAdminOfThisOrg = selectedOrg?.superAdmins?.some(
                        (admin) => admin.id === user.id
                      );

                      return (
                        <label
                          key={user.id}
                          className={`im-user-option ${isAlreadyAdminOfThisOrg ? "im-user-option--disabled" : ""} ${selectedUserId === user.id ? "im-user-option--selected" : ""}`}
                        >
                          <input
                            type="radio"
                            name="userId"
                            value={user.id}
                            checked={selectedUserId === user.id}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            disabled={isAlreadyAdminOfThisOrg}
                          />
                          <span className="im-user-info">
                            <span className="im-user-name">{user.name || user.email}</span>
                            <span className="im-user-email">{user.email}</span>
                            {isAlreadyAdminOfThisOrg && (
                              <span className="im-user-badge">
                                {t("organizations.alreadyAdminOfThisOrg")}
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <>
                <Input
                  label={t("common.name")}
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder={t("auth.enterName")}
                  required
                />
                <Input
                  label={t("common.email")}
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder={t("auth.enterEmail")}
                  required
                />
                <Input
                  label={t("common.password")}
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder={t("auth.createPassword")}
                  required
                  showPasswordToggle
                />
              </>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={handleCloseAssignModal}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  assigning ||
                  (assignMode === "existing" && !selectedUserId) ||
                  (assignMode === "new" && (!newAdminName || !newAdminEmail || !newAdminPassword))
                }
              >
                {assigning ? t("common.processing") : t("organizations.addAdmin")}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Club Admins Management Modal */}
        <Modal
          isOpen={isClubAdminsModalOpen}
          onClose={handleCloseClubAdminsModal}
          title={t("clubAdmins.title")}
        >
          <div className="space-y-4">
            {clubAdminsError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {clubAdminsError}
              </div>
            )}

            <p className="im-assign-org-name">
              {t("clubAdmins.subtitle")}: <strong>{clubAdminsOrg?.name}</strong>
            </p>

            {clubAdminsLoading ? (
              <div className="im-admin-organizations-loading">
                <div className="im-admin-organizations-loading-spinner" />
                <span className="im-admin-organizations-loading-text">{t("common.loading")}</span>
              </div>
            ) : orgClubs.length === 0 ? (
              <div className="im-admin-organizations-empty">
                <p className="im-admin-organizations-empty-text">
                  {t("clubAdmins.noClubs")}
                </p>
              </div>
            ) : clubAdmins.length === 0 ? (
              <div className="im-admin-organizations-empty">
                <p className="im-admin-organizations-empty-text">
                  {t("clubAdmins.noClubAdmins")}
                </p>
              </div>
            ) : (
              <div className="im-manage-admins-list">
                {clubAdmins.map((clubAdmin) => (
                  <div key={clubAdmin.id} className="im-manage-admin-item">
                    <div className="im-manage-admin-info">
                      <span className="im-manage-admin-name">{clubAdmin.userName || clubAdmin.userEmail}</span>
                      <span className="im-manage-admin-email">{clubAdmin.userEmail}</span>
                      <span className="im-manage-admin-club-badge">{clubAdmin.clubName}</span>
                    </div>
                    <div className="im-manage-admin-actions">
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => handleOpenEditClubAdminModal(clubAdmin)}
                      >
                        {t("common.edit")}
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleOpenRemoveClubAdminModal(clubAdmin)}
                      >
                        {t("organizations.remove")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleCloseClubAdminsModal}>
                {t("common.close")}
              </Button>
              {orgClubs.length > 0 && (
                <Button onClick={handleOpenAddClubAdminModal}>
                  {t("clubAdmins.addClubAdmin")}
                </Button>
              )}
            </div>
          </div>
        </Modal>

        {/* Add Club Admin Modal */}
        <Modal
          isOpen={isAddClubAdminModalOpen}
          onClose={handleCloseAddClubAdminModal}
          title={t("clubAdmins.addClubAdmin")}
        >
          <form onSubmit={handleAddClubAdmin} className="space-y-4">
            {addClubAdminError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {addClubAdminError}
              </div>
            )}

            <p className="im-assign-org-name">
              {t("clubAdmins.assigningTo")}: <strong>{clubAdminsOrg?.name}</strong>
            </p>

            {/* Club Selection */}
            <Select
              options={[
                { value: "", label: t("clubAdmins.selectClubPlaceholder") },
                ...orgClubs.map((club) => ({ value: club.id, label: club.name })),
              ]}
              value={selectedClubId}
              onChange={(value) => setSelectedClubId(value)}
              aria-label={t("clubAdmins.selectClub")}
            />

            {/* User Selection Mode Tabs */}
            <div className="im-assign-mode-tabs">
              <button
                type="button"
                className={`im-assign-mode-tab ${clubAdminAssignMode === "existing" ? "im-assign-mode-tab--active" : ""}`}
                onClick={() => setClubAdminAssignMode("existing")}
              >
                {t("clubAdmins.existingUser")}
              </button>
              <button
                type="button"
                className={`im-assign-mode-tab ${clubAdminAssignMode === "new" ? "im-assign-mode-tab--active" : ""}`}
                onClick={() => setClubAdminAssignMode("new")}
              >
                {t("clubAdmins.newUser")}
              </button>
            </div>

            {clubAdminAssignMode === "existing" ? (
              <>
                <Input
                  label={t("clubAdmins.searchUsers")}
                  value={clubAdminUserSearch}
                  onChange={(e) => setClubAdminUserSearch(e.target.value)}
                  placeholder={t("clubAdmins.searchUsersPlaceholder")}
                />
                <div className="im-user-list">
                  {clubAdminUsers.length === 0 ? (
                    <p className="im-user-list-empty">{t("clubAdmins.noUsersFound")}</p>
                  ) : (
                    clubAdminUsers.map((user) => {
                      const isAlreadyClubAdmin = clubAdmins.some(
                        (ca) => ca.userId === user.id && ca.clubId === selectedClubId
                      );

                      return (
                        <label
                          key={user.id}
                          className={`im-user-option ${isAlreadyClubAdmin ? "im-user-option--disabled" : ""} ${selectedClubAdminUserId === user.id ? "im-user-option--selected" : ""}`}
                        >
                          <input
                            type="radio"
                            name="clubAdminUserId"
                            value={user.id}
                            checked={selectedClubAdminUserId === user.id}
                            onChange={(e) => setSelectedClubAdminUserId(e.target.value)}
                            disabled={isAlreadyClubAdmin}
                          />
                          <span className="im-user-info">
                            <span className="im-user-name">{user.name || user.email}</span>
                            <span className="im-user-email">{user.email}</span>
                            {isAlreadyClubAdmin && (
                              <span className="im-user-badge">
                                {t("clubAdmins.alreadyClubAdmin")}
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <>
                <Input
                  label={t("common.name")}
                  value={newClubAdminName}
                  onChange={(e) => setNewClubAdminName(e.target.value)}
                  placeholder={t("auth.enterName")}
                  required
                />
                <Input
                  label={t("common.email")}
                  type="email"
                  value={newClubAdminEmail}
                  onChange={(e) => setNewClubAdminEmail(e.target.value)}
                  placeholder={t("auth.enterEmail")}
                  required
                />
              </>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={handleCloseAddClubAdminModal}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  addingClubAdmin ||
                  !selectedClubId ||
                  (clubAdminAssignMode === "existing" && !selectedClubAdminUserId) ||
                  (clubAdminAssignMode === "new" && (!newClubAdminName || !newClubAdminEmail))
                }
              >
                {addingClubAdmin ? t("common.processing") : t("clubAdmins.assign")}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Club Admin Modal */}
        <Modal
          isOpen={isEditClubAdminModalOpen}
          onClose={handleCloseEditClubAdminModal}
          title={t("clubAdmins.editClubAdmin")}
        >
          <form onSubmit={handleEditClubAdmin} className="space-y-4">
            {editClubAdminError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {editClubAdminError}
              </div>
            )}

            <p className="im-assign-org-name">
              {t("clubAdmins.reassigningTo")}: <strong>{editingClubAdmin?.userName || editingClubAdmin?.userEmail}</strong>
            </p>

            <Select
              options={orgClubs.map((club) => ({ value: club.id, label: club.name }))}
              value={editClubAdminClubId}
              onChange={(value) => setEditClubAdminClubId(value)}
              aria-label={t("clubAdmins.selectClub")}
            />

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={handleCloseEditClubAdminModal}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={editingClubAdminSubmitting || !editClubAdminClubId}
              >
                {editingClubAdminSubmitting ? t("common.processing") : t("common.save")}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Remove Club Admin Confirmation Modal */}
        <Modal
          isOpen={isRemoveClubAdminModalOpen}
          onClose={handleCloseRemoveClubAdminModal}
          title={t("clubAdmins.removeClubAdmin")}
        >
          <div className="space-y-4">
            {removeClubAdminError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {removeClubAdminError}
              </div>
            )}

            <p className="im-delete-confirm-text">
              {t("clubAdmins.removeConfirm", {
                name: removingClubAdmin?.userName || removingClubAdmin?.userEmail || "",
                club: removingClubAdmin?.clubName || ""
              })}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("clubAdmins.cannotUndoRemoval")}
            </p>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseRemoveClubAdminModal}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={handleRemoveClubAdmin}
                disabled={removingClubAdminSubmitting}
              >
                {removingClubAdminSubmitting ? t("common.processing") : t("organizations.remove")}
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </ListControllerProvider>
  );
}
