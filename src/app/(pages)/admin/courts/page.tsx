"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Card, Modal, IMLink, PageHeader } from "@/components/ui";
import { CourtForm, CourtFormData } from "@/components/admin/CourtForm";
import { formatPrice } from "@/utils/price";
import type { AdminStatusResponse, AdminType } from "@/app/api/me/admin-status/route";

interface Court {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  surface: string | null;
  indoor: boolean;
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

export default function AdminCourtsPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [deletingCourt, setDeletingCourt] = useState<Court | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminStatus, setAdminStatus] = useState<AdminStatusResponse | null>(null);
  const [loadingAdminStatus, setLoadingAdminStatus] = useState(true);

  // Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [selectedClub, setSelectedClub] = useState("");

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

  const fetchCourts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/courts");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch courts");
      }
      const data = await response.json();
      setCourts(data);
      setError("");
    } catch {
      setError(t("admin.courts.noResults"));
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

    // First fetch admin status, then courts
    fetchAdminStatus().then((adminData) => {
      if (adminData?.isAdmin) {
        fetchCourts();
      } else {
        // User is not an admin, redirect
        router.push("/auth/sign-in");
      }
    });
  }, [session, status, router, fetchAdminStatus, fetchCourts]);

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

  // Filter courts
  const filteredCourts = useMemo(() => {
    let result = [...courts];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (court) =>
          court.name.toLowerCase().includes(query) ||
          court.club.name.toLowerCase().includes(query) ||
          court.type?.toLowerCase().includes(query) ||
          court.surface?.toLowerCase().includes(query)
      );
    }

    // Apply organization filter
    if (selectedOrganization) {
      result = result.filter(
        (court) => court.organization?.id === selectedOrganization
      );
    }

    // Apply club filter
    if (selectedClub) {
      result = result.filter((court) => court.club.id === selectedClub);
    }

    return result;
  }, [courts, searchQuery, selectedOrganization, selectedClub]);

  // Determine permissions based on admin type
  const canCreate = (adminType: AdminType | undefined): boolean =>
    adminType === "root_admin" || adminType === "organization_admin";

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

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedOrganization("");
    setSelectedClub("");
  };

  if (status === "loading" || loading || loadingAdminStatus) {
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
        {/* Filters */}
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

          {(searchQuery || selectedOrganization || selectedClub) && (
            <Button variant="outline" onClick={handleClearFilters}>
              {t("common.clearFilters")}
            </Button>
          )}
        </div>

        {error && (
          <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
            {error}
          </div>
        )}

        <Card>
          <div className="rsp-courts-table overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr
                  className="border-b"
                  style={{ borderColor: "var(--rsp-border)" }}
                >
                  <th className="py-3 px-4 font-semibold">{t("common.name")}</th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell">
                    {t("admin.courts.clubLabel")}
                  </th>
                  {showOrganizationFilter && (
                    <th className="py-3 px-4 font-semibold hidden lg:table-cell">
                      {t("sidebar.organizations")}
                    </th>
                  )}
                  <th className="py-3 px-4 font-semibold hidden md:table-cell">
                    {t("admin.courts.type")}
                  </th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell">
                    {t("admin.courts.surface")}
                  </th>
                  <th className="py-3 px-4 font-semibold hidden sm:table-cell">
                    {t("admin.courts.indoor")}
                  </th>
                  <th className="py-3 px-4 font-semibold hidden sm:table-cell">
                    {t("common.price")}
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCourts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showOrganizationFilter ? 8 : 7}
                      className="py-8 text-center text-gray-500"
                    >
                      {courts.length === 0
                        ? t("admin.courts.noResults")
                        : t("admin.courts.noResultsMatch")}
                    </td>
                  </tr>
                ) : (
                  filteredCourts.map((court) => (
                    <tr
                      key={court.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      style={{ borderColor: "var(--rsp-border)" }}
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium">{court.name}</span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <IMLink href={`/admin/clubs/${court.club.id}`}>
                          {court.club.name}
                        </IMLink>
                      </td>
                      {showOrganizationFilter && (
                        <td className="py-3 px-4 hidden lg:table-cell">
                          {court.organization?.name || "-"}
                        </td>
                      )}
                      <td className="py-3 px-4 hidden md:table-cell">
                        {court.type || "-"}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {court.surface || "-"}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        {court.indoor
                          ? t("admin.courts.indoor")
                          : t("admin.courts.outdoor")}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        {formatPrice(court.defaultPriceCents)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <IMLink
                            href={`/admin/clubs/${court.club.id}/courts/${court.id}/price-rules`}
                            className="inline-flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            {t("admin.courts.pricing")}
                          </IMLink>
                          {canEdit(adminStatus?.adminType) && (
                            <Button
                              variant="outline"
                              onClick={() => handleOpenEditModal(court)}
                            >
                              {t("common.edit")}
                            </Button>
                          )}
                          {canDelete(adminStatus?.adminType) && (
                            <Button
                              variant="outline"
                              onClick={() => handleOpenDeleteModal(court)}
                              className="text-red-500 hover:text-red-700"
                            >
                              {t("common.delete")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Navigation link to create courts via club */}
        {canCreate(adminStatus?.adminType) && (
          <div className="mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("admin.courts.addCourt")}:{" "}
              <IMLink href="/admin/clubs" className="underline">
                {t("sidebar.clubs")}
              </IMLink>
            </p>
          </div>
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
