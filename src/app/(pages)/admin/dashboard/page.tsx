"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";
import { Roles } from "@/constants/roles";
import type { PlatformStatistics } from "@/types/admin";
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
 * Root Admin Dashboard Page
 *
 * Displays platform-wide statistics for root administrators.
 * Access restricted to users with root_admin role only.
 */
export default function RootDashboardPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [statistics, setStatistics] = useState<PlatformStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/root-dashboard");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch statistics");
      }
      const data = await response.json();
      setStatistics(data);
      setError("");
    } catch {
      setError(t("rootAdmin.dashboard.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== Roles.RootAdmin) {
      router.push("/auth/sign-in");
      return;
    }

    fetchStatistics();
  }, [session, status, router, fetchStatistics]);

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
          title={t("rootAdmin.dashboard.title")}
          description={t("rootAdmin.dashboard.subtitle")}
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
        title={t("rootAdmin.dashboard.title")}
        description={t("rootAdmin.dashboard.subtitle")}
      />

      <section className="rsp-content">
        {/* Statistics Grid */}
        <div className="im-stats-grid">
          <StatCard
            title={t("rootAdmin.dashboard.totalClubs")}
            value={statistics?.totalClubs ?? 0}
            icon={<ClubsIcon />}
            colorClass="im-stat-card--clubs"
          />
          <StatCard
            title={t("rootAdmin.dashboard.totalUsers")}
            value={statistics?.totalUsers ?? 0}
            icon={<UsersIcon />}
            colorClass="im-stat-card--users"
          />
          <StatCard
            title={t("rootAdmin.dashboard.activeBookings")}
            value={statistics?.activeBookings ?? 0}
            icon={<BookingsIcon />}
            colorClass="im-stat-card--bookings"
          />
        </div>

        {/* Platform Overview Section */}
        <div className="im-dashboard-section">
          <h2 className="im-dashboard-section-title">
            {t("rootAdmin.dashboard.platformOverview")}
          </h2>
          <p className="im-dashboard-section-description">
            {t("rootAdmin.dashboard.platformOverviewDescription")}
          </p>
        </div>
      </section>
    </main>
  );
}
