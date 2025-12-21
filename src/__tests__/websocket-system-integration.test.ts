/**
 * WebSocket System Integration Tests
 * 
 * This test file verifies the integration and correctness of the WebSocket system.
 * Tests cover initialization, event handling, and store updates.
 */

import { useBookingStore } from '@/stores/useBookingStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import type { OperationsBooking } from '@/types/booking';

describe('WebSocket System - Store Integration', () => {
  describe('Booking Store - Real-time Updates', () => {
    beforeEach(() => {
      // Clear store before each test
      useBookingStore.getState().setBookings([]);
    });

    it('should update booking in store via updateBookingFromSocket', () => {
      const store = useBookingStore.getState();
      
      const booking: OperationsBooking = {
        id: 'booking-1',
        clubId: 'club-1',
        courtId: 'court-1',
        userId: 'user-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '11:00',
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Test updateBookingFromSocket
      store.updateBookingFromSocket(booking);
      
      // Verify booking is added to store
      const storeBookings = useBookingStore.getState().bookings;
      expect(storeBookings.some(b => b.id === booking.id)).toBeTruthy();
      
      const addedBooking = storeBookings.find(b => b.id === booking.id);
      expect(addedBooking).toEqual(booking);
    });

    it('should remove booking from store via removeBookingFromSocket', () => {
      const store = useBookingStore.getState();
      
      const booking: OperationsBooking = {
        id: 'booking-to-remove',
        clubId: 'club-1',
        courtId: 'court-1',
        userId: 'user-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '11:00',
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add booking first
      store.updateBookingFromSocket(booking);
      expect(useBookingStore.getState().bookings.some(b => b.id === booking.id)).toBeTruthy();
      
      // Then remove it
      store.removeBookingFromSocket(booking.id);
      
      // Verify booking is removed
      const storeBookings = useBookingStore.getState().bookings;
      expect(storeBookings.some(b => b.id === booking.id)).toBeFalsy();
    });

    it('should update existing booking when updateBookingFromSocket is called with same ID', () => {
      const store = useBookingStore.getState();
      
      const originalTime = new Date('2024-01-15T10:00:00Z');
      const updatedTime = new Date('2024-01-15T10:05:00Z'); // 5 minutes later
      
      const originalBooking: OperationsBooking = {
        id: 'booking-update',
        clubId: 'club-1',
        courtId: 'court-1',
        userId: 'user-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '11:00',
        bookingStatus: 'PENDING',
        paymentStatus: 'UNPAID',
        createdAt: originalTime.toISOString(),
        updatedAt: originalTime.toISOString(),
      };

      // Add original booking
      store.updateBookingFromSocket(originalBooking);
      
      // Update booking with later timestamp
      const updatedBooking: OperationsBooking = {
        ...originalBooking,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        updatedAt: updatedTime.toISOString(), // Later timestamp
      };
      
      store.updateBookingFromSocket(updatedBooking);
      
      // Verify booking is updated, not duplicated
      const storeBookings = useBookingStore.getState().bookings;
      const matchingBookings = storeBookings.filter(b => b.id === 'booking-update');
      expect(matchingBookings.length).toBe(1);
      expect(matchingBookings[0].bookingStatus).toBe('CONFIRMED');
      expect(matchingBookings[0].paymentStatus).toBe('PAID');
    });
  });

  describe('Notification Store - Real-time Updates', () => {
    beforeEach(() => {
      // Clear store before each test
      useNotificationStore.getState().clearNotifications();
    });

    it('should add notification to store', () => {
      const store = useNotificationStore.getState();
      
      const notification = {
        id: 'notification-1',
        type: 'BOOKING_CREATED' as const,
        playerId: 'player-1',
        coachId: 'coach-1',
        trainingRequestId: null,
        bookingId: 'booking-1',
        sessionDate: null,
        sessionTime: null,
        courtInfo: null,
        read: false,
        createdAt: new Date().toISOString(),
      };

      store.addNotification(notification);
      
      // Verify notification is added
      const storeNotifications = useNotificationStore.getState().notifications;
      expect(storeNotifications.some(n => n.id === notification.id)).toBeTruthy();
      
      // Verify unread count is incremented
      expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    it('should prevent duplicate notifications', () => {
      const store = useNotificationStore.getState();
      
      const notification = {
        id: 'duplicate-test',
        type: 'BOOKING_CREATED' as const,
        playerId: 'player-1',
        coachId: 'coach-1',
        trainingRequestId: null,
        bookingId: 'booking-1',
        sessionDate: null,
        sessionTime: null,
        courtInfo: null,
        read: false,
        createdAt: new Date().toISOString(),
      };

      // Add notification twice
      store.addNotification(notification);
      store.addNotification(notification);
      
      // Should only have one notification
      const storeNotifications = useNotificationStore.getState().notifications;
      const duplicates = storeNotifications.filter(n => n.id === notification.id);
      expect(duplicates.length).toBe(1);
      
      // Unread count should only be 1
      expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    it('should mark notification as read', () => {
      const store = useNotificationStore.getState();
      
      const notification = {
        id: 'mark-read-test',
        type: 'BOOKING_UPDATED' as const,
        playerId: 'player-1',
        coachId: 'coach-1',
        trainingRequestId: null,
        bookingId: 'booking-1',
        sessionDate: null,
        sessionTime: null,
        courtInfo: null,
        read: false,
        createdAt: new Date().toISOString(),
      };

      // Add notification
      store.addNotification(notification);
      expect(useNotificationStore.getState().unreadCount).toBe(1);
      
      // Mark as read
      store.markAsRead(notification.id);
      
      // Verify notification is marked as read
      const storeNotifications = useNotificationStore.getState().notifications;
      const readNotification = storeNotifications.find(n => n.id === notification.id);
      expect(readNotification?.read).toBe(true);
      
      // Verify unread count is decremented
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it('should mark all notifications as read', () => {
      const store = useNotificationStore.getState();
      
      // Add multiple notifications
      const notifications = [
        {
          id: 'notification-1',
          type: 'BOOKING_CREATED' as const,
          playerId: 'player-1',
          coachId: 'coach-1',
          trainingRequestId: null,
          bookingId: 'booking-1',
          sessionDate: null,
          sessionTime: null,
          courtInfo: null,
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'notification-2',
          type: 'PAYMENT_CONFIRMED' as const,
          playerId: 'player-2',
          coachId: 'coach-2',
          trainingRequestId: null,
          bookingId: 'booking-2',
          sessionDate: null,
          sessionTime: null,
          courtInfo: null,
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      notifications.forEach(n => store.addNotification(n));
      expect(useNotificationStore.getState().unreadCount).toBe(2);
      
      // Mark all as read
      store.markAllAsRead();
      
      // Verify all notifications are marked as read
      const storeNotifications = useNotificationStore.getState().notifications;
      expect(storeNotifications.every(n => n.read)).toBe(true);
      
      // Verify unread count is 0
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it('should not increment unread count for already-read notifications', () => {
      const store = useNotificationStore.getState();
      
      const notification = {
        id: 'already-read',
        type: 'BOOKING_CREATED' as const,
        playerId: 'player-1',
        coachId: 'coach-1',
        trainingRequestId: null,
        bookingId: 'booking-1',
        sessionDate: null,
        sessionTime: null,
        courtInfo: null,
        read: true, // Already read
        createdAt: new Date().toISOString(),
      };

      store.addNotification(notification);
      
      // Unread count should not increase
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe('Store State Consistency', () => {
    it('should maintain consistent booking list after multiple operations', () => {
      const store = useBookingStore.getState();
      store.setBookings([]);

      const bookings: OperationsBooking[] = [
        {
          id: 'booking-1',
          clubId: 'club-1',
          courtId: 'court-1',
          userId: 'user-1',
          date: '2024-01-15',
          startTime: '10:00',
          endTime: '11:00',
          bookingStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'booking-2',
          clubId: 'club-1',
          courtId: 'court-2',
          userId: 'user-2',
          date: '2024-01-15',
          startTime: '11:00',
          endTime: '12:00',
          bookingStatus: 'ACTIVE',
          paymentStatus: 'PAID',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      // Add bookings
      bookings.forEach(b => store.updateBookingFromSocket(b));
      
      // Verify both bookings are in store
      expect(useBookingStore.getState().bookings.length).toBe(2);
      
      // Remove one booking
      store.removeBookingFromSocket('booking-1');
      
      // Verify only one booking remains
      expect(useBookingStore.getState().bookings.length).toBe(1);
      expect(useBookingStore.getState().bookings[0].id).toBe('booking-2');
    });

    it('should maintain consistent notification list after multiple operations', () => {
      const store = useNotificationStore.getState();
      store.clearNotifications();

      const notifications = [
        {
          id: 'notification-1',
          type: 'BOOKING_CREATED' as const,
          playerId: 'player-1',
          coachId: 'coach-1',
          trainingRequestId: null,
          bookingId: 'booking-1',
          sessionDate: null,
          sessionTime: null,
          courtInfo: null,
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'notification-2',
          type: 'PAYMENT_CONFIRMED' as const,
          playerId: 'player-2',
          coachId: 'coach-2',
          trainingRequestId: null,
          bookingId: 'booking-2',
          sessionDate: null,
          sessionTime: null,
          courtInfo: null,
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'notification-3',
          type: 'BOOKING_UPDATED' as const,
          playerId: 'player-3',
          coachId: 'coach-3',
          trainingRequestId: null,
          bookingId: 'booking-3',
          sessionDate: null,
          sessionTime: null,
          courtInfo: null,
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      // Add notifications
      notifications.forEach(n => store.addNotification(n));
      
      // Verify all notifications are in store
      expect(useNotificationStore.getState().notifications.length).toBe(3);
      expect(useNotificationStore.getState().unreadCount).toBe(3);
      
      // Mark one as read
      store.markAsRead('notification-2');
      
      // Verify count is updated
      expect(useNotificationStore.getState().unreadCount).toBe(2);
      
      // Mark all as read
      store.markAllAsRead();
      
      // Verify all are read
      expect(useNotificationStore.getState().unreadCount).toBe(0);
      expect(useNotificationStore.getState().notifications.every(n => n.read)).toBe(true);
    });
  });
});

describe('WebSocket System - Documentation', () => {
  it('should have audit report in docs folder', () => {
    // This test verifies that the audit report exists
    const fs = require('fs');
    const path = require('path');
    
    const reportPath = path.join(__dirname, '../../docs/websocket-audit-report.md');
    expect(fs.existsSync(reportPath)).toBe(true);
  });
});
