"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, IMLink, PageHeader } from "@/components/ui";
import { AdminClubCard } from "@/components/admin/AdminClubCard";
import type { ClubWithCounts, ClubFormData } from "@/types/club";
import "@/components/admin/AdminClubCard.css";

const initialFormData: ClubFormData = {
  name: "",
  location: "",
  contactInfo: "",
  openingHours: "",
  logo: "",
};

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

    if (!session?.user || session.user.role !== "admin") {
      router.push("/auth/sign-in");
      return;
    }

    fetchClubs();
  }, [session, status, router, fetchClubs]);

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

  if (status === "loading" || loading) {
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
        <div className="im-admin-clubs-actions">
          <div className="im-admin-clubs-actions-left">
            <IMLink href="/">
              {t("common.backToHome")}
            </IMLink>
          </div>
          <div className="im-admin-clubs-actions-right">
            <Button onClick={handleOpenCreateModal} variant="outline">
              {t("admin.clubs.quickCreate")}
            </Button>
            <IMLink href="/admin/clubs/new" className="rsp-button">
              {t("admin.clubs.createClub")}
            </IMLink>
          </div>
        </div>

        {error && (
          <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
            {error}
          </div>
        )}

        {clubs.length === 0 ? (
          <div className="im-admin-clubs-empty">
            <p className="im-admin-clubs-empty-text">
              {t("admin.clubs.noClubs")}
            </p>
          </div>
        ) : (
          <section className="im-admin-clubs-grid">
            {clubs.map((club) => (
              <AdminClubCard
                key={club.id}
                club={club}
                onEdit={handleOpenEditModal}
                onDelete={handleOpenDeleteModal}
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
