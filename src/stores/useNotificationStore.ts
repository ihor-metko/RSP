import { create } from "zustand";
import type { AdminNotificationEvent } from "@/types/socket";

/**
 * Admin notification type
 * Re-exported from socket types for convenience
 */
export type AdminNotification = AdminNotificationEvent;

/**
 * Notification store state interface
 */
interface NotificationState {
  // State
  notifications: AdminNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;

  // Actions
  setNotifications: (notifications: AdminNotification[]) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addNotification: (notification: AdminNotification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

/**
 * Zustand store for managing admin notifications.
 * 
 * This store is the single source of truth for all notification-related UI:
 * - Toast notifications (instant feedback)
 * - Header bell component
 * - Notifications page
 * 
 * Supports a unified notification system where ALL admin-relevant events flow through:
 * - Training request notifications (REQUESTED, ACCEPTED, DECLINED, CANCELED)
 * - Booking event notifications (BOOKING_CREATED, BOOKING_UPDATED, BOOKING_CANCELLED)
 * - Payment event notifications (PAYMENT_CONFIRMED, PAYMENT_FAILED)
 * 
 * The store is updated by:
 * - Socket.IO events (real-time) via GlobalSocketListener
 * - Initial HTTP fetch via NotificationStoreInitializer
 * - User actions (mark as read)
 * 
 * @example
 * // Add a notification from socket event
 * const addNotification = useNotificationStore(state => state.addNotification);
 * addNotification(notification);
 * 
 * @example
 * // Get notifications and unread count
 * const notifications = useNotificationStore(state => state.notifications);
 * const unreadCount = useNotificationStore(state => state.unreadCount);
 * 
 * @example
 * // Mark notification as read
 * const markAsRead = useNotificationStore(state => state.markAsRead);
 * markAsRead(notificationId);
 */
export const useNotificationStore = create<NotificationState>((set) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  // Set entire notifications list (from initial fetch)
  setNotifications: (notifications: AdminNotification[]) => 
    set({ notifications }),

  // Set unread count
  setUnreadCount: (count: number) => 
    set({ unreadCount: count }),

  // Set loading state
  setLoading: (loading: boolean) => 
    set({ loading }),

  // Set error state
  setError: (error: string | null) => 
    set({ error }),

  // Add a single notification (from socket event or SSE)
  // Prevents duplicates and updates unread count
  addNotification: (notification: AdminNotification) =>
    set((state) => {
      // Check if notification already exists
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) {
        console.log(`[NotificationStore] Duplicate notification ignored: ${notification.id}`);
        return state;
      }

      // Add notification to the beginning of the list
      const newNotifications = [notification, ...state.notifications];
      
      // Update unread count if notification is unread
      const newUnreadCount = notification.read 
        ? state.unreadCount 
        : state.unreadCount + 1;

      console.log(`[NotificationStore] Added notification: ${notification.id}, unread: ${newUnreadCount}`);

      return {
        notifications: newNotifications,
        unreadCount: newUnreadCount,
      };
    }),

  // Mark a notification as read
  markAsRead: (notificationId: string) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === notificationId);
      
      // Only update if notification exists and is unread
      if (!notification || notification.read) {
        return state;
      }

      return {
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),

  // Mark all notifications as read
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  // Clear all notifications
  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
      error: null,
    }),
}));
