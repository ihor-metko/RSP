"use client";

import { useState, useCallback } from "react";
import { Button, Card } from "@/components/ui";
import { useNotifications } from "@/hooks/useNotifications";
import { AdminNotification } from "@/stores/useNotificationStore";
import "./AdminNotifications.css";

interface AdminNotificationsPanelProps {
  /**
   * @deprecated Polling is no longer used. The component now relies on Socket.IO for real-time updates.
   * This parameter is kept for backward compatibility but is ignored.
   */
  pollInterval?: number;
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateDisplay(dateStr);
}

function getNotificationMessage(notification: AdminNotification): string {
  const { type, playerName, coachName, sessionDate, sessionTime } = notification;
  const dateInfo = sessionDate && sessionTime 
    ? ` for ${formatDateDisplay(sessionDate)} at ${sessionTime}` 
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
    case "REQUESTED":
      return "📩";
    case "ACCEPTED":
      return "✅";
    case "DECLINED":
      return "❌";
    case "CANCELED":
      return "🚫";
    default:
      return "🔔";
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AdminNotificationsPanel({ pollInterval }: AdminNotificationsPanelProps) {
  // Note: pollInterval is deprecated and ignored - we rely on Socket.IO for real-time updates
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
                  {getNotificationMessage(notification)}
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
                    {formatTimeAgo(notification.createdAt)}
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
