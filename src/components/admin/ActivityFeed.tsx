"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import "./ActivityFeed.css";

/**
 * Activity icon for feed items
 */
function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "create":
      return (
        <svg className="im-activity-feed-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "update":
      return (
        <svg className="im-activity-feed-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case "delete":
      return (
        <svg className="im-activity-feed-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );
    default:
      return (
        <svg className="im-activity-feed-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
  }
}

/**
 * Arrow right icon
 */
function ArrowRightIcon() {
  return (
    <svg
      className="im-activity-feed-arrow"
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
 * Activity item type
 */
export interface ActivityItem {
  id: string;
  type: "create" | "update" | "delete" | "other";
  action: string;
  description: string;
  timestamp: Date | string;
  user?: string;
}

/**
 * ActivityFeed Props
 */
export interface ActivityFeedProps {
  /** List of recent activity items */
  activities?: ActivityItem[];
  /** Maximum number of activities to show */
  maxItems?: number;
  /** Link to full audit log page */
  auditLogUrl?: string;
  /** Loading state */
  loading?: boolean;
}

/**
 * ActivityFeed Component
 * 
 * Displays a preview of recent audit events for the current scope.
 * Shows recent actions like club creation, court updates, booking changes, etc.
 * 
 * Provides a link to the full audit log page for detailed history.
 * Only shown to Root Admin and Organization Admin roles.
 * 
 * Uses im-* semantic classes for styling.
 * Accessible with proper ARIA attributes.
 */
export default function ActivityFeed({
  activities = [],
  maxItems = 5,
  auditLogUrl = "/admin/audit",
  loading = false,
}: ActivityFeedProps) {
  const t = useTranslations();

  if (loading) {
    return (
      <div className="im-activity-feed-section">
        <h2 className="im-activity-feed-title">{t("activityFeed.title")}</h2>
        <div className="im-activity-feed-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="im-activity-feed-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="im-activity-feed-section">
        <div className="im-activity-feed-header">
          <h2 className="im-activity-feed-title">{t("activityFeed.title")}</h2>
        </div>
        <div className="im-activity-feed-empty">
          <svg
            className="im-activity-feed-empty-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p className="im-activity-feed-empty-text">
            {t("activityFeed.noActivity")}
          </p>
        </div>
      </div>
    );
  }

  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className="im-activity-feed-section">
      <div className="im-activity-feed-header">
        <h2 className="im-activity-feed-title">{t("activityFeed.title")}</h2>
        <Link href={auditLogUrl} className="im-activity-feed-view-all">
          {t("activityFeed.viewAll")}
          <ArrowRightIcon />
        </Link>
      </div>

      <div className="im-activity-feed-list" role="feed" aria-label={t("activityFeed.title")}>
        {displayActivities.map((activity) => {
          const timestamp = typeof activity.timestamp === 'string' 
            ? new Date(activity.timestamp)
            : activity.timestamp;
          
          const formattedTime = timestamp.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <article key={activity.id} className="im-activity-feed-item" role="article">
              <div className={`im-activity-feed-item-icon-wrapper im-activity-feed-item-icon--${activity.type}`}>
                <ActivityIcon type={activity.type} />
              </div>
              
              <div className="im-activity-feed-item-content">
                <div className="im-activity-feed-item-header">
                  <h3 className="im-activity-feed-item-action">{activity.action}</h3>
                  <time 
                    className="im-activity-feed-item-time"
                    dateTime={timestamp.toISOString()}
                  >
                    {formattedTime}
                  </time>
                </div>
                
                <p className="im-activity-feed-item-description">
                  {activity.description}
                </p>
                
                {activity.user && (
                  <p className="im-activity-feed-item-user">
                    {t("activityFeed.by")} <span>{activity.user}</span>
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {activities.length > maxItems && (
        <div className="im-activity-feed-footer">
          <Link href={auditLogUrl} className="im-activity-feed-show-more">
            {t("activityFeed.showMore", { count: activities.length - maxItems })}
            <ArrowRightIcon />
          </Link>
        </div>
      )}
    </div>
  );
}
