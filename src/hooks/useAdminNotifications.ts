"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * @deprecated This hook is deprecated and will be removed in a future version.
 * Please use `useNotifications` from '@/hooks/useNotifications' instead,
 * which uses the centralized notification store and Socket.IO for real-time updates.
 * 
 * Migration guide:
 * - Replace `useAdminNotifications` with `useNotifications`
 * - The new hook does not return `connectionStatus` (always connected via Socket.IO)
 * - Remove `pollInterval` option (no longer needed)
 * - All other APIs remain the same
 */

export interface AdminNotification {
  id: string;
  type: "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELED";
  playerId: string;
  playerName?: string;
  playerEmail?: string | null;
  coachId: string;
  coachName?: string;
  trainingRequestId: string | null;
  bookingId: string | null;
  sessionDate: string | null;
  sessionTime: string | null;
  courtInfo: string | null;
  summary?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: AdminNotification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
}

interface UseAdminNotificationsOptions {
  enabled?: boolean;
  pollInterval?: number; // Polling interval in ms (fallback when SSE unavailable)
  onNewNotification?: (notification: AdminNotification) => void;
}

interface UseAdminNotificationsReturn {
  notifications: AdminNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  connectionStatus: "connected" | "connecting" | "disconnected" | "polling";
}

// Maximum reconnection attempts before falling back to polling
const MAX_RECONNECT_ATTEMPTS = 3;
// Initial reconnection delay in ms
const INITIAL_RECONNECT_DELAY = 1000;
// Maximum reconnection delay in ms (30 seconds)
const MAX_RECONNECT_DELAY = 30000;
// Maximum toast rate (1 per second)
const TOAST_RATE_LIMIT_MS = 1000;

/**
 * @deprecated Use `useNotifications` instead
 */
export function useAdminNotifications(
  options: UseAdminNotificationsOptions = {}
): UseAdminNotificationsReturn {
  const {
    enabled = true,
    pollInterval = 30000,
    onNewNotification,
  } = options;

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected" | "polling"
  >("disconnected");

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastToastTimeRef = useRef(0);
  const onNewNotificationRef = useRef(onNewNotification);
  const startPollingRef = useRef<() => void>(() => {});

  // Update the ref when callback changes
  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return; // Skip fetching if page is not visible
    }

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
  }, []);

  // Handle new notification from SSE
  const handleNewNotification = useCallback((notification: AdminNotification) => {
    // Update notifications list
    setNotifications((prev) => {
      // Avoid duplicates
      if (prev.some((n) => n.id === notification.id)) {
        return prev;
      }
      return [notification, ...prev];
    });

    // Update unread count
    if (!notification.read) {
      setUnreadCount((prev) => prev + 1);
    }

    // Rate-limited toast notification
    const now = Date.now();
    if (now - lastToastTimeRef.current >= TOAST_RATE_LIMIT_MS) {
      lastToastTimeRef.current = now;
      onNewNotificationRef.current?.(notification);
    }
  }, []);

  // Connect to SSE stream
  const connectSSE = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    setConnectionStatus("connecting");

    try {
      const eventSource = new EventSource("/api/admin/notifications/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus("connected");
        reconnectAttemptsRef.current = 0;
        setError(null);
      };

      eventSource.addEventListener("connected", () => {
        // Initial connection established, fetch current notifications
        fetchNotifications();
      });

      eventSource.addEventListener("notification", (event) => {
        try {
          const notification = JSON.parse(event.data) as AdminNotification;
          handleNewNotification(notification);
        } catch {
          // Ignore parse errors
        }
      });

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;
        setConnectionStatus("disconnected");

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
            MAX_RECONNECT_DELAY
          );
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, delay);
        } else {
          // Fall back to polling
          setConnectionStatus("polling");
          startPollingRef.current();
        }
      };
    } catch {
      // SSE not supported, fall back to polling
      setConnectionStatus("polling");
      startPollingRef.current();
    }
  }, [enabled, fetchNotifications, handleNewNotification]);

  // Start polling fallback
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Initial fetch
    fetchNotifications();

    // Set up polling interval
    pollIntervalRef.current = setInterval(fetchNotifications, pollInterval);
  }, [fetchNotifications, pollInterval]);

  // Update the ref when startPolling changes
  useEffect(() => {
    startPollingRef.current = startPolling;
  }, [startPolling]);

  // Clean up resources
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Mark notification as read
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

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/notifications/mark-all-read", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      throw err;
    }
  }, []);

  // Initialize connection
  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    // Initial fetch
    fetchNotifications();

    // Try SSE first
    connectSSE();

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cleanup();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, cleanup, fetchNotifications, connectSSE]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    connectionStatus,
  };
}
