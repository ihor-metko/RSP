"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import BookingsOverview from "@/components/admin/BookingsOverview";
import { RegisteredUsersCard } from "@/components/admin/RegisteredUsersCard";
import DashboardGraphs from "@/components/admin/DashboardGraphs";
import type { UnifiedDashboardResponse, UnifiedDashboardClub } from "@/app/api/admin/unified-dashboard/route";
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function UsersIcon() {
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BookingsIcon() {
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
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
    </svg>
  );
}

/**
 * Plus icon for quick action buttons
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PlusIcon() {
  return (
    <svg
      className="im-quick-action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/**
 * User plus icon for invite admin button
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function UserPlusIcon() {
  return (
    <svg
      className="im-quick-action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

/**
 * Arrow right icon for navigation links
 */
function ArrowRightIcon() {
  return (
    <svg
      className="im-nav-link-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/**
 * Courts icon for club dashboard
 */
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
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
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
 * Club Card Component
 * Displays club metrics and navigation links for club admins
 */
interface ClubCardProps {
  club: UnifiedDashboardClub;
}

function ClubCard({ club }: ClubCardProps) {
  const t = useTranslations();

  // Prepare breakdown by courts for club admin
  const courtBreakdown = club.courtsCount > 0
    ? [{ label: t("unifiedDashboard.byCourts"), count: club.courtsCount }]
    : undefined;

  return (
    <div className="im-dashboard-section">
      <div className="im-org-card-header">
        <h3 className="im-org-card-title">{club.name}</h3>
        {club.organizationName && (
          <span className="im-org-card-slug">{club.organizationName}</span>
        )}
      </div>

      <div className="im-stats-grid im-stats-grid--club">
        <StatCard
          title={t("unifiedDashboard.courts")}
          value={club.courtsCount}
          icon={<CourtsIcon />}
          colorClass="im-stat-card--clubs"
        />
        <StatCard
          title={t("unifiedDashboard.bookingsToday")}
          value={club.bookingsToday}
          icon={<BookingsIcon />}
          colorClass="im-stat-card--bookings"
        />
      </div>

      <BookingsOverview
        activeBookings={club.activeBookings}
        pastBookings={club.pastBookings}
        activeBreakdown={courtBreakdown}
      />

      <div className="im-nav-links-section">
        <nav className="im-nav-links-grid im-nav-links-grid--club" aria-label={t("unifiedDashboard.managementLinks")}>
          <Link
            href={`/admin/clubs/${club.id}`}
            className="im-nav-link-card"
          >
            <span className="im-nav-link-text">
              {t("unifiedDashboard.manageClub")}
            </span>
            <ArrowRightIcon />
          </Link>
          <Link
            href={`/admin/clubs/${club.id}/courts`}
            className="im-nav-link-card"
          >
            <span className="im-nav-link-text">
              {t("unifiedDashboard.manageCourts")}
            </span>
            <ArrowRightIcon />
          </Link>
          <Link
            href={`/admin/clubs/${club.id}/bookings`}
            className="im-nav-link-card"
          >
            <span className="im-nav-link-text">
              {t("unifiedDashboard.viewBookings")}
            </span>
            <ArrowRightIcon />
          </Link>
        </nav>
      </div>
    </div>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/unified-dashboard");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/sign-in");
          return null;
        }
        if (response.status === 403) {
          router.push("/auth/sign-in");
          return null;
        }
        throw new Error("Failed to fetch dashboard");
      }
      const data: UnifiedDashboardResponse = await response.json();
      return data;
    } catch {
      return null;
    }
  }, [router]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }

    const initializeDashboard = async () => {
      setLoading(true);
      setError("");

      const data = await fetchDashboard();

      if (!data) {
        setError(t("unifiedDashboard.failedToLoad"));
        setLoading(false);
        return;
      }

      setDashboardData(data);
      setLoading(false);
    };

    initializeDashboard();
  }, [session, status, router, fetchDashboard, t]);

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

  if (status === "loading" || loading) {
    return (
      <main className="im-root-dashboard-page">
        <div className="im-root-dashboard-loading">
          <div className="im-root-dashboard-loading-spinner" />
          <span className="im-root-dashboard-loading-text">{t("common.loading")}</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="im-root-dashboard-page">
        <PageHeader
          title={t("admin.dashboard.title")}
          description={t("admin.dashboard.subtitle")}
        />
        <section className="rsp-content">
          <div className="im-root-dashboard-error">
            <p>{error}</p>
          </div>
        </section>
      </main>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <main className="im-root-dashboard-page">
      <PageHeader
        title={getDashboardTitle()}
        description={getDashboardDescription()}
      />

      <section className="rsp-content">
        {/* Root Admin: Platform Statistics */}
        {dashboardData.adminType === "root_admin" && dashboardData.platformStats && (
          <>
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
            <div className="im-stats-grid" style={{ gridTemplateColumns: "1fr" }}>
              <RegisteredUsersCard />
            </div>

            {/* Bookings Overview Section */}
            <BookingsOverview
              activeBookings={dashboardData.platformStats.activeBookingsCount}
              pastBookings={dashboardData.platformStats.pastBookingsCount}
            />

            {/* Dashboard Graphs Section */}
            <DashboardGraphs />

            <div className="im-dashboard-section">
              <h2 className="im-dashboard-section-title">
                {t("rootAdmin.dashboard.platformOverview")}
              </h2>
              <p className="im-dashboard-section-description">
                {t("rootAdmin.dashboard.platformOverviewDescription")}
              </p>
            </div>
          </>
        )}

        {/* Organization Admin: Organization-scoped dashboard with Root Admin layout */}
        {dashboardData.adminType === "organization_admin" && dashboardData.organizations && (
          <>
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
            />

            {/* Dashboard Graphs Section */}
            <DashboardGraphs />
          </>
        )}

        {/* Club Admin: Club-specific dashboards */}
        {dashboardData.adminType === "club_admin" && dashboardData.clubs && (
          <>
            <div className="im-org-cards-container">
              {dashboardData.clubs.map((club) => (
                <ClubCard key={club.id} club={club} />
              ))}
            </div>
            {/* Dashboard Graphs Section */}
            <DashboardGraphs />
          </>
        )}
      </section>
    </main>
  );
}
