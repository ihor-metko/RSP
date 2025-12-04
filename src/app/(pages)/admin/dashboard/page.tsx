"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";
import type { PlatformStatistics } from "@/types/admin";
import type { AdminStatusResponse } from "@/app/api/me/admin-status/route";
import "./RootDashboard.css";

/**
 * Icon Components for Statistics Cards
 */
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
 * Admin Dashboard Page
 *
 * Displays platform-wide statistics for root administrators,
 * and provides access to admin features for all admin types.
 * Access restricted to users with any admin role:
 * - root.admin (isRoot=true)
 * - super.admin (Organization Admin - ORGANIZATION_ADMIN membership)
 * - club.admin (Club Admin - CLUB_ADMIN club membership)
 */
export default function AdminDashboardPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [statistics, setStatistics] = useState<PlatformStatistics | null>(null);
  const [adminStatus, setAdminStatus] = useState<AdminStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAdminStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/me/admin-status");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/sign-in");
          return null;
        }
        throw new Error("Failed to fetch admin status");
      }
      const data: AdminStatusResponse = await response.json();
      return data;
    } catch {
      return null;
    }
  }, [router]);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/root-dashboard");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // For non-root admins, 403 is expected - don't redirect
          return null;
        }
        throw new Error("Failed to fetch statistics");
      }
      const data = await response.json();
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }

    const initializeDashboard = async () => {
      setLoading(true);
      setError("");

      // First, check admin status
      const adminData = await fetchAdminStatus();
      
      if (!adminData || !adminData.isAdmin) {
        // User is not an admin, redirect to sign-in
        router.push("/auth/sign-in");
        return;
      }

      setAdminStatus(adminData);

      // Only fetch statistics if user is root admin
      if (adminData.isRoot) {
        const statsData = await fetchStatistics();
        if (statsData) {
          setStatistics(statsData);
        } else {
          setError(t("rootAdmin.dashboard.failedToLoad"));
        }
      }

      setLoading(false);
    };

    initializeDashboard();
  }, [session, status, router, fetchAdminStatus, fetchStatistics, t]);

  // Helper to get dashboard title based on admin type
  const getDashboardTitle = () => {
    if (adminStatus?.adminType === "root_admin") {
      return t("rootAdmin.dashboard.title");
    }
    if (adminStatus?.adminType === "organization_admin") {
      return t("admin.dashboard.title");
    }
    if (adminStatus?.adminType === "club_admin") {
      return t("admin.dashboard.title");
    }
    return t("admin.dashboard.title");
  };

  // Helper to get dashboard description based on admin type
  const getDashboardDescription = () => {
    if (adminStatus?.adminType === "root_admin") {
      return t("rootAdmin.dashboard.subtitle");
    }
    if (adminStatus?.adminType === "organization_admin") {
      return t("admin.dashboard.organizationSubtitle");
    }
    if (adminStatus?.adminType === "club_admin") {
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

  // Show error only for root admins who should see statistics
  if (error && adminStatus?.isRoot) {
    return (
      <main className="im-root-dashboard-page">
        <PageHeader
          title={getDashboardTitle()}
          description={getDashboardDescription()}
        />
        <section className="rsp-content">
          <div className="im-root-dashboard-error">
            <p>{error}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="im-root-dashboard-page">
      <PageHeader
        title={getDashboardTitle()}
        description={getDashboardDescription()}
      />

      <section className="rsp-content">
        {/* Statistics Grid - Only show for root admins */}
        {adminStatus?.isRoot && statistics && (
          <div className="im-stats-grid">
            <StatCard
              title={t("rootAdmin.dashboard.totalClubs")}
              value={statistics.totalClubs}
              icon={<ClubsIcon />}
              colorClass="im-stat-card--clubs"
            />
            <StatCard
              title={t("rootAdmin.dashboard.totalUsers")}
              value={statistics.totalUsers}
              icon={<UsersIcon />}
              colorClass="im-stat-card--users"
            />
            <StatCard
              title={t("rootAdmin.dashboard.activeBookings")}
              value={statistics.activeBookings}
              icon={<BookingsIcon />}
              colorClass="im-stat-card--bookings"
            />
          </div>
        )}

        {/* Platform Overview Section - Only show for root admins */}
        {adminStatus?.isRoot && (
          <div className="im-dashboard-section">
            <h2 className="im-dashboard-section-title">
              {t("rootAdmin.dashboard.platformOverview")}
            </h2>
            <p className="im-dashboard-section-description">
              {t("rootAdmin.dashboard.platformOverviewDescription")}
            </p>
          </div>
        )}

        {/* Admin Welcome Section - Show for organization and club admins */}
        {!adminStatus?.isRoot && (
          <div className="im-dashboard-section">
            <h2 className="im-dashboard-section-title">
              {t("admin.dashboard.welcome")}
            </h2>
            <p className="im-dashboard-section-description">
              {t("admin.dashboard.welcomeDescription")}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
