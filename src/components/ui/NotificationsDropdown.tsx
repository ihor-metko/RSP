/**
 * NotificationsDropdown Component
 * 
 * A reusable notification bell icon with dropdown menu for admin users.
 * 
 * Features:
 * - Real-time notifications via SSE (Server-Sent Events)
 * - Unread count badge
 * - Dropdown menu with recent notifications
 * - Toast notifications for new events
 * - Keyboard accessible (Enter/Esc, focus trap)
 * - Mark as read functionality
 * 
 * Data Source:
 * - Uses `useAdminNotifications` hook which connects to `/api/admin/notifications/stream`
 * - Fetches from `/api/admin/notifications` API endpoint
 * - Automatically polls if SSE is unavailable
 * 
 * Usage:
 * ```tsx
 * <NotificationsDropdown maxDropdownItems={10} />
 * ```
 */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@/components/ui";
import { useAdminNotifications, AdminNotification } from "@/hooks/useAdminNotifications";
import { NotificationToastContainer } from "@/components/admin/NotificationToast";
import "./NotificationsDropdown.css";

export interface NotificationsDropdownProps {
  /** Maximum number of items to show in dropdown before "View all" link */
  maxDropdownItems?: number;
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
  return date.toLocaleDateString();
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

function generateNotificationSummary(
  notification: AdminNotification
): string {
  const { type, playerName, coachName, sessionDate, sessionTime } = notification;
  const dateInfo =
    sessionDate && sessionTime
      ? ` for ${new Date(sessionDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} at ${sessionTime}`
      : "";

  switch (type) {
    case "REQUESTED":
      return `${playerName || "Player"} requested training with ${coachName || "coach"}${dateInfo}`;
    case "ACCEPTED":
      return `${coachName || "Coach"} accepted training request${dateInfo}`;
    case "DECLINED":
      return `${coachName || "Coach"} declined training request${dateInfo}`;
    case "CANCELED":
      return `Training session was cancelled${dateInfo}`;
    default:
      return "New notification";
  }
}

export function NotificationsDropdown({ maxDropdownItems = 10 }: NotificationsDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);
  const [toasts, setToasts] = useState<
    Array<{ id: string; type: AdminNotification["type"]; summary: string }>
  >([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle new notification callback
  const handleNewNotification = useCallback((notification: AdminNotification) => {
    const summary = notification.summary || generateNotificationSummary(notification);
    setToasts((prev) => {
      // Limit to 3 toasts max
      const newToasts = [
        { id: notification.id, type: notification.type, summary },
        ...prev.slice(0, 2),
      ];
      return newToasts;
    });
  }, []);

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    connectionStatus,
  } = useAdminNotifications({
    enabled: true,
    onNewNotification: handleNewNotification,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    } else if (event.key === "Enter" || event.key === " ") {
      setIsOpen((prev) => !prev);
    }
  };

  // Open notification details
  const handleViewNotification = async (notification: AdminNotification) => {
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
      } catch {
        // Continue even if marking as read fails
      }
    }
    setSelectedNotification(notification);
    setIsOpen(false);
  };

  // Handle toast view
  const handleToastView = (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId);
    if (notification) {
      handleViewNotification(notification);
    }
    setToasts((prev) => prev.filter((t) => t.id !== notificationId));
  };

  // Handle toast dismiss
  const handleToastDismiss = (notificationId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== notificationId));
  };

  // Navigate to full notifications page
  const handleViewAll = () => {
    setIsOpen(false);
    router.push("/admin/notifications");
  };

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch {
      // Handle error silently
    }
  };

  const displayedNotifications = notifications.slice(0, maxDropdownItems);

  return (
    <>
      {/* Toast Container */}
      <NotificationToastContainer
        toasts={toasts}
        onView={handleToastView}
        onDismiss={handleToastDismiss}
      />

      {/* Bell Icon and Dropdown */}
      <div className="tm-notification-bell" ref={dropdownRef}>
        <button
          className="tm-bell-button"
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <span className="tm-bell-icon">🔔</span>
          {unreadCount > 0 && (
            <span className="tm-bell-badge" aria-hidden="true">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          {/* Connection status indicator */}
          <span
            className={`tm-bell-status tm-bell-status--${connectionStatus}`}
            aria-label={`Connection status: ${connectionStatus}`}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className="tm-bell-dropdown"
            role="menu"
            aria-label="Notifications dropdown"
          >
            <div className="tm-dropdown-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  className="tm-mark-all-btn"
                  onClick={handleMarkAllRead}
                >
                  Mark all read
                </Button>
              )}
            </div>

            {loading && (
              <div className="tm-dropdown-loading">Loading...</div>
            )}

            {error && (
              <div className="tm-dropdown-error">{error}</div>
            )}

            {!loading && !error && displayedNotifications.length === 0 && (
              <div className="tm-dropdown-empty">No notifications</div>
            )}

            {!loading && !error && displayedNotifications.length > 0 && (
              <ul className="tm-dropdown-list" role="listbox">
                {displayedNotifications.map((notification) => (
                  <li
                    key={notification.id}
                    role="option"
                    aria-selected={false}
                    className={`tm-dropdown-item ${
                      !notification.read ? "tm-dropdown-item--unread" : ""
                    }`}
                  >
                    <button
                      className="tm-dropdown-item-button"
                      onClick={() => handleViewNotification(notification)}
                    >
                      <span className="tm-dropdown-item-icon">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="tm-dropdown-item-content">
                        <span className="tm-dropdown-item-summary">
                          {generateNotificationSummary(notification)}
                        </span>
                        <span className="tm-dropdown-item-time">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="tm-dropdown-footer">
              <Button variant="outline" onClick={handleViewAll} className="tm-view-all-btn">
                View all notifications
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Details Modal */}
      {selectedNotification && (
        <Modal
          isOpen={!!selectedNotification}
          onClose={() => setSelectedNotification(null)}
          title="Notification Details"
        >
          <div className="tm-notification-details">
            <div className="tm-details-header">
              <span className="tm-details-icon">
                {getNotificationIcon(selectedNotification.type)}
              </span>
              <span
                className={`tm-details-type tm-details-type--${selectedNotification.type.toLowerCase()}`}
              >
                {selectedNotification.type}
              </span>
            </div>

            <div className="tm-details-body">
              <div className="tm-details-row">
                <span className="tm-details-label">Summary</span>
                <span className="tm-details-value">
                  {generateNotificationSummary(selectedNotification)}
                </span>
              </div>

              {selectedNotification.playerName && (
                <div className="tm-details-row">
                  <span className="tm-details-label">Player</span>
                  <span className="tm-details-value">
                    {selectedNotification.playerName}
                    {selectedNotification.playerEmail && (
                      <span className="tm-details-email">
                        {" "}({selectedNotification.playerEmail})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {selectedNotification.coachName && (
                <div className="tm-details-row">
                  <span className="tm-details-label">Coach</span>
                  <span className="tm-details-value">{selectedNotification.coachName}</span>
                </div>
              )}

              {selectedNotification.sessionDate && (
                <div className="tm-details-row">
                  <span className="tm-details-label">Session Date</span>
                  <span className="tm-details-value">
                    {new Date(selectedNotification.sessionDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}

              {selectedNotification.sessionTime && (
                <div className="tm-details-row">
                  <span className="tm-details-label">Session Time</span>
                  <span className="tm-details-value">{selectedNotification.sessionTime}</span>
                </div>
              )}

              {selectedNotification.courtInfo && (
                <div className="tm-details-row">
                  <span className="tm-details-label">Court</span>
                  <span className="tm-details-value">{selectedNotification.courtInfo}</span>
                </div>
              )}

              {selectedNotification.bookingId && (
                <div className="tm-details-row">
                  <span className="tm-details-label">Booking ID</span>
                  <span className="tm-details-value tm-details-id">
                    {selectedNotification.bookingId}
                  </span>
                </div>
              )}

              {selectedNotification.trainingRequestId && (
                <div className="tm-details-row">
                  <span className="tm-details-label">Training Request ID</span>
                  <span className="tm-details-value tm-details-id">
                    {selectedNotification.trainingRequestId}
                  </span>
                </div>
              )}

              <div className="tm-details-row">
                <span className="tm-details-label">Received</span>
                <span className="tm-details-value">
                  {new Date(selectedNotification.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="tm-details-footer">
              <Button variant="outline" onClick={() => setSelectedNotification(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
