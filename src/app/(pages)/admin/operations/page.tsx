"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { useClubStore } from "@/stores/useClubStore";
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

  // Club store
  const { fetchClubsIfNeeded, loading: loadingClubs } = useClubStore();

  // Check access permissions and redirect Club Admins
  useEffect(() => {
    if (isLoadingUser) return;

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
  }, [isLoadingUser, isLoggedIn, adminStatus, router, fetchClubsIfNeeded]);

  // Handle club selection
  const handleClubSelect = (clubId: string) => {
    router.push(`/admin/operations/${clubId}`);
  };

  // Loading state
  if (isLoadingUser || loadingClubs) {
    return (
      <main className="im-club-operations-page">
        <PageHeader
          title={t("operations.title") || "Operations"}
          description={t("operations.description") || "Manage club operations"}
        />
        <div className="im-club-operations-loading">
          <TableSkeleton rows={3} columns={3} />
        </div>
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
          title={t("operations.title") || "Operations"}
          description={t("operations.description") || "Manage club operations"}
        />
        <div className="im-club-operations-error">
          <h2>{t("operations.noClubAssigned") || "No Club Assigned"}</h2>
          <p>{t("operations.noClubAssignedDescription") || "You don't have a club assigned yet. Please contact your administrator."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="im-club-operations-page">
      <PageHeader
        title={t("operations.title") || "Operations"}
        description={t("operations.description") || "Manage club operations"}
      />
      
      {/* Club selection */}
      <div className="im-club-operations-club-selection-container">
        <p className="im-club-operations-instruction">
          {t("operations.selectClubInstruction") || "Please select a club to view its operations."}
        </p>
        {/* value is intentionally empty string - this is the list page, no club is pre-selected */}
        <OperationsClubCardSelector
          value=""
          onChange={handleClubSelect}
        />
      </div>
    </main>
  );
}
