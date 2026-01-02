"use client";

import { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { Button, Card } from "@/components/ui";
import { useNotifications } from "@/hooks/useNotifications";
import { AdminNotification } from "@/stores/useNotificationStore";
import { formatDateWithWeekday, formatRelativeTime } from "@/utils/date";
import "./AdminNotifications.css";

/**
 * Admin Notifications Panel
 * 
 * Displays notifications from the centralized notification store.
 * This component is fully passive and does not trigger any data loading.
 * 
 * Supports a unified notification system where all admin-relevant events are displayed:
 * - Training request notifications (REQUESTED, ACCEPTED, DECLINED, CANCELED)
 * - Booking event notifications (BOOKING_CREATED, BOOKING_UPDATED, BOOKING_CANCELLED)
 * - Payment event notifications (PAYMENT_CONFIRMED, PAYMENT_FAILED)
 * 
 * Data flow:
 * - Initial load: NotificationStoreInitializer (on app startup)
 * - Real-time updates: GlobalSocketListener (via WebSocket)
 * - UI: Reads from store and re-renders automatically
 */

function getNotificationMessage(notification: AdminNotification, locale: string): string {
  const { type, playerName, coachName, sessionDate, sessionTime, summary } = notification;
  
  // Use pre-generated summary if available (for Booking/Payment events)
  if (summary) {
    return summary;
  }
  
  // Generate message for training request events
  const dateInfo = sessionDate && sessionTime 
    ? ` for ${formatDateWithWeekday(sessionDate, locale)} at ${sessionTime}` 
    : "";

  switch (type) {
    case "REQUESTED":
      return `${playerName} submitted a training request with ${coachName}${dateInfo}`;
    case "ACCEPTED":
      return `${coachName} accepted the training request from ${playerName}${dateInfo}`;
    case "DECLINED":
      return `${coachName} declined the training request from ${playerName}${dateInfo}`;
    case "CANCELED":
      return `Training session with ${playerName} and ${coachName} was cancelled${dateInfo}`;
    default:
      return "Unknown notification";
  }
}

function getNotificationIcon(type: string): string {
  switch (type) {
    // Training request types
    case "REQUESTED":
      return "📩";
    case "ACCEPTED":
      return "✅";
    case "DECLINED":
      return "❌";
    case "CANCELED":
      return "🚫";
    // Booking event types
    case "BOOKING_CREATED":
      return "📅";
    case "BOOKING_UPDATED":
      return "🔄";
    case "BOOKING_CANCELLED":
      return "🚫";
    // Payment event types
    case "PAYMENT_CONFIRMED":
      return "💰";
    case "PAYMENT_FAILED":
      return "💳";
    default:
      return "🔔";
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AdminNotificationsPanel() {
  const locale = useLocale();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
  } = useNotifications({
    enabled: true,
  });

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleMarkNotificationAsRead = async (notificationId: string, currentlyRead: boolean) => {
    setProcessingId(notificationId);
    try {
      // Only mark as read if not already read
      if (!currentlyRead) {
        await markAsRead(notificationId);
        showToast("Notification marked as read", "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update notification", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      showToast("All notifications marked as read", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to mark all as read", "error");
    }
  };

  // Filter notifications based on showUnreadOnly
  const filteredNotifications = showUnreadOnly
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <div className="tm-admin-notifications">
      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          aria-live="polite"
          className={`tm-toast ${
            toast.type === "success" ? "tm-toast--success" : "tm-toast--error"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header Controls */}
      <div className="tm-notifications-header">
        <div className="tm-notifications-title">
          <h2>Notifications</h2>
          {unreadCount > 0 && (
            <span className="tm-unread-badge">{unreadCount}</span>
          )}
        </div>
        <div className="tm-notifications-controls">
          <button
            onClick={() => setShowUnreadOnly(false)}
            className={`tm-toggle-button ${!showUnreadOnly ? "tm-toggle-button--active" : ""}`}
            aria-pressed={!showUnreadOnly}
          >
            All
          </button>
          <button
            onClick={() => setShowUnreadOnly(true)}
            className={`tm-toggle-button ${showUnreadOnly ? "tm-toggle-button--active" : ""}`}
            aria-pressed={showUnreadOnly}
          >
            Unread
          </button>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="tm-error" role="alert">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="tm-loading">
          <div className="tm-loading-spinner"></div>
          Loading notifications...
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredNotifications.length === 0 && (
        <Card className="tm-empty-state">
          <p>
            {showUnreadOnly
              ? "No unread notifications."
              : "No notifications yet."}
          </p>
        </Card>
      )}

      {/* Notifications List */}
      {!loading && !error && filteredNotifications.length > 0 && (
        <div className="tm-notifications-list">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`tm-notification-item ${
                !notification.read ? "tm-notification-item--unread" : ""
              }`}
            >
              <div className="tm-notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="tm-notification-content">
                <div className="tm-notification-message">
                  {getNotificationMessage(notification, locale)}
                </div>
                <div className="tm-notification-meta">
                  <span className={`tm-notification-type tm-notification-type--${notification.type.toLowerCase()}`}>
                    {notification.type}
                  </span>
                  {notification.courtInfo && (
                    <span className="tm-notification-court">
                      🏟️ {notification.courtInfo}
                    </span>
                  )}
                  <span className="tm-notification-time">
                    {formatRelativeTime(notification.createdAt, locale)}
                  </span>
                </div>
              </div>
              <div className="tm-notification-actions">
                {!notification.read && (
                  <Button
                    variant="outline"
                    onClick={() => handleMarkNotificationAsRead(notification.id, notification.read)}
                    disabled={processingId === notification.id}
                    className="tm-mark-read-btn"
                  >
                    {processingId === notification.id ? "..." : "Read"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
