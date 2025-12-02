"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, Modal, IMLink } from "@/components/ui";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { ClubHeaderView } from "@/components/admin/club/ClubHeaderView";
import { ClubContactsView } from "@/components/admin/club/ClubContactsView";
import { ClubHoursView } from "@/components/admin/club/ClubHoursView";
import { ClubCourtsQuickList } from "@/components/admin/club/ClubCourtsQuickList";
import { ClubGalleryView } from "@/components/admin/club/ClubGalleryView";
import { ClubCoachesView } from "@/components/admin/club/ClubCoachesView";
import type { ClubDetail } from "@/types/club";
import "./page.css";

export default function AdminClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clubId, setClubId] = useState<string | null>(null);
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setClubId(resolvedParams.id);
    });
  }, [params]);

  const fetchClub = useCallback(async () => {
    if (!clubId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clubs/${clubId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Club not found");
          return;
        }
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch club");
      }
      const data = await response.json();
      setClub(data);
      setError("");
    } catch {
      setError("Failed to load club");
    } finally {
      setLoading(false);
    }
  }, [clubId, router]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== "admin") {
      router.push("/auth/sign-in");
      return;
    }

    if (clubId) {
      fetchClub();
    }
  }, [session, status, router, clubId, fetchClub]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleSectionUpdate = useCallback(async (section: string, payload: Record<string, unknown>) => {
    if (!clubId) return;

    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/section`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, payload }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update section");
      }

      const updatedClub = await response.json();
      setClub(updatedClub);
      showToast("success", "Changes saved successfully");
      return updatedClub;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save changes";
      showToast("error", message);
      throw err;
    }
  }, [clubId, showToast]);

  const handleDelete = async () => {
    if (!clubId) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete club");
      }

      router.push("/admin/clubs");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to delete club");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!club) return;

    try {
      await handleSectionUpdate("header", {
        name: club.name,
        slug: club.slug,
        shortDescription: club.shortDescription,
        isPublic: !club.isPublic,
      });
    } catch {
      // Error already handled in handleSectionUpdate
    }
  };

  if (status === "loading" || loading) {
    return (
      <main className="rsp-container p-8">
        <div className="rsp-loading text-center">Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="rsp-container p-8">
        <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
          {error}
        </div>
        <div className="mt-4">
          <IMLink href="/admin/clubs">← Back to Clubs</IMLink>
        </div>
      </main>
    );
  }

  if (!club) {
    return null;
  }

  return (
    <main className="rsp-container p-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`im-toast ${toast.type === "success" ? "im-toast--success" : "im-toast--error"}`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      <header className="rsp-header flex items-center justify-between mb-8">
        <div>
          <div className="im-club-view-breadcrumb">
            <IMLink href="/admin/clubs" className="im-club-view-breadcrumb-link">
              Clubs
            </IMLink>
            <span className="im-club-view-breadcrumb-separator">/</span>
            <span className="im-club-view-breadcrumb-current">{club.name}</span>
          </div>
          <h1 className="rsp-title text-3xl font-bold mt-2">{club.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <UserRoleIndicator />
        </div>
      </header>

      <section className="rsp-content">
        <div className="flex justify-between items-center mb-6">
          <IMLink href="/admin/clubs">← Back to Clubs</IMLink>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTogglePublish}
            >
              {club.isPublic ? "Unpublish" : "Publish"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-red-500 hover:text-red-700"
            >
              Delete Club
            </Button>
          </div>
        </div>

        <div className="im-club-view-grid">
          {/* Header Section */}
          <Card className="im-club-view-section">
            <ClubHeaderView
              club={club}
              onUpdate={(payload) => handleSectionUpdate("header", payload)}
            />
          </Card>

          {/* Contacts Section */}
          <Card className="im-club-view-section">
            <ClubContactsView
              club={club}
              onUpdate={(payload) => handleSectionUpdate("contacts", payload)}
            />
          </Card>

          {/* Business Hours Section */}
          <Card className="im-club-view-section">
            <ClubHoursView
              club={club}
              onUpdate={(payload) => handleSectionUpdate("hours", payload)}
            />
          </Card>

          {/* Courts Quick List */}
          <Card className="im-club-view-section">
            <ClubCourtsQuickList club={club} />
          </Card>

          {/* Gallery Section */}
          <Card className="im-club-view-section">
            <ClubGalleryView
              club={club}
              onUpdate={(payload) => handleSectionUpdate("gallery", payload)}
            />
          </Card>

          {/* Coaches Section */}
          <Card className="im-club-view-section">
            <ClubCoachesView
              club={club}
              onUpdate={(payload) => handleSectionUpdate("coaches", payload)}
            />
          </Card>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Club"
      >
        <p className="mb-4">
          Are you sure you want to delete &quot;{club.name}&quot;? This action
          cannot be undone and will also delete all associated courts, gallery
          images, and business hours.
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
