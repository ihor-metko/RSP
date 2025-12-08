"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, PageHeader, Select } from "@/components/ui";
import { AdminOrganizationCard } from "@/components/admin/AdminOrganizationCard";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import type { Organization } from "@/types/organization";
import "@/components/admin/AdminOrganizationCard.css";
import "./page.css";

interface User {
  id: string;
  name: string | null;
  email: string;
  isOrgAdmin: boolean;
  organizationName: string | null;
}

interface Club {
  id: string;
  name: string;
}

interface ClubApiResponse {
  id: string;
  name: string;
  organization?: { id: string };
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

type SortField = "name" | "createdAt" | "clubCount" | "adminCount";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 25, 50];

export default function AdminOrganizationsPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();

  // Use Zustand store for organizations with auto-fetch
  const organizations = useOrganizationStore((state) => state.getOrganizationsWithAutoFetch());
  const loading = useOrganizationStore((state) => state.loading);
  const storeError = useOrganizationStore((state) => state.error);
  const createOrganization = useOrganizationStore((state) => state.createOrganization);
  const updateOrganization = useOrganizationStore((state) => state.updateOrganization);
  const deleteOrganization = useOrganizationStore((state) => state.deleteOrganization);
  const refetch = useOrganizationStore((state) => state.refetch);

  // Local error state for specific operations
  const [error, setError] = useState("");

  // State for search, sort, and pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);

  // State for manage admins modal
  const [isManageAdminsModalOpen, setIsManageAdminsModalOpen] = useState(false);
  const [managingOrg, setManagingOrg] = useState<Organization | null>(null);
  const [manageError, setManageError] = useState("");
  const [processing, setProcessing] = useState(false);

  // State for edit organization modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editOrgName, setEditOrgName] = useState("");
  const [editOrgSlug, setEditOrgSlug] = useState("");
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);

  // State for delete organization modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

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
  const [clubAdminUsers, setClubAdminUsers] = useState<User[]>([]);
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

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (org) =>
          org.name.toLowerCase().includes(query) ||
          org.slug.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
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
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [organizations, searchQuery, sortField, sortDirection]);

  // Paginated organizations
  const paginatedOrganizations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedOrganizations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedOrganizations, currentPage, itemsPerPage]);

  // Total pages
  const totalPages = Math.ceil(filteredAndSortedOrganizations.length / itemsPerPage);

  // Reset to first page when search or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  // Sort options for the select component
  const sortOptions = [
    { value: "name", label: t("organizations.sortName") },
    { value: "createdAt", label: t("organizations.sortDate") },
    { value: "clubCount", label: t("organizations.sortClubs") },
    { value: "adminCount", label: t("organizations.sortAdmins") },
  ];

  const directionOptions = [
    { value: "asc", label: t("organizations.ascending") },
    { value: "desc", label: t("organizations.descending") },
  ];

  const itemsPerPageOptions = ITEMS_PER_PAGE_OPTIONS.map((n) => ({
    value: String(n),
    label: String(n),
  }));

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
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch {
      // Silent fail for user search
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || !session.user.isRoot) {
      router.push("/auth/sign-in");
      return;
    }

    // No need to manually fetch - auto-fetch selector will handle it
    // Only check for auth errors if present
    if (storeError && (storeError.includes("401") || storeError.includes("403"))) {
      router.push("/auth/sign-in");
    }
  }, [session, status, router, storeError]);

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
      setCreateError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenAssignModal = (org: Organization) => {
    setSelectedOrg(org);
    setAssignMode("existing");
    setUserSearch("");
    setSelectedUserId("");
    setNewAdminName("");
    setNewAdminEmail("");
    setNewAdminPassword("");
    setAssignError("");
    setIsAssignModalOpen(true);
    fetchUsers();
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

      const response = await fetch("/api/admin/organizations/assign-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign SuperAdmin");
      }

      showToast(t("organizations.assignSuccess"), "success");
      handleCloseAssignModal();
      loadOrganizations();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to assign SuperAdmin");
    } finally {
      setAssigning(false);
    }
  };

  const handleOpenManageAdminsModal = (org: Organization) => {
    setManagingOrg(org);
    setManageError("");
    setIsManageAdminsModalOpen(true);
  };

  const handleCloseManageAdminsModal = () => {
    setIsManageAdminsModalOpen(false);
    setManagingOrg(null);
    setManageError("");
  };

  const handleSetOwner = async (userId: string) => {
    if (!managingOrg) return;

    setProcessing(true);
    setManageError("");

    try {
      const response = await fetch("/api/admin/organizations/set-owner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: managingOrg.id,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set owner");
      }

      showToast(t("organizations.ownerUpdated"), "success");
      await loadOrganizations();

      // Update local state
      const updatedOrg = organizations.find(o => o.id === managingOrg.id);
      if (updatedOrg) {
        setManagingOrg(updatedOrg);
      }
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Failed to set owner");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!managingOrg) return;

    setProcessing(true);
    setManageError("");

    try {
      const response = await fetch("/api/admin/organizations/remove-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: managingOrg.id,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove admin");
      }

      showToast(t("organizations.adminRemoved"), "success");
      await loadOrganizations();

      // Update local state
      const updatedOrg = organizations.find(o => o.id === managingOrg.id);
      if (updatedOrg) {
        setManagingOrg(updatedOrg);
      }
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Failed to remove admin");
    } finally {
      setProcessing(false);
    }
  };

  // Edit organization handlers
  const handleOpenEditModal = (org: Organization) => {
    setEditingOrg(org);
    setEditOrgName(org.name);
    setEditOrgSlug(org.slug);
    setEditError("");
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingOrg(null);
    setEditOrgName("");
    setEditOrgSlug("");
    setEditError("");
  };

  const handleEditOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setEditError("");
    setEditing(true);

    try {
      await updateOrganization(editingOrg.id, {
        name: editOrgName,
        slug: editOrgSlug,
      });

      showToast(t("organizations.updateSuccess"), "success");
      handleCloseEditModal();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update organization");
    } finally {
      setEditing(false);
    }
  };

  // Delete organization handlers
  const handleOpenDeleteModal = (org: Organization) => {
    setDeletingOrg(org);
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingOrg(null);
    setDeleteError("");
  };

  const handleDeleteOrganization = async () => {
    if (!deletingOrg) return;

    // Validate before attempting delete
    if ((deletingOrg.clubCount || 0) > 0) {
      setDeleteError(t("organizations.deleteWithClubs", { count: deletingOrg.clubCount || 0 }));
      return;
    }

    setDeleteError("");
    setDeleting(true);

    try {
      await deleteOrganization(deletingOrg.id, deletingOrg.slug);

      showToast(t("organizations.deleteSuccess"), "success");
      handleCloseDeleteModal();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete organization";
      setDeleteError(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  // ============ Club Admins Management Functions ============

  // Fetch club admins for an organization
  const fetchClubAdmins = useCallback(async (orgId: string) => {
    try {
      setClubAdminsLoading(true);
      setClubAdminsError("");
      
      const response = await fetch(`/api/orgs/${orgId}/club-admins`);
      if (!response.ok) {
        throw new Error("Failed to fetch club admins");
      }
      const data = await response.json();
      setClubAdmins(data);
    } catch {
      setClubAdminsError(t("clubAdmins.failedToLoad"));
    } finally {
      setClubAdminsLoading(false);
    }
  }, [t]);

  // Fetch clubs for an organization
  const fetchOrgClubs = useCallback(async (orgId: string) => {
    try {
      const response = await fetch(`/api/admin/clubs`);
      if (!response.ok) {
        throw new Error("Failed to fetch clubs");
      }
      const data: ClubApiResponse[] = await response.json();
      // Filter to only clubs in this organization
      const orgClubsList = data.filter((club) => club.organization?.id === orgId);
      setOrgClubs(orgClubsList.map((club) => ({
        id: club.id,
        name: club.name,
      })));
    } catch {
      setClubAdminsError(t("clubAdmins.failedToLoadClubs"));
    }
  }, [t]);

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
        throw new Error(data.error || "Failed to assign club admin");
      }

      showToast(t("clubAdmins.assignSuccess"), "success");
      handleCloseAddClubAdminModal();
      fetchClubAdmins(clubAdminsOrg.id);
    } catch (err) {
      setAddClubAdminError(err instanceof Error ? err.message : "Failed to assign club admin");
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
        throw new Error(data.error || "Failed to update club admin");
      }

      showToast(t("clubAdmins.updateSuccess"), "success");
      handleCloseEditClubAdminModal();
      fetchClubAdmins(clubAdminsOrg.id);
    } catch (err) {
      setEditClubAdminError(err instanceof Error ? err.message : "Failed to update club admin");
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
        throw new Error(data.error || "Failed to remove club admin");
      }

      showToast(t("clubAdmins.removeSuccess"), "success");
      handleCloseRemoveClubAdminModal();
      fetchClubAdmins(clubAdminsOrg.id);
    } catch (err) {
      setRemoveClubAdminError(err instanceof Error ? err.message : "Failed to remove club admin");
    } finally {
      setRemovingClubAdminSubmitting(false);
    }
  };

  // Update managingOrg when organizations change (use managingOrg.id to avoid infinite loop)
  const managingOrgId = managingOrg?.id;
  useEffect(() => {
    if (managingOrgId) {
      const updatedOrg = organizations.find(o => o.id === managingOrgId);
      if (updatedOrg) {
        setManagingOrg(updatedOrg);
      }
    }
  }, [organizations, managingOrgId]);

  if (status === "loading" || loading) {
    return (
      <main className="im-admin-organizations-page">
        <PageHeader
          title={t("organizations.title")}
          description={t("organizations.subtitle")}
        />
        <section className="rsp-content">
          <div className="im-admin-orgs-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`org-skeleton-${i}`} className="im-admin-org-card-skeleton">
                <div className="im-admin-org-card-skeleton-header" />
                <div className="im-admin-org-card-skeleton-content">
                  <div className="im-admin-org-card-skeleton-line" />
                  <div className="im-admin-org-card-skeleton-line im-admin-org-card-skeleton-line--short" />
                  <div className="im-admin-org-card-skeleton-line" />
                </div>
                <div className="im-admin-org-card-skeleton-actions">
                  <div className="im-admin-org-card-skeleton-btn" />
                  <div className="im-admin-org-card-skeleton-btn" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
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
        <div className="im-admin-organizations-toolbar">
          <div className="im-admin-organizations-search">
            <Input
              placeholder={t("organizations.searchOrganizations")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="im-search-input"
            />
            {searchQuery && (
              <button
                className="im-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label={t("organizations.clearSearch")}
              >
                ✕
              </button>
            )}
          </div>
          <div className="im-admin-organizations-sort">
            <Select
              options={sortOptions}
              value={sortField}
              onChange={(value) => setSortField(value as SortField)}
              aria-label={t("organizations.sortBy")}
            />
            <Select
              options={directionOptions}
              value={sortDirection}
              onChange={(value) => setSortDirection(value as SortDirection)}
              aria-label={t("organizations.sortBy")}
            />
          </div>
          <div className="im-admin-organizations-actions">
            <Button onClick={() => setIsCreateModalOpen(true)}>
              {t("organizations.createOrganization")}
            </Button>
          </div>
        </div>

        {(error || storeError) && (
          <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
            {error || storeError}
          </div>
        )}

        {organizations.length === 0 ? (
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
            <Button variant="outline" onClick={() => setSearchQuery("")}>
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
                  canEdit={true}
                  canDelete={true}
                  canManageAdmins={true}
                  onView={(orgId) => router.push(`/admin/organizations/${orgId}`)}
                  onEdit={() => handleOpenEditModal(org)}
                  onDelete={() => handleOpenDeleteModal(org)}
                  onManageAdmins={() => handleOpenManageAdminsModal(org)}
                  onAddAdmin={() => handleOpenAssignModal(org)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="im-admin-organizations-pagination">
                <div className="im-pagination-info">
                  <span>{t("organizations.page")} {currentPage} {t("organizations.of")} {totalPages}</span>
                </div>
                <div className="im-pagination-controls">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {t("organizations.previous")}
                  </Button>
                  <div className="im-pagination-pages">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          className={`im-pagination-page ${currentPage === pageNum ? "im-pagination-page--active" : ""}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t("organizations.next")}
                  </Button>
                </div>
                <div className="im-pagination-per-page">
                  <span>{t("organizations.itemsPerPage")}:</span>
                  <Select
                    options={itemsPerPageOptions}
                    value={String(itemsPerPage)}
                    onChange={(value) => setItemsPerPage(Number(value))}
                    aria-label={t("organizations.itemsPerPage")}
                  />
                </div>
              </div>
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
                {users.length === 0 ? (
                  <p className="im-user-list-empty">{t("organizations.noUsersFound")}</p>
                ) : (
                  users.map((user) => {
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

      {/* Manage SuperAdmins Modal */}
      <Modal
        isOpen={isManageAdminsModalOpen}
        onClose={handleCloseManageAdminsModal}
        title={t("organizations.manageSuperAdmins")}
      >
        <div className="space-y-4">
          {manageError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {manageError}
            </div>
          )}

          <p className="im-assign-org-name">
            {t("organizations.managingAdminsFor")}: <strong>{managingOrg?.name}</strong>
          </p>

          <div className="im-manage-admins-list">
            {managingOrg?.superAdmins?.map((admin) => (
              <div key={admin.id} className="im-manage-admin-item">
                <div className="im-manage-admin-info">
                  <span className="im-manage-admin-name">{admin.name || admin.email}</span>
                  <span className="im-manage-admin-email">{admin.email}</span>
                  {admin.isPrimaryOwner && (
                    <span 
                      className="im-manage-admin-owner-badge im-tooltip-wrapper"
                      role="note"
                      aria-label={t("organizations.ownerTooltip")}
                    >
                      {t("organizations.owner")}
                    </span>
                  )}
                </div>
                <div className="im-manage-admin-actions">
                  {!admin.isPrimaryOwner && (
                    <>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => handleSetOwner(admin.id)}
                        disabled={processing}
                      >
                        {t("organizations.setAsOwner")}
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleRemoveAdmin(admin.id)}
                        disabled={processing}
                      >
                        {t("organizations.remove")}
                      </Button>
                    </>
                  )}
                  {admin.isPrimaryOwner && managingOrg?.superAdmins?.length === 1 && (
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleRemoveAdmin(admin.id)}
                      disabled={processing}
                    >
                      {t("organizations.remove")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleCloseManageAdminsModal}>
              {t("common.close")}
            </Button>
            <Button onClick={() => {
              handleCloseManageAdminsModal();
              if (managingOrg) handleOpenAssignModal(managingOrg);
            }}>
              {t("organizations.addAdmin")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Organization Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title={t("organizations.editOrganization")}
      >
        <form onSubmit={handleEditOrganization} className="space-y-4">
          {editError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {editError}
            </div>
          )}
          <Input
            label={t("organizations.orgName")}
            value={editOrgName}
            onChange={(e) => setEditOrgName(e.target.value)}
            placeholder={t("organizations.orgNamePlaceholder")}
            required
          />
          <Input
            label={t("organizations.orgSlug")}
            value={editOrgSlug}
            onChange={(e) => setEditOrgSlug(e.target.value)}
            placeholder={t("organizations.orgSlugPlaceholder")}
          />
          <p className="im-form-hint">{t("organizations.slugHint")}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseEditModal}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={editing}>
              {editing ? t("common.processing") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Organization Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title={t("organizations.deleteOrganization")}
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {deleteError}
            </div>
          )}
          <p className="im-delete-confirm-text">
            {t("organizations.deleteConfirm", { name: deletingOrg?.name ?? "" })}
          </p>
          {deletingOrg && (deletingOrg.clubCount || 0) > 0 && (
            <div className="rsp-warning bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-sm">
              {t("organizations.deleteWithClubs", { count: deletingOrg.clubCount || 0 })}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDeleteModal}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteOrganization}
              disabled={deleting || (deletingOrg?.clubCount ?? 0) > 0}
            >
              {deleting ? t("common.processing") : t("common.delete")}
            </Button>
          </div>
        </div>
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
  );
}
