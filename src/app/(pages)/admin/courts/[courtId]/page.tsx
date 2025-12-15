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
import { useCourtStore } from "@/stores/useCourtStore";
import type { CourtDetail as StoreCourtDetail } from "@/types/court";

import "./page.css";

export default function CourtDetailPage({
  params,
}: {
  params: Promise<{ courtId: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [courtId, setCourtId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Use court store
  const loadingCourts = useCourtStore((state) => state.loadingCourts);
  
  // Local state for court - using store's CourtDetail type
  const [court, setCourt] = useState<StoreCourtDetail | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setCourtId(resolvedParams.courtId);
    });
  }, [params]);

  const ensureCourtByIdFromStore = useCourtStore((state) => state.ensureCourtById);
  
  const fetchCourt = useCallback(async () => {
    if (!courtId) return;

    try {
      const courtData = await ensureCourtByIdFromStore(courtId);
      setCourt(courtData);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("404")) {
          setError("Court not found");
        } else if (err.message.includes("401") || err.message.includes("403")) {
          router.push("/auth/sign-in");
        } else {
          setError("Failed to load court");
        }
      } else {
        setError("Failed to load court");
      }
    }
  }, [ensureCourtByIdFromStore, courtId, router]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }

    if (courtId) {
      fetchCourt();
    }
  }, [session, status, router, courtId, fetchCourt]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleBlockUpdate = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!courtId || !court) return;

      try {
        // Update via new API route
        const response = await fetch(`/api/admin/courts/${courtId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to save changes" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        // Refetch to get updated CourtDetail with full data
        await fetchCourt();
        showToast("success", "Changes saved successfully");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save changes";
        showToast("error", message);
        throw err;
      }
    },
    [courtId, court, fetchCourt, showToast]
  );

  const handleDelete = async () => {
    if (!courtId || !court) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/courts/${courtId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to delete court" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      router.push("/admin/courts");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to delete court");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading skeleton
  if (status === "loading" || loadingCourts) {
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
            <IMLink href="/admin/courts">← Back to Courts</IMLink>
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
                { label: "Admin", href: "/admin/courts" },
                { label: "Courts", href: "/admin/courts" },
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
            <CourtBasicBlock court={court as unknown as Parameters<typeof CourtBasicBlock>[0]['court']} onUpdate={handleBlockUpdate} />
            <CourtPricingBlock court={court as unknown as Parameters<typeof CourtPricingBlock>[0]['court']} />
            <CourtScheduleBlock court={court as unknown as Parameters<typeof CourtScheduleBlock>[0]['court']} />
            <CourtMetaBlock court={court as unknown as Parameters<typeof CourtMetaBlock>[0]['court']} />
          </div>

          {/* Preview Column */}
          <div className="im-court-detail-preview">
            <CourtPreview court={court as unknown as Parameters<typeof CourtPreview>[0]['court']} clubId={court.clubId} />
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
