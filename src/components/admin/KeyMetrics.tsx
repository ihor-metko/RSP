"use client";

import { useTranslations } from "next-intl";
import { MetricCardSkeleton } from "@/components/ui/skeletons";
import "./KeyMetrics.css";

/**
 * Club icon for metrics card
 */
function ClubsIcon() {
  return (
    <svg
      className="im-metric-icon"
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

/**
 * Court icon for metrics card
 */
function CourtsIcon() {
  return (
    <svg
      className="im-metric-icon"
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

/**
 * Bookings icon for metrics card
 */
function BookingsIcon() {
  return (
    <svg
      className="im-metric-icon"
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
    </svg>
  );
}

/**
 * Admins icon for metrics card
 */
function AdminsIcon() {
  return (
    <svg
      className="im-metric-icon"
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

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
}

/**
 * Individual metric card component
 */
function MetricCard({ title, value, icon, colorClass }: MetricCardProps) {
  return (
    <article
      className={`im-metric-card ${colorClass}`}
      tabIndex={0}
      role="listitem"
    >
      <div className="im-metric-card-icon">{icon}</div>
      <div className="im-metric-card-content">
        <h3 className="im-metric-card-value">{value.toLocaleString()}</h3>
        <p className="im-metric-card-title">{title}</p>
      </div>
    </article>
  );
}

export interface KeyMetricsProps {
  /** Number of clubs in the organization */
  clubsCount: number;
  /** Number of courts across all clubs */
  courtsCount: number;
  /** Number of bookings for today */
  bookingsToday: number;
  /** Number of club admins */
  clubAdminsCount: number;
  /** Whether the data is loading */
  loading?: boolean;
}

/**
 * KeyMetrics Component
 *
 * Displays 4 key metric cards for the organization dashboard:
 * - Clubs Count
 * - Courts Count
 * - Bookings Today
 * - Club Admins Count
 *
 * Uses dark theme and im-* semantic classes.
 * Accessible with keyboard navigation and proper ARIA attributes.
 */
export default function KeyMetrics({
  clubsCount,
  courtsCount,
  bookingsToday,
  clubAdminsCount,
  loading = false,
}: KeyMetricsProps) {
  const t = useTranslations();

  if (loading) {
    return (
      <div className="im-metrics-grid" role="list" aria-busy="true">
        {[1, 2, 3, 4].map((i) => (
          <MetricCardSkeleton key={i} size="lg" variant="stat" />
        ))}
      </div>
    );
  }

  return (
    <div
      className="im-metrics-grid"
      role="list"
      aria-label={t("orgDashboard.keyMetrics")}
    >
      <MetricCard
        title={t("orgDashboard.metrics.clubs")}
        value={clubsCount}
        icon={<ClubsIcon />}
        colorClass="im-metric-card--clubs"
      />
      <MetricCard
        title={t("orgDashboard.metrics.courts")}
        value={courtsCount}
        icon={<CourtsIcon />}
        colorClass="im-metric-card--courts"
      />
      <MetricCard
        title={t("orgDashboard.metrics.bookingsToday")}
        value={bookingsToday}
        icon={<BookingsIcon />}
        colorClass="im-metric-card--bookings"
      />
      <MetricCard
        title={t("orgDashboard.metrics.clubAdmins")}
        value={clubAdminsCount}
        icon={<AdminsIcon />}
        colorClass="im-metric-card--admins"
      />
    </div>
  );
}
