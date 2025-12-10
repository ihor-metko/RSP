"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import OrgHeader from "@/components/admin/OrgHeader";
import KeyMetrics from "@/components/admin/KeyMetrics";
import { Button } from "@/components/ui";
import type { OrgDashboardResponse } from "@/app/api/orgs/[orgId]/dashboard/route";
import "./OrgDashboard.css";

/**
 * Plus icon for quick action buttons
 */
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
 * Organization Dashboard Page
 *
 * Displays the SuperAdmin dashboard for an organization with:
 * - Organization header (name, slug, user menu)
 * - Key metrics cards (clubs, courts, bookings, admins)
 * - Quick action buttons (create club, invite admin)
 * - Navigation links to management pages
 *
 * Access restricted to ORGANIZATION_ADMIN or root admin.
 */
export default function OrgDashboardPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;

  // Note: We don't use the organization store here because the dashboard API
  // only returns partial org data (id, name, slug) without createdAt and other fields.
  // If full org data is needed, components should fetch from the organization store separately.

  const [dashboardData, setDashboardData] = useState<OrgDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`/api/orgs/${orgId}/dashboard`);
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/sign-in");
          return;
        }
        if (response.status === 403) {
          router.push("/admin/dashboard");
          return;
        }
        if (response.status === 404) {
          setError(t("orgDashboard.notFound"));
          return;
        }
        throw new Error("Failed to fetch dashboard");
      }

      const data: OrgDashboardResponse = await response.json();
      setDashboardData(data);
      
      // Update store's currentOrg when dashboard loads successfully
      // Note: Dashboard response only includes minimal org data (id, name, slug)
      // We don't update the store here since it would overwrite complete org data with partial data
      // Components should use the full organization store if they need complete data
    } catch (err) {
      // Log error in development for debugging
      if (process.env.NODE_ENV === "development") {
        console.error("Dashboard fetch error:", err);
      }
      setError(t("orgDashboard.error"));
    } finally {
      setLoading(false);
    }
  }, [orgId, router, t]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }

    fetchDashboard();
  }, [session, status, router, fetchDashboard]);
  
  // Note: setCurrentOrg removed because dashboard doesn't provide complete org data

  if (status === "loading" || loading) {
    return (
      <main className="im-org-dashboard-page">
        <div className="im-org-dashboard-loading">
          <div className="im-org-dashboard-loading-spinner" />
          <span className="im-org-dashboard-loading-text">
            {t("orgDashboard.loading")}
          </span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="im-org-dashboard-page">
        <div className="im-org-dashboard-error">
          <p>{error}</p>
          <Button
            variant="primary"
            onClick={() => router.push("/admin/dashboard")}
          >
            {t("common.backToDashboard")}
          </Button>
        </div>
      </main>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { metrics, org } = dashboardData;

  return (
    <main className="im-org-dashboard-page">
      {/* Organization Header */}
      <OrgHeader
        orgName={org.name}
        orgSlug={org.slug}
        orgId={org.id}
        userName={session?.user?.name || undefined}
        userEmail={session?.user?.email || undefined}
      />

      <section className="im-org-dashboard-content">
        {/* Key Metrics */}
        <KeyMetrics
          clubsCount={metrics.clubsCount}
          courtsCount={metrics.courtsCount}
          bookingsToday={metrics.bookingsToday}
          clubAdminsCount={metrics.clubAdminsCount}
          loading={false}
        />

        {/* Quick Actions */}
        <div className="im-quick-actions-section">
          <h2 className="im-section-title">{t("orgDashboard.quickActions.title")}</h2>
          <div className="im-quick-actions-grid">
            <Link
              href={`/admin/orgs/${orgId}/clubs/new`}
              className="im-quick-action-btn im-quick-action-btn--primary"
            >
              <PlusIcon />
              <span>{t("orgDashboard.quickActions.createClub")}</span>
            </Link>
            <Link
              href={`/admin/orgs/${orgId}/admins/invite`}
              className="im-quick-action-btn im-quick-action-btn--secondary"
            >
              <UserPlusIcon />
              <span>{t("orgDashboard.quickActions.inviteAdmin")}</span>
            </Link>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="im-nav-links-section">
          <nav className="im-nav-links-grid" aria-label="Management pages">
            <Link
              href={`/admin/orgs/${orgId}/clubs`}
              className="im-nav-link-card"
            >
              <span className="im-nav-link-text">
                {t("orgDashboard.navigation.manageClubs")}
              </span>
              <ArrowRightIcon />
            </Link>
            <Link
              href={`/admin/orgs/${orgId}/bookings`}
              className="im-nav-link-card"
            >
              <span className="im-nav-link-text">
                {t("orgDashboard.navigation.viewBookings")}
              </span>
              <ArrowRightIcon />
            </Link>
            <Link
              href={`/admin/orgs/${orgId}/admins`}
              className="im-nav-link-card"
            >
              <span className="im-nav-link-text">
                {t("orgDashboard.navigation.manageAdmins")}
              </span>
              <ArrowRightIcon />
            </Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
