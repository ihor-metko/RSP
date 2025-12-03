"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Modal, IMLink, Breadcrumbs } from "@/components/ui";
import {
  CourtBasicBlock,
  CourtPricingBlock,
  CourtScheduleBlock,
  CourtMetaBlock,
  CourtPreview,
} from "@/components/admin/court";
import { Roles } from "@/constants/roles";
import type { CourtDetail } from "@/components/admin/court";
import "./page.css";

export default function CourtDetailPage({
  params,
}: {
  params: Promise<{ id: string; courtId: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clubId, setClubId] = useState<string | null>(null);
  const [courtId, setCourtId] = useState<string | null>(null);
  const [court, setCourt] = useState<CourtDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setClubId(resolvedParams.id);
      setCourtId(resolvedParams.courtId);
    });
  }, [params]);

  const fetchCourt = useCallback(async () => {
    if (!clubId || !courtId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clubs/${clubId}/courts/${courtId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Court not found");
          return;
        }
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch court");
      }
      const data = await response.json();
      setCourt(data);
      setError("");
    } catch {
      setError("Failed to load court");
    } finally {
      setLoading(false);
    }
  }, [clubId, courtId, router]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== Roles.SuperAdmin) {
      router.push("/auth/sign-in");
      return;
    }

    if (clubId && courtId) {
      fetchCourt();
    }
  }, [session, status, router, clubId, courtId, fetchCourt]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleBlockUpdate = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!clubId || !courtId) return;

      try {
        const response = await fetch(`/api/admin/clubs/${clubId}/courts/${courtId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          // If there are field errors, throw them to the block component
          if (data.errors) {
            const error = new Error(data.error || "Validation failed");
            (error as Error & { errors: Record<string, string> }).errors = data.errors;
            throw error;
          }
          throw new Error(data.error || "Failed to update court");
        }

        const updatedCourt = await response.json();
        setCourt(updatedCourt);
        showToast("success", "Changes saved successfully");
        return updatedCourt;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save changes";
        showToast("error", message);
        throw err;
      }
    },
    [clubId, courtId, showToast]
  );

  const handleDelete = async () => {
    if (!clubId || !courtId) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/courts/${courtId}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete court");
      }

      router.push(`/admin/clubs/${clubId}/courts`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to delete court");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading skeleton
  if (status === "loading" || loading) {
    return (
      <main className="im-court-detail-page">
        <div className="im-court-detail-skeleton">
          <div className="im-court-detail-skeleton-header" />
          <div className="im-court-detail-skeleton-content">
            <div className="im-court-detail-skeleton-blocks">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="im-court-detail-skeleton-block" />
              ))}
            </div>
            <div className="im-court-detail-skeleton-preview" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="im-court-detail-page">
        <div className="im-court-detail-container">
          <div className="im-court-detail-error">
            {error}
          </div>
          <div className="im-court-detail-error-back">
            <IMLink href={`/admin/clubs/${clubId}/courts`}>← Back to Courts</IMLink>
          </div>
        </div>
      </main>
    );
  }

  if (!court) {
    return null;
  }

  return (
    <main className="im-court-detail-page">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`im-toast ${toast.type === "success" ? "im-toast--success" : "im-toast--error"}`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      <div className="im-court-detail-container">
        {/* Toolbar */}
        <div className="im-court-detail-toolbar">
          <div className="im-court-detail-toolbar-left">
            {/* Breadcrumbs */}
            <Breadcrumbs
              items={[
                { label: "Admin", href: "/admin/clubs" },
                { label: "Clubs", href: "/admin/clubs" },
                { label: court.club?.name || "Club", href: `/admin/clubs/${clubId}` },
                { label: "Courts", href: `/admin/clubs/${clubId}/courts` },
                { label: court.name },
              ]}
              className="im-court-detail-breadcrumbs !mb-0"
              ariaLabel="Court navigation"
            />
          </div>

          <div className="im-court-detail-toolbar-right">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(true)}
              className="im-court-delete-btn"
            >
              Delete Court
            </Button>
          </div>
        </div>

        {/* Header */}
        <header className="im-court-detail-header">
          <div className="im-court-detail-header-info">
            <h1 className="im-court-detail-title">{court.name}</h1>
            <div className="im-court-detail-subtitle">
              <span className={`im-court-status-badge ${court.indoor ? "im-court-status-badge--indoor" : "im-court-status-badge--outdoor"}`}>
                {court.indoor ? "Indoor" : "Outdoor"}
              </span>
              {court.type && <span className="im-court-detail-type">{court.type}</span>}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="im-court-detail-content">
          {/* Blocks Column */}
          <div className="im-court-detail-blocks">
            <CourtBasicBlock court={court} onUpdate={handleBlockUpdate} />
            <CourtPricingBlock court={court} clubId={clubId!} />
            <CourtScheduleBlock court={court} />
            <CourtMetaBlock court={court} />
          </div>

          {/* Preview Column */}
          <div className="im-court-detail-preview">
            <CourtPreview court={court} clubId={clubId!} />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Court"
      >
        <p className="mb-4">
          Are you sure you want to delete &quot;{court.name}&quot;? This action
          cannot be undone and will also delete all associated price rules and bookings.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
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
