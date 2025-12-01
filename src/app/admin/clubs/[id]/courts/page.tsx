"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, Modal, IMLink } from "@/components/ui";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";
import { CourtForm, CourtFormData } from "@/components/admin/CourtForm";
import { formatPrice } from "@/utils/price";

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
}

interface Club {
  id: string;
  name: string;
}

export default function AdminCourtsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clubId, setClubId] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [deletingCourt, setDeletingCourt] = useState<Court | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setClubId(resolvedParams.id);
    });
  }, [params]);

  const fetchCourts = useCallback(async () => {
    if (!clubId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/clubs/${clubId}/courts`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Club not found");
          return;
        }
        throw new Error("Failed to fetch courts");
      }
      const data = await response.json();
      setCourts(data.courts);
      setError("");
    } catch {
      setError("Failed to load courts");
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  const fetchClub = useCallback(async () => {
    if (!clubId) return;

    try {
      const response = await fetch(`/api/clubs/${clubId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Club not found");
          return;
        }
        throw new Error("Failed to fetch club");
      }
      const data = await response.json();
      setClub(data);
    } catch {
      setError("Failed to load club");
    }
  }, [clubId]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== "admin") {
      router.push("/auth/sign-in");
      return;
    }

    if (clubId) {
      fetchClub();
      fetchCourts();
    }
  }, [session, status, router, clubId, fetchClub, fetchCourts]);

  const handleOpenCreateModal = () => {
    setEditingCourt(null);
    setIsModalOpen(true);
  };

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
    if (!clubId) return;

    setSubmitting(true);
    try {
      const url = editingCourt
        ? `/api/clubs/${clubId}/courts/${editingCourt.id}`
        : `/api/clubs/${clubId}/courts`;
      const method = editingCourt ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save court");
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
    if (!deletingCourt || !clubId) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/clubs/${clubId}/courts/${deletingCourt.id}`,
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
          <h1 className="rsp-title text-3xl font-bold">
            Courts - {club?.name || "Loading..."}
          </h1>
          <p className="rsp-subtitle text-gray-500 mt-2">
            Manage courts for this club
          </p>
        </div>
        <div className="flex items-center gap-4">
          <UserRoleIndicator />
        </div>
      </header>

      <section className="rsp-content">
        <div className="flex justify-between items-center mb-6">
          <IMLink href="/admin/clubs">
            ← Back to Clubs
          </IMLink>
          <Button onClick={handleOpenCreateModal}>+ Add Court</Button>
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
                  <th className="py-3 px-4 font-semibold">Name</th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell">
                    Type
                  </th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell">
                    Surface
                  </th>
                  <th className="py-3 px-4 font-semibold hidden sm:table-cell">
                    Indoor
                  </th>
                  <th className="py-3 px-4 font-semibold hidden sm:table-cell">
                    Price
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No courts found. Add your first court.
                    </td>
                  </tr>
                ) : (
                  courts.map((court) => (
                    <tr
                      key={court.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      style={{ borderColor: "var(--rsp-border)" }}
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium">{court.name}</span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {court.type || "-"}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {court.surface || "-"}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        {court.indoor ? "Yes" : "No"}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        {formatPrice(court.defaultPriceCents)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <IMLink
                            href={`/admin/clubs/${clubId}/courts/${court.id}/price-rules`}
                            className="inline-flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            Pricing
                          </IMLink>
                          <Button
                            variant="outline"
                            onClick={() => handleOpenEditModal(court)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleOpenDeleteModal(court)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
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
        title={editingCourt ? "Edit Court" : "Add Court"}
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
        title="Delete Court"
      >
        <p className="mb-4">
          Are you sure you want to delete court &quot;{deletingCourt?.name}
          &quot;? This action cannot be undone.
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
    </main>
  );
}
