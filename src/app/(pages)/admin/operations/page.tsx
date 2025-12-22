"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { OperationsClubCardSelector } from "@/components/club-operations";
import { TableSkeleton } from "@/components/ui/skeletons";
import "./page.css";

/**
 * OperationsListPage
 * 
 * Shows a list of clubs that the admin can manage.
 * For Club Admins: Automatically redirects to their assigned club.
 * For Organization Admins and Root Admins: Shows club cards to select from.
 */
export default function OperationsListPage() {
  const t = useTranslations();
  const router = useRouter();

  // User store
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingUser = useUserStore((state) => state.isLoading);
  const isHydrated = useUserStore((state) => state.isHydrated);

  // Club store
  const { fetchClubsIfNeeded, loading: loadingClubs } = useAdminClubStore();

  // Check access permissions and redirect Club Admins
  useEffect(() => {
    // Wait for hydration before checking auth
    if (!isHydrated || isLoadingUser) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    if (!adminStatus?.isAdmin) {
      router.push("/");
      return;
    }

    // Auto-redirect Club Admins to their assigned club
    if (adminStatus.adminType === "club_admin" && adminStatus.assignedClub) {
      router.replace(`/admin/operations/${adminStatus.assignedClub.id}`);
      return;
    }

    // Load clubs for Organization Admins and Root Admins
    if (adminStatus.adminType === "organization_admin" || adminStatus.adminType === "root_admin") {
      fetchClubsIfNeeded().catch(console.error);
    }
  }, [isLoadingUser, isLoggedIn, adminStatus, router, fetchClubsIfNeeded, isHydrated]);

  // Handle club selection
  const handleClubSelect = (clubId: string) => {
    router.push(`/admin/operations/${clubId}`);
  };

  // Loading state (include hydration)
  const isLoadingState = !isHydrated || isLoadingUser || loadingClubs;

  if (isLoadingState) {
    return (
      <main className="im-club-operations-page">
        <PageHeader
          title={t("operations.title")}
          description={t("operations.description")}
        />
        <section className="rsp-content">
          <TableSkeleton rows={3} columns={3} />
        </section>
      </main>
    );
  }

  // Access denied
  if (!isLoggedIn || !adminStatus?.isAdmin) {
    return null;
  }

  // Check if Club Admin has no assigned club
  const isClubAdmin = adminStatus.adminType === "club_admin";
  if (isClubAdmin && !adminStatus.assignedClub) {
    return (
      <main className="im-club-operations-page">
        <PageHeader
          title={t("operations.title")}
          description={t("operations.description")}
        />
        <div className="im-club-operations-error">
          <h2>{t("operations.noClubAssigned")}</h2>
          <p>{t("operations.noClubAssignedDescription")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="im-club-operations-page">
      <PageHeader
        title={t("operations.title")}
        description={t("operations.description")}
      />
      
      {/* Club selection */}
      <div className="im-club-operations-club-selection-container">
        <p className="im-club-operations-instruction">
          {t("operations.selectClubInstruction")}
        </p>
        
        {/* Context block explaining what happens after selection */}
        <div className="im-club-operations-context">
          {t("operations.selectionContext")}
        </div>
        
        {/* value is intentionally empty string - this is the list page, no club is pre-selected */}
        <OperationsClubCardSelector
          value=""
          onChange={handleClubSelect}
        />
      </div>
    </main>
  );
}
