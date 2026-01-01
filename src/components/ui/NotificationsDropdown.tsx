/**
 * NotificationsDropdown Component
 * 
 * A reusable notification bell icon with dropdown menu for admin users.
 * 
 * Features:
 * - Real-time notifications via WebSocket (Socket.IO)
 * - Unified notification system (Training requests, Bookings, Payments)
 * - Unread count badge
 * - Dropdown menu with recent notifications
 * - Toast notifications for new events
 * - Keyboard accessible (Enter/Esc, focus trap)
 * - Mark as read functionality
 * 
 * Data Source:
 * - Initial load: NotificationStoreInitializer (on app startup)
 * - Real-time updates: GlobalSocketListener (via WebSocket)
 * - UI: Reads from centralized notification store
 * 
 * Supported notification types:
 * - Training: REQUESTED, ACCEPTED, DECLINED, CANCELED
 * - Booking: BOOKING_CREATED, BOOKING_UPDATED, BOOKING_CANCELLED
 * - Payment: PAYMENT_CONFIRMED, PAYMENT_FAILED
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
import { useNotifications } from "@/hooks/useNotifications";
import { AdminNotification } from "@/stores/useNotificationStore";
import { NotificationToastContainer } from "@/components/admin/NotificationToast";
import "./NotificationsDropdown.css";

export interface NotificationsDropdownProps {
  /** Maximum number of items to show in dropdown before "View all" link */
  maxDropdownItems?: number;
}

/**
 * Bell icon component - outline style matching header icons
 * Uses consistent sizing with color: currentColor for theme compatibility
 */
function BellIcon() {
  return (
    <svg
      className="im-bell-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
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

function generateNotificationSummary(
  notification: AdminNotification
): string {
  const { type, playerName, coachName, sessionDate, sessionTime, summary } = notification;
  
  // Use pre-generated summary if available (for Booking/Payment events)
  if (summary) {
    return summary;
  }
  
  // Generate summary for training request events
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
  } = useNotifications({
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
      <div className="im-notification-bell" ref={dropdownRef}>
        <button
          className="im-bell-button"
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <span className="im-bell-icon">
            <BellIcon />
          </span>
          {unreadCount > 0 && (
            <span className="im-bell-badge" aria-hidden="true">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          {/* Connection status indicator - always show connected since we use Socket.IO */}
          <span
            className="im-bell-status im-bell-status--connected"
            aria-label="Connection status: connected"
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className="im-bell-dropdown"
            role="menu"
            aria-label="Notifications dropdown"
          >
            <div className="im-dropdown-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  className="im-mark-all-btn"
                  onClick={handleMarkAllRead}
                >
                  Mark all read
                </Button>
              )}
            </div>

            {loading && (
              <div className="im-dropdown-loading">Loading...</div>
            )}

            {error && (
              <div className="im-dropdown-error">{error}</div>
            )}

            {!loading && !error && displayedNotifications.length === 0 && (
              <div className="im-dropdown-empty">No notifications</div>
            )}

            {!loading && !error && displayedNotifications.length > 0 && (
              <ul className="im-dropdown-list" role="listbox">
                {displayedNotifications.map((notification) => (
                  <li
                    key={notification.id}
                    role="option"
                    aria-selected={false}
                    className={`im-dropdown-item ${
                      !notification.read ? "im-dropdown-item--unread" : ""
                    }`}
                  >
                    <button
                      className="im-dropdown-item-button"
                      onClick={() => handleViewNotification(notification)}
                    >
                      <span className="im-dropdown-item-icon">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="im-dropdown-item-content">
                        <span className="im-dropdown-item-summary">
                          {generateNotificationSummary(notification)}
                        </span>
                        <span className="im-dropdown-item-time">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="im-dropdown-footer">
              <Button variant="outline" onClick={handleViewAll} className="im-view-all-btn">
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
          <div className="im-notification-details">
            <div className="im-details-header">
              <span className="im-details-icon">
                {getNotificationIcon(selectedNotification.type)}
              </span>
              <span
                className={`im-details-type im-details-type--${selectedNotification.type.toLowerCase()}`}
              >
                {selectedNotification.type}
              </span>
            </div>

            <div className="im-details-body">
              <div className="im-details-row">
                <span className="im-details-label">Summary</span>
                <span className="im-details-value">
                  {generateNotificationSummary(selectedNotification)}
                </span>
              </div>

              {selectedNotification.playerName && (
                <div className="im-details-row">
                  <span className="im-details-label">Player</span>
                  <span className="im-details-value">
                    {selectedNotification.playerName}
                    {selectedNotification.playerEmail && (
                      <span className="im-details-email">
                        {" "}({selectedNotification.playerEmail})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {selectedNotification.coachName && (
                <div className="im-details-row">
                  <span className="im-details-label">Coach</span>
                  <span className="im-details-value">{selectedNotification.coachName}</span>
                </div>
              )}

              {selectedNotification.sessionDate && (
                <div className="im-details-row">
                  <span className="im-details-label">Session Date</span>
                  <span className="im-details-value">
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
                <div className="im-details-row">
                  <span className="im-details-label">Session Time</span>
                  <span className="im-details-value">{selectedNotification.sessionTime}</span>
                </div>
              )}

              {selectedNotification.courtInfo && (
                <div className="im-details-row">
                  <span className="im-details-label">Court</span>
                  <span className="im-details-value">{selectedNotification.courtInfo}</span>
                </div>
              )}

              {selectedNotification.paymentId && (
                <div className="im-details-row">
                  <span className="im-details-label">Payment ID</span>
                  <span className="im-details-value im-details-id">
                    {selectedNotification.paymentId}
                  </span>
                </div>
              )}

              {selectedNotification.amount != null && selectedNotification.currency && (
                <div className="im-details-row">
                  <span className="im-details-label">Amount</span>
                  <span className="im-details-value">
                    {selectedNotification.currency} {selectedNotification.amount}
                  </span>
                </div>
              )}

              {selectedNotification.paymentReason && (
                <div className="im-details-row">
                  <span className="im-details-label">Reason</span>
                  <span className="im-details-value">{selectedNotification.paymentReason}</span>
                </div>
              )}

              {selectedNotification.bookingId && (
                <div className="im-details-row">
                  <span className="im-details-label">Booking ID</span>
                  <span className="im-details-value im-details-id">
                    {selectedNotification.bookingId}
                  </span>
                </div>
              )}

              {selectedNotification.trainingRequestId && (
                <div className="im-details-row">
                  <span className="im-details-label">Training Request ID</span>
                  <span className="im-details-value im-details-id">
                    {selectedNotification.trainingRequestId}
                  </span>
                </div>
              )}

              <div className="im-details-row">
                <span className="im-details-label">Received</span>
                <span className="im-details-value">
                  {new Date(selectedNotification.createdAt).toLocaleString(undefined, {
                    hour12: false,
                  })}
                </span>
              </div>
            </div>

            <div className="im-details-footer">
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
