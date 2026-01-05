"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Modal, IMLink, DangerZone, EntityBanner } from "@/components/ui";
import type { DangerAction } from "@/components/ui";
import {
  CourtBasicBlock,
  CourtPricingBlock,
  CourtScheduleBlock,
  CourtPreview,
} from "@/components/admin/court";
import { CourtEditor } from "@/components/admin/CourtEditor.client";
import { useAdminCourtsStore } from "@/stores/useAdminCourtsStore";
import { useUserStore } from "@/stores/useUserStore";
import { useCanEditClub } from "@/hooks/useCanEditClub";
import { parseCourtBannerData } from "@/utils/court-metadata";
import type { CourtDetail as StoreCourtDetail } from "@/types/court";

import "./page.css";
import "@/components/EntityPageLayout.css";

export default function CourtDetailPage({
  params,
}: {
  params: Promise<{ courtId: string }>;
}) {
  const router = useRouter();
  const t = useTranslations();

  // Use store for auth
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  const [courtId, setCourtId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Use court store
  const loadingCourts = useAdminCourtsStore((state) => state.loadingCourts);
  // const ensureCourtByIdFromStore = useAdminCourtsStore((state) => state.ensureCourtById);

  // Local state for court - using store's CourtDetail type
  const [court, setCourt] = useState<StoreCourtDetail | null>(null);

  // Check if user can manage this court (must be called at top level)
  // Based on API logic: club admins can manage courts in their clubs,
  // organization admins can manage courts in clubs under their organization,
  // and root admins can manage all courts
  const canManageCourt = useCanEditClub(court?.clubId);

  useEffect(() => {
    params.then((resolvedParams) => {
      setCourtId(resolvedParams.courtId);
    });
  }, [params]);

  const fetchCourt = useCallback(async () => {
    if (!courtId) return;

    try {
      // First fetch to get clubId, then use it for proper admin store fetching
      // We need clubId for the admin store architecture
      const response = await fetch(`/api/admin/courts/${courtId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Court not found");
        } else if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
        } else {
          setError("Failed to load court");
        }
        return;
      }

      const courtData = await response.json();
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
  }, [courtId, router]);

  useEffect(() => {
    if (!isHydrated || isLoading) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    if (courtId) {
      fetchCourt();
    }
  }, [isLoggedIn, isLoading, router, courtId, fetchCourt, isHydrated]);

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
      setIsDeleteModalOpen(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!court) return;

    setIsTogglingPublish(true);
    try {
      const response = await fetch(`/api/admin/courts/${courtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublished: !court.isPublished,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update court");
      }

      await fetchCourt();
      setIsPublishModalOpen(false);
      showToast(
        "success",
        court.isPublished
          ? t("courts.courtUnpublishedSuccess")
          : t("courts.courtPublishedSuccess")
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save changes";
      showToast("error", message);
    } finally {
      setIsTogglingPublish(false);
    }
  };

  const handleOpenPublishModal = useCallback(() => {
    setIsPublishModalOpen(true);
  }, []);

  // Prepare DangerZone actions (memoized to prevent unnecessary re-renders)
  // NOTE: Must be called before any early returns to follow Rules of Hooks
  const dangerActions: DangerAction[] = useMemo(() => {
    // Return empty array if no court data or no permission to manage
    if (!court || !canManageCourt) return [];

    return [
      {
        id: 'publish',
        title: court.isPublished ? t("dangerZone.makeCourtPrivate") : t("dangerZone.makeCourtPublic"),
        description: court.isPublished
          ? t("dangerZone.unpublishCourtDescription")
          : t("dangerZone.publishCourtDescription"),
        buttonLabel: court.isPublished ? t("dangerZone.makeCourtPrivate") : t("dangerZone.makeCourtPublic"),
        onAction: handleOpenPublishModal,
        isProcessing: isTogglingPublish,
        variant: court.isPublished ? 'danger' : 'warning',
        show: canManageCourt,
      },
      {
        id: 'delete',
        title: t("dangerZone.deleteCourt"),
        description: t("dangerZone.deleteCourtDescription"),
        buttonLabel: t("common.delete"),
        onAction: () => setIsDeleteModalOpen(true),
        isProcessing: submitting,
        variant: 'danger',
        show: canManageCourt,
      },
    ];
  }, [court, canManageCourt, isTogglingPublish, submitting, t, handleOpenPublishModal]);

  const handleOpenDetailsEdit = () => {
    setIsEditingDetails(true);
  };

  // Loading skeleton
  if (loadingCourts || isLoading) {
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
            <IMLink href="/admin/courts">{t("courtDetail.navigation.backToCourts")}</IMLink>
          </div>
        </div>
      </main>
    );
  }

  if (!court) {
    return null;
  }

  // Parse court bannerData for banner alignment
  const courtBannerData = parseCourtBannerData(court.bannerData);

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

      {/* Entity Banner Section - no location/address for courts */}
      <EntityBanner
        title={court.name}
        subtitle={court.type || (court.indoor ? t("courtDetail.subtitle.indoorCourt") : t("courtDetail.subtitle.outdoorCourt"))}
        imageUrl={courtBannerData?.url}
        bannerAlignment={courtBannerData?.bannerAlignment || 'center'}
        imageAlt={`${court.name} banner`}
        isPublished={court.isPublished}
        onEdit={handleOpenDetailsEdit}
      />

      <div className="entity-page-content">
        {/* Main Content */}
        <div className="im-court-detail-content">
          {/* Blocks Column */}
          <div className="im-court-detail-blocks">
            <CourtBasicBlock court={court as unknown as Parameters<typeof CourtBasicBlock>[0]['court']} onUpdate={handleBlockUpdate} />
            <CourtPricingBlock court={court as unknown as Parameters<typeof CourtPricingBlock>[0]['court']} />
            <CourtScheduleBlock court={court as unknown as Parameters<typeof CourtScheduleBlock>[0]['court']} />
          </div>

          {/* Preview Column */}
          <div className="im-court-detail-preview">
            <CourtPreview court={court as unknown as Parameters<typeof CourtPreview>[0]['court']} clubId={court.clubId} />
          </div>
        </div>

        {/* Danger Zone Section - At the very bottom */}
        <section className="im-admin-court-danger-zone-section">
          <DangerZone actions={dangerActions} />
        </section>
      </div>

      {/* Publish/Unpublish Confirmation Modal */}
      <Modal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title={court.isPublished ? t("dangerZone.makeCourtPrivate") : t("dangerZone.makeCourtPublic")}
      >
        <p className="mb-4">
          {court.isPublished
            ? t("dangerZone.unpublishCourtConfirm", { name: court.name })
            : t("dangerZone.publishCourtConfirm", { name: court.name })
          }
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsPublishModalOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleTogglePublish}
            disabled={isTogglingPublish}
            className={court.isPublished ? "bg-red-500 hover:bg-red-600" : ""}
          >
            {isTogglingPublish ? t("common.processing") : (court.isPublished ? t("dangerZone.makeCourtPrivate") : t("dangerZone.makeCourtPublic"))}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t("dangerZone.deleteCourt")}
      >
        <p className="mb-4">
          {t("courts.deleteConfirm", { name: court.name })}
        </p>
        <p className="mb-4 text-sm opacity-70">
          {t("courts.deleteWarning")}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
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

      {/* Court Editor Modal */}
      {court && (
        <CourtEditor
          isOpen={isEditingDetails}
          onClose={() => setIsEditingDetails(false)}
          court={court}
          onRefresh={fetchCourt}
        />
      )}
    </main>
  );
}
