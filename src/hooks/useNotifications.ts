"use client";

import { useEffect, useCallback, useRef } from "react";
import { useNotificationStore, type AdminNotification } from "@/stores/useNotificationStore";

interface NotificationsResponse {
  notifications: AdminNotification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
}

interface UseNotificationsOptions {
  enabled?: boolean;
  onNewNotification?: (notification: AdminNotification) => void;
}

interface UseNotificationsReturn {
  notifications: AdminNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

/**
 * Hook for accessing and managing notifications from the centralized store.
 * 
 * This hook:
 * - Reads notifications from the Zustand store (single source of truth)
 * - Performs initial HTTP fetch to populate the store
 * - Provides methods to mark notifications as read (with API calls)
 * - Does NOT poll - relies on Socket.IO for real-time updates
 * 
 * @example
 * ```tsx
 * const { notifications, unreadCount, markAsRead } = useNotifications({
 *   onNewNotification: (notification) => {
 *     showToast(notification.summary);
 *   }
 * });
 * ```
 */
export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const {
    enabled = true,
    onNewNotification,
  } = options;

  // Get state and actions from the notification store
  const notifications = useNotificationStore(state => state.notifications);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const loading = useNotificationStore(state => state.loading);
  const error = useNotificationStore(state => state.error);
  const setNotifications = useNotificationStore(state => state.setNotifications);
  const setUnreadCount = useNotificationStore(state => state.setUnreadCount);
  const setLoading = useNotificationStore(state => state.setLoading);
  const setError = useNotificationStore(state => state.setError);
  const markAsReadInStore = useNotificationStore(state => state.markAsRead);
  const markAllAsReadInStore = useNotificationStore(state => state.markAllAsRead);

  const onNewNotificationRef = useRef(onNewNotification);
  const previousNotificationIdsRef = useRef<Set<string>>(new Set());

  // Update the ref when callback changes
  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  // Detect new notifications and trigger callback
  useEffect(() => {
    const currentIds = new Set(notifications.map(n => n.id));
    const previousIds = previousNotificationIdsRef.current;
    
    // Find notifications that are in current but not in previous
    const newNotificationIds = notifications
      .filter(n => !previousIds.has(n.id))
      .map(n => n.id);
    
    // Trigger callback for each new unread notification
    if (newNotificationIds.length > 0) {
      notifications.forEach(notification => {
        if (newNotificationIds.includes(notification.id) && !notification.read) {
          onNewNotificationRef.current?.(notification);
        }
      });
    }
    
    // Update the ref for next comparison
    previousNotificationIdsRef.current = currentIds;
  }, [notifications]);

  // Fetch notifications from API (initial load only)
  const fetchNotifications = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/notifications");

      if (response.status === 401 || response.status === 403) {
        setError("Access denied. Admin privileges required.");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data: NotificationsResponse = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [enabled, setNotifications, setUnreadCount, setLoading, setError]);

  // Mark notification as read (API call + store update)
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      // Update store
      markAsReadInStore(notificationId);
    } catch (err) {
      throw err;
    }
  }, [markAsReadInStore]);

  // Mark all notifications as read (API call + store update)
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/notifications/mark-all-read", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }

      // Update store
      markAllAsReadInStore();
    } catch (err) {
      throw err;
    }
  }, [markAllAsReadInStore]);

  // Initial fetch on mount
  useEffect(() => {
    if (enabled) {
      fetchNotifications();
    }
  }, [enabled, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
