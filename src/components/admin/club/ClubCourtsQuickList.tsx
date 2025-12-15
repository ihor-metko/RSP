"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, IMLink } from "@/components/ui";
import { CourtForm, CourtFormData } from "@/components/admin/CourtForm";
import type { ClubDetail, ClubCourt } from "@/types/club";
import "./ClubCourtsQuickList.css";

interface ClubCourtsQuickListProps {
  club: ClubDetail;
}

export function ClubCourtsQuickList({ club }: ClubCourtsQuickListProps) {
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCourt, setDeletingCourt] = useState<ClubCourt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAddCourt = useCallback(async (formData: CourtFormData) => {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/clubs/${club.id}/courts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add court");
      }

      setIsAddModalOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add court");
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [club.id, router]);

  const handleDeleteCourt = useCallback(async () => {
    if (!deletingCourt) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/clubs/${club.id}/courts/${deletingCourt.id}`,
        { method: "DELETE" }
      );

      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete court");
      }

      setIsDeleteModalOpen(false);
      setDeletingCourt(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete court");
    } finally {
      setSubmitting(false);
    }
  }, [club.id, deletingCourt, router]);

  const openDeleteModal = useCallback((court: ClubCourt) => {
    setDeletingCourt(court);
    setIsDeleteModalOpen(true);
  }, []);

  return (
    <>
      <div className="im-section-view-header">
        <h2 className="im-club-view-section-title">Courts</h2>
        <div className="im-courts-quick-actions">
          <Button
            variant="outline"
            onClick={() => setIsAddModalOpen(true)}
            className="im-section-edit-btn"
          >
            + Add Court
          </Button>
          <IMLink
            href={`/admin/clubs/${club.id}/courts`}
            className="im-courts-manage-link"
          >
            Manage All →
          </IMLink>
        </div>
      </div>

      <div className="im-section-view">
        {error && (
          <div className="im-section-edit-modal-error">{error}</div>
        )}
        {club.courts.length > 0 ? (
          <div className="im-courts-quick-list">
            {club.courts.map((court) => (
              <div key={court.id} className="im-courts-quick-item">
                <div className="im-courts-quick-info">
                  <span className="im-courts-quick-name">{court.name}</span>
                  <span className="im-courts-quick-details">
                    {[
                      court.type,
                      court.surface,
                      court.indoor ? "Indoor" : "Outdoor",
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </span>
                </div>
                <div className="im-courts-quick-item-actions">
                  <IMLink
                    href={`/admin/courts/${court.id}/price-rules`}
                    className="im-courts-quick-btn"
                  >
                    Pricing
                  </IMLink>
                  <Button
                    variant="outline"
                    onClick={() => openDeleteModal(court)}
                    className="im-courts-quick-delete-btn"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="im-section-view-value--empty">No courts added yet</p>
        )}
      </div>

      {/* Add Court Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Court"
      >
        <CourtForm
          onSubmit={handleAddCourt}
          onCancel={() => setIsAddModalOpen(false)}
          isSubmitting={submitting}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingCourt(null);
        }}
        title="Delete Court"
      >
        <p className="mb-4">
          Are you sure you want to delete court &quot;{deletingCourt?.name}&quot;?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsDeleteModalOpen(false);
              setDeletingCourt(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteCourt}
            disabled={submitting}
            className="bg-red-500 hover:bg-red-600"
          >
            {submitting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
