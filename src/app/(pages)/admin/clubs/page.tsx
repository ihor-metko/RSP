"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, IMLink, PageHeader } from "@/components/ui";
import { AdminClubCard } from "@/components/admin/AdminClubCard";
import type { ClubWithCounts, ClubFormData } from "@/types/club";
import type { AdminStatusResponse, AdminType } from "@/app/api/me/admin-status/route";
import "@/components/admin/AdminClubCard.css";

const initialFormData: ClubFormData = {
  name: "",
  location: "",
  contactInfo: "",
  openingHours: "",
  logo: "",
};

type SortField = "name" | "city" | "createdAt" | "bookingCount";
type SortDirection = "asc" | "desc";

export default function AdminClubsPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clubs, setClubs] = useState<ClubWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<ClubWithCounts | null>(null);
  const [deletingClub, setDeletingClub] = useState<ClubWithCounts | null>(null);
  const [formData, setFormData] = useState<ClubFormData>(initialFormData);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [adminStatus, setAdminStatus] = useState<AdminStatusResponse | null>(null);
  const [loadingAdminStatus, setLoadingAdminStatus] = useState(true);

  // Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchAdminStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/me/admin-status");
      if (response.ok) {
        const data: AdminStatusResponse = await response.json();
        setAdminStatus(data);
        return data;
      } else {
        setAdminStatus(null);
        return null;
      }
    } catch {
      setAdminStatus(null);
      return null;
    } finally {
      setLoadingAdminStatus(false);
    }
  }, []);

  const fetchClubs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/clubs");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch clubs");
      }
      const data = await response.json();
      setClubs(data);
      setError("");
    } catch {
      setError(t("clubs.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }

    // First fetch admin status, then clubs
    fetchAdminStatus().then((adminData) => {
      if (adminData?.isAdmin) {
        fetchClubs();
      } else {
        // User is not an admin, redirect
        router.push("/auth/sign-in");
      }
    });
  }, [session, status, router, fetchAdminStatus, fetchClubs]);

  // Extract unique organizations and cities for filters
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

  // Filter and sort clubs
  const filteredAndSortedClubs = useMemo(() => {
    let result = [...clubs];

    // Apply filters
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (club) =>
          club.name.toLowerCase().includes(query) ||
          club.location.toLowerCase().includes(query) ||
          club.city?.toLowerCase().includes(query)
      );
    }

    if (selectedOrganization) {
      result = result.filter(
        (club) => club.organization?.id === selectedOrganization
      );
    }

    if (selectedCity) {
      result = result.filter((club) => club.city === selectedCity);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "city":
          comparison = (a.city || "").localeCompare(b.city || "");
          break;
        case "bookingCount":
          comparison = (a.bookingCount || 0) - (b.bookingCount || 0);
          break;
        case "createdAt":
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [clubs, searchQuery, selectedOrganization, selectedCity, sortField, sortDirection]);

  // Determine permissions based on admin type
  const canCreate = adminStatus?.adminType === "root_admin" || adminStatus?.adminType === "organization_admin";
  const canEdit = (adminType: AdminType | undefined) =>
    adminType === "root_admin" || adminType === "organization_admin";
  const canDelete = adminStatus?.adminType === "root_admin";
  const showOrganizationFilter = adminStatus?.adminType === "root_admin";

  const handleOpenCreateModal = () => {
    setEditingClub(null);
    setFormData(initialFormData);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (club: ClubWithCounts) => {
    setEditingClub(club);
    setFormData({
      name: club.name,
      location: club.location,
      contactInfo: club.contactInfo || "",
      openingHours: club.openingHours || "",
      logo: club.logo || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (club: ClubWithCounts) => {
    setDeletingClub(club);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClub(null);
    setFormData(initialFormData);
    setFormError("");
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingClub(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const url = editingClub
        ? `/api/admin/clubs/${editingClub.id}`
        : "/api/admin/clubs";
      const method = editingClub ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save club");
      }

      handleCloseModal();
      fetchClubs();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save club");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClub) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/clubs/${deletingClub.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete club");
      }

      handleCloseDeleteModal();
      fetchClubs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete club");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedOrganization("");
    setSelectedCity("");
    setSortField("createdAt");
    setSortDirection("desc");
  };

  if (status === "loading" || loading || loadingAdminStatus) {
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

            {(searchQuery || selectedOrganization || selectedCity) && (
              <Button variant="outline" onClick={handleClearFilters}>
                {t("common.clearFilters")}
              </Button>
            )}
          </div>

          {/* Right side - Create Actions */}
          {canCreate && (
            <div className="im-admin-clubs-actions-right">
              <Button onClick={handleOpenCreateModal} variant="outline">
                {t("admin.clubs.quickCreate")}
              </Button>
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

        {filteredAndSortedClubs.length === 0 ? (
          <div className="im-admin-clubs-empty">
            <p className="im-admin-clubs-empty-text">
              {clubs.length === 0
                ? t("admin.clubs.noClubs")
                : t("admin.clubs.noClubsMatch")}
            </p>
          </div>
        ) : (
          <section className="im-admin-clubs-grid">
            {filteredAndSortedClubs.map((club) => (
              <AdminClubCard
                key={club.id}
                club={club}
                onEdit={canEdit(adminStatus?.adminType) ? handleOpenEditModal : undefined}
                onDelete={canDelete ? handleOpenDeleteModal : undefined}
                showOrganization={showOrganizationFilter}
              />
            ))}
          </section>
        )}
      </section>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingClub ? t("admin.clubs.editClub") : t("admin.clubs.createClub")}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {formError}
            </div>
          )}
          <Input
            label={t("common.name")}
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder={t("admin.clubs.clubName")}
            required
          />
          <Input
            label={t("common.address")}
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder={t("admin.clubs.clubAddress")}
            required
          />
          <Input
            label={t("admin.clubs.contactInfo")}
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleInputChange}
            placeholder={t("admin.clubs.phoneOrEmail")}
          />
          <Input
            label={t("admin.clubs.openingHours")}
            name="openingHours"
            value={formData.openingHours}
            onChange={handleInputChange}
            placeholder={t("admin.clubs.openingHoursExample")}
          />
          <Input
            label={t("admin.clubs.logoUrl")}
            name="logo"
            value={formData.logo}
            onChange={handleInputChange}
            placeholder={t("admin.clubs.logoUrlPlaceholder")}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("admin.clubs.saving") : editingClub ? t("common.update") : t("common.create")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title={t("admin.clubs.deleteClub")}
      >
        <p className="mb-4">
          {t("admin.clubs.deleteConfirm", { name: deletingClub?.name || "" })}
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
            {submitting ? t("admin.clubs.deleting") : t("common.delete")}
          </Button>
        </div>
      </Modal>
    </main>
  );
}
