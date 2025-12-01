"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Modal, IMLink } from "@/components/ui";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";
import { DashboardFooter } from "@/components/layout";
import type { Club, ClubFormData } from "@/types/club";

const initialFormData: ClubFormData = {
  name: "",
  location: "",
  contactInfo: "",
  openingHours: "",
  logo: "",
};

function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export default function AdminClubsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [deletingClub, setDeletingClub] = useState<Club | null>(null);
  const [formData, setFormData] = useState<ClubFormData>(initialFormData);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedClubId, setExpandedClubId] = useState<string | null>(null);

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
      setError("Failed to load clubs");
    } finally {
      setLoading(false);
    }
  }, [router]);

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

  const handleOpenEditModal = (club: Club) => {
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

  const handleOpenDeleteModal = (club: Club) => {
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

  const toggleExpandedClub = (clubId: string) => {
    setExpandedClubId((prev) => (prev === clubId ? null : clubId));
  };

  if (status === "loading" || loading) {
    return (
      <main className="rsp-container min-h-screen p-8">
        <div className="rsp-loading text-center">Loading...</div>
      </main>
    );
  }

  return (
    <main className="rsp-container min-h-screen p-8">
      <header className="rsp-header flex items-center justify-between mb-8">
        <div>
          <h1 className="rsp-title text-3xl font-bold">Admin - Clubs</h1>
          <p className="rsp-subtitle text-gray-500 mt-2">
            Manage all paddle clubs
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <UserRoleIndicator />
        </div>
      </header>

      <section className="rsp-content">
        <div className="flex justify-between items-center mb-6">
          <IMLink href="/">
            ← Back to Home
          </IMLink>
          <Button onClick={handleOpenCreateModal}>Create Club</Button>
        </div>

        {error && (
          <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
            {error}
          </div>
        )}

        <Card>
          <div className="rsp-clubs-table overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--rsp-border)" }}>
                  <th className="py-3 px-4 font-semibold">Name</th>
                  <th className="py-3 px-4 font-semibold">Address</th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell">Contact Info</th>
                  <th className="py-3 px-4 font-semibold hidden lg:table-cell">Opening Hours</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clubs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No clubs found. Create your first club.
                    </td>
                  </tr>
                ) : (
                  clubs.map((club) => (
                    <>
                      <tr
                        key={club.id}
                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                        style={{ borderColor: "var(--rsp-border)" }}
                        onClick={() => toggleExpandedClub(club.id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {isValidImageUrl(club.logo) && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={club.logo as string}
                                alt={`${club.name} logo`}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            )}
                            <span className="font-medium">{club.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{club.location}</td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          {club.contactInfo || "-"}
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          {club.openingHours || "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/clubs/${club.id}/courts`);
                              }}
                            >
                              Courts
                            </Button>
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(club);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDeleteModal(club);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedClubId === club.id && (
                        <tr
                          key={`${club.id}-expanded`}
                          className="md:hidden"
                          style={{ backgroundColor: "var(--rsp-card-bg)" }}
                        >
                          <td colSpan={5} className="py-3 px-4">
                            <div className="space-y-2 text-sm">
                              {isValidImageUrl(club.logo) && (
                                <div>
                                  <span className="font-semibold">Logo: </span>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={club.logo as string}
                                    alt={`${club.name} logo`}
                                    className="w-16 h-16 rounded-sm object-cover mt-1"
                                  />
                                </div>
                              )}
                              <div>
                                <span className="font-semibold">Contact Info: </span>
                                {club.contactInfo || "-"}
                              </div>
                              <div>
                                <span className="font-semibold">Opening Hours: </span>
                                {club.openingHours || "-"}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingClub ? "Edit Club" : "Create Club"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {formError}
            </div>
          )}
          <Input
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Club name"
            required
          />
          <Input
            label="Address"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="Club address"
            required
          />
          <Input
            label="Contact Info"
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleInputChange}
            placeholder="Phone or email"
          />
          <Input
            label="Opening Hours"
            name="openingHours"
            value={formData.openingHours}
            onChange={handleInputChange}
            placeholder="e.g., Mon-Fri 9am-10pm"
          />
          <Input
            label="Logo URL"
            name="logo"
            value={formData.logo}
            onChange={handleInputChange}
            placeholder="https://example.com/logo.png"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingClub ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Club"
      >
        <p className="mb-4">
          Are you sure you want to delete &quot;{deletingClub?.name}&quot;? This action
          cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCloseDeleteModal}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={submitting}
            className="bg-red-500 hover:bg-red-600"
          >
            {submitting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>

      {/* Dashboard Footer */}
      <DashboardFooter />
    </main>
  );
}
