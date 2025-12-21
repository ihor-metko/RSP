"use client";

import { useTranslations } from "next-intl";
import "./BookingsOverview.css";

/**
 * Active bookings icon
 */
function ActiveBookingsIcon() {
  return (
    <svg
      className="im-booking-overview-icon"
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
 * Past bookings icon
 */
function PastBookingsIcon() {
  return (
    <svg
      className="im-booking-overview-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

interface BookingsSummaryCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  colorClass: string;
  breakdown?: { label: string; count: number }[];
}

/**
 * Individual booking summary card
 */
function BookingsSummaryCard({
  title,
  count,
  icon,
  colorClass,
  breakdown,
}: BookingsSummaryCardProps) {
  return (
    <article className={`im-booking-overview-card ${colorClass}`}>
      <div className="im-booking-overview-card-header">
        <div className="im-booking-overview-card-icon">{icon}</div>
        <div className="im-booking-overview-card-content">
          <h3 className="im-booking-overview-card-value">
            {count.toLocaleString()}
          </h3>
          <p className="im-booking-overview-card-title">{title}</p>
        </div>
      </div>
      {breakdown && breakdown.length > 0 && (
        <div className="im-booking-overview-card-breakdown">
          {breakdown.map((item, index) => (
            <div key={index} className="im-booking-overview-breakdown-item">
              <span className="im-booking-overview-breakdown-label">
                {item.label}
              </span>
              <span className="im-booking-overview-breakdown-count">
                {item.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export interface BookingsOverviewProps {
  /** Number of active/upcoming bookings */
  activeBookings: number;
  /** Number of past bookings */
  pastBookings: number;
  /** Optional breakdown data for active bookings */
  activeBreakdown?: { label: string; count: number }[];
  /** Optional breakdown data for past bookings */
  pastBreakdown?: { label: string; count: number }[];
  /** Whether the data is loading */
  loading?: boolean;
  /** Callback to refresh bookings data */
  onRefresh?: () => void;
  /** Enable WebSocket for real-time updates (deprecated - now handled by GlobalSocketListener) */
  enableRealtime?: boolean;
}

/**
 * BookingsOverview Component
 *
 * Displays booking statistics with summary cards:
 * - Active/Upcoming Bookings: all bookings for today and future days
 * - Past Bookings: all bookings that have been completed
 *
 * Optionally shows breakdown by organization, club, or court depending on admin role.
 * Works for all admin types (Root Admin, SuperAdmin, Club Admin).
 *
 * Real-time updates are handled by GlobalSocketListener which updates the booking store.
 * This component reactively displays the latest bookings from props.
 *
 * Uses dark theme and im-* semantic classes for consistency.
 */
export default function BookingsOverview({
  activeBookings,
  pastBookings,
  activeBreakdown,
  pastBreakdown,
  loading = false,
}: BookingsOverviewProps) {
  const t = useTranslations();

  if (loading) {
    return (
      <div className="im-booking-overview-section">
        <h2 className="im-booking-overview-section-title">
          {t("bookingsOverview.title")}
        </h2>
        <div className="im-booking-overview-grid" aria-busy="true">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="im-booking-overview-card im-booking-overview-card--loading"
            >
              <div className="im-booking-overview-card-header">
                <div className="im-booking-overview-skeleton im-booking-overview-skeleton--icon" />
                <div className="im-booking-overview-skeleton-content">
                  <div className="im-booking-overview-skeleton im-booking-overview-skeleton--value" />
                  <div className="im-booking-overview-skeleton im-booking-overview-skeleton--title" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="im-booking-overview-section">
      <h2 className="im-booking-overview-section-title">
        {t("bookingsOverview.title")}
      </h2>
      <p className="im-booking-overview-section-description">
        {t("bookingsOverview.description")}
      </p>
      <div className="im-booking-overview-grid">
        <BookingsSummaryCard
          title={t("bookingsOverview.activeBookings")}
          count={activeBookings}
          icon={<ActiveBookingsIcon />}
          colorClass="im-booking-overview-card--active"
          breakdown={activeBreakdown}
        />
        <BookingsSummaryCard
          title={t("bookingsOverview.pastBookings")}
          count={pastBookings}
          icon={<PastBookingsIcon />}
          colorClass="im-booking-overview-card--past"
          breakdown={pastBreakdown}
        />
      </div>
    </div>
  );
}
