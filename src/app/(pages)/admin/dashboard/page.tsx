"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";
import BookingsOverview from "@/components/admin/BookingsOverview";
import { RegisteredUsersCard } from "@/components/admin/RegisteredUsersCard";
import DashboardGraphs from "@/components/admin/DashboardGraphs";
import DashboardShell from "@/components/admin/DashboardShell";
import { DashboardPlaceholder } from "@/components/ui/skeletons";
import type { UnifiedDashboardResponse } from "@/app/api/admin/unified-dashboard/route";
import { fetchUnifiedDashboard } from "@/services/dashboard";
import { useUserStore } from "@/stores/useUserStore";
import "./RootDashboard.css";

/**
 * Icon Components for Statistics Cards
 */
function OrganizationsIcon() {
  return (
    <svg
      className="im-stat-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

function ClubsIcon() {
  return (
    <svg
      className="im-stat-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CourtsIcon() {
  return (
    <svg
      className="im-stat-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
}

function StatCard({ title, value, icon, colorClass }: StatCardProps) {
  return (
    <article className={`im-stat-card ${colorClass}`}>
      <div className="im-stat-card-icon">{icon}</div>
      <div className="im-stat-card-content">
        <h3 className="im-stat-card-value">{value.toLocaleString()}</h3>
        <p className="im-stat-card-title">{title}</p>
      </div>
    </article>
  );
}

/**
 * Unified Admin Dashboard Page
 *
 * Displays role-appropriate content for all admin types:
 * - Root Admin: Platform-wide statistics and overview
 * - Organization Admin: Metrics for their organizations with quick actions
 * - Club Admin: Metrics for their clubs with navigation links
 *
 * Access restricted to users with any admin role.
 */
export default function AdminDashboardPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<UnifiedDashboardResponse | null>(null);
  const [error, setError] = useState("");
  const isHydrated = useUserStore((state) => state.isHydrated);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await fetchUnifiedDashboard();
      return data;
    } catch (error) {
      // Handle unauthorized errors
      if (error instanceof Error && error.message === "Unauthorized") {
        router.push("/auth/sign-in");
      }
      return null;
    }
  }, [router]);

  // Refresh dashboard data
  const refreshDashboard = useCallback(async () => {
    const data = await fetchDashboard();
    if (data) {
      setDashboardData(data);
    }
  }, [fetchDashboard]);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!isHydrated) return;
    
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }

    const initializeDashboard = async () => {
      setError("");

      const data = await fetchDashboard();

      if (!data) {
        setError(t("unifiedDashboard.failedToLoad"));
        return;
      }

      setDashboardData(data);
    };

    initializeDashboard();
  }, [session, status, router, fetchDashboard, t, isHydrated]);

  // Helper to get dashboard title based on admin type
  const getDashboardTitle = () => {
    if (dashboardData?.adminType === "root_admin") {
      return t("rootAdmin.dashboard.title");
    }
    if (dashboardData?.adminType === "organization_admin") {
      return t("unifiedDashboard.organizationTitle");
    }
    if (dashboardData?.adminType === "club_admin") {
      return t("unifiedDashboard.clubTitle");
    }
    return t("admin.dashboard.title");
  };

  // Helper to get dashboard description based on admin type
  const getDashboardDescription = () => {
    if (dashboardData?.adminType === "root_admin") {
      return t("rootAdmin.dashboard.subtitle");
    }
    if (dashboardData?.adminType === "organization_admin") {
      return t("admin.dashboard.organizationSubtitle");
    }
    if (dashboardData?.adminType === "club_admin") {
      return t("admin.dashboard.clubSubtitle");
    }
    return t("admin.dashboard.subtitle");
  };

  // Show skeleton while hydrating or loading
  const isLoadingState = !isHydrated || status === "loading" || !dashboardData;

  if (isLoadingState && !error) {
    return (
      <main className="im-root-dashboard-page">
        <PageHeader
          title={t("admin.dashboard.title")}
          description={t("admin.dashboard.subtitle")}
        />
        <section className="rsp-content">
          <DashboardPlaceholder
            metricCount={4}
            showGraphs={true}
            graphCount={2}
            showHeader={false}
          />
        </section>
      </main>
    );
  }

  if (error || !dashboardData) {
    return (
      <main className="im-root-dashboard-page">
        <PageHeader
          title={t("admin.dashboard.title")}
          description={t("admin.dashboard.subtitle")}
        />
        <section className="rsp-content">
          <div className="im-root-dashboard-error">
            <p>{error || t("common.noData")}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="im-root-dashboard-page">
      <DashboardShell
        header={
          <PageHeader
            title={getDashboardTitle()}
            description={getDashboardDescription()}
          />
        }
      >
        {/* Root Admin: Platform Statistics */}
        {dashboardData.adminType === "root_admin" && dashboardData.platformStats && (
          <>
            <div className="im-dashboard-section">
              <h2 className="im-dashboard-section-title">
                {t("rootAdmin.dashboard.platformStatsTitle")}
              </h2>
              <p className="im-dashboard-section-description">
                {t("rootAdmin.dashboard.platformStatsDescription")}
              </p>
            </div>

            <div className="im-stats-grid">
              <StatCard
                title={t("rootAdmin.dashboard.totalOrganizations")}
                value={dashboardData.platformStats.totalOrganizations}
                icon={<OrganizationsIcon />}
                colorClass="im-stat-card--organizations"
              />
              <StatCard
                title={t("rootAdmin.dashboard.totalClubs")}
                value={dashboardData.platformStats.totalClubs}
                icon={<ClubsIcon />}
                colorClass="im-stat-card--clubs"
              />
            </div>

            {/* Registered Users Card - Shows filtered, real players only */}
            <div className="im-dashboard-section">
              <h2 className="im-dashboard-section-title">
                {t("rootAdmin.dashboard.registeredUsersTitle")}
              </h2>
              <p className="im-dashboard-section-description">
                {t("rootAdmin.dashboard.registeredUsersDescription")}
              </p>
            </div>

            <div className="im-stats-grid" style={{ gridTemplateColumns: "1fr" }}>
              <RegisteredUsersCard />
            </div>

            {/* Bookings Overview Section */}
            <BookingsOverview
              activeBookings={dashboardData.platformStats.activeBookingsCount}
              pastBookings={dashboardData.platformStats.pastBookingsCount}
              onRefresh={refreshDashboard}
              enableRealtime={true}
            />

            {/* Dashboard Graphs Section */}
            <DashboardGraphs />
          </>
        )}

        {/* Organization Admin: Organization-scoped dashboard */}
        {dashboardData.adminType === "organization_admin" && dashboardData.organizations && (
          <>
            <div className="im-dashboard-section">
              <h2 className="im-dashboard-section-title">
                {t("unifiedDashboard.clubsStatsTitle")}
              </h2>
              <p className="im-dashboard-section-description">
                {t("unifiedDashboard.clubsStatsDescription")}
              </p>
            </div>

            {/* Clubs Count Card - organization-scoped */}
            <div className="im-stats-grid">
              <StatCard
                title={t("rootAdmin.dashboard.totalClubs")}
                value={dashboardData.organizations.reduce((sum, org) => sum + org.clubsCount, 0)}
                icon={<ClubsIcon />}
                colorClass="im-stat-card--clubs"
              />
            </div>

            {/* Bookings Overview Section - organization-scoped */}
            <BookingsOverview
              activeBookings={dashboardData.organizations.reduce((sum, org) => sum + org.activeBookings, 0)}
              pastBookings={dashboardData.organizations.reduce((sum, org) => sum + org.pastBookings, 0)}
              onRefresh={refreshDashboard}
              enableRealtime={true}
            />

            {/* Dashboard Graphs Section */}
            <DashboardGraphs />
          </>
        )}

        {/* Club Admin: Club-specific dashboards */}
        {dashboardData.adminType === "club_admin" && dashboardData.clubs && (
          <>
            <div className="im-dashboard-section">
              <h2 className="im-dashboard-section-title">
                {t("unifiedDashboard.clubAdminStatsTitle")}
              </h2>
              <p className="im-dashboard-section-description">
                {t("unifiedDashboard.clubAdminStatsDescription")}
              </p>
            </div>

            {/* Total Courts Card - club admin scoped */}
            <div className="im-stats-grid">
              <StatCard
                title={t("unifiedDashboard.totalCourts")}
                value={dashboardData.clubs.reduce((sum, club) => sum + club.courtsCount, 0)}
                icon={<CourtsIcon />}
                colorClass="im-stat-card--courts"
              />
            </div>

            {/* Bookings Overview Section - club admin scoped */}
            <BookingsOverview
              activeBookings={dashboardData.clubs.reduce((sum, club) => sum + club.activeBookings, 0)}
              pastBookings={dashboardData.clubs.reduce((sum, club) => sum + club.pastBookings, 0)}
              onRefresh={refreshDashboard}
              enableRealtime={true}
            />

            {/* Dashboard Graphs Section */}
            <DashboardGraphs />
          </>
        )}
      </DashboardShell>
    </main>
  );
}
