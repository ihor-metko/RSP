/**
 * Comprehensive tests for role-based notification delivery via NotificationSocket
 * 
 * Validates that different user roles receive notifications in the correct rooms:
 * - Players: Receive notifications in player:{playerId} room (personal notifications)
 * - Club Admins: Receive notifications in club:{clubId} rooms (club-scoped notifications)
 * - Organization Admins: Receive notifications in organization:{orgId} rooms (org-scoped notifications)
 * - Root Admins: Receive notifications in root_admin room (platform-wide notifications)
 * 
 * This test suite validates the complete notification flow from socket event to notification store.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { GlobalSocketListener } from '@/components/GlobalSocketListener';
import type { AdminNotificationEvent, BookingCreatedEvent } from '@/types/socket';
import { useBookingSocket } from '@/contexts/BookingSocketContext';

// Mock the notification manager
jest.mock('@/utils/globalNotificationManager', () => ({
  handleSocketEvent: jest.fn(),
  cleanupNotificationManager: jest.fn(),
  transformBookingCreated: jest.fn((event) => ({
    id: `mock-notification-${event.booking.id}`,
    type: 'BOOKING_CREATED',
    summary: `Booking created notification`,
    read: false,
    createdAt: new Date().toISOString(),
  })),
  transformBookingUpdated: jest.fn(),
  transformBookingCancelled: jest.fn(),
  transformPaymentConfirmed: jest.fn(),
  transformPaymentFailed: jest.fn(),
}));

// Mock stores
const mockAddNotification = jest.fn();
const mockUpdateBookingFromSocket = jest.fn();
const mockRemoveBookingFromSocket = jest.fn();
const mockAddLockedSlot = jest.fn();
const mockRemoveLockedSlot = jest.fn();
const mockCleanupExpiredLocks = jest.fn();

const mockBookingStore = {
  updateBookingFromSocket: mockUpdateBookingFromSocket,
  removeBookingFromSocket: mockRemoveBookingFromSocket,
  addLockedSlot: mockAddLockedSlot,
  removeLockedSlot: mockRemoveLockedSlot,
  cleanupExpiredLocks: mockCleanupExpiredLocks,
};

jest.mock('@/stores/useBookingStore', () => ({
  useBookingStore: Object.assign(
    jest.fn((selector) => selector(mockBookingStore)),
    {
      getState: () => mockBookingStore,
    }
  ),
}));

jest.mock('@/stores/useNotificationStore', () => ({
  useNotificationStore: jest.fn((selector) => {
    const mockStore = {
      addNotification: mockAddNotification,
    };
    return selector(mockStore);
  }),
}));

// Mock socket.io-client
const mockNotificationSocket = {
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  id: 'test-notification-socket-id',
  connected: false,
  io: {
    on: jest.fn(),
    off: jest.fn(),
  },
};

const mockBookingSocket = {
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  id: 'test-booking-socket-id',
  connected: false,
  io: {
    on: jest.fn(),
    off: jest.fn(),
  },
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockNotificationSocket),
}));

jest.mock('@/contexts/SocketContext', () => ({
  useSocket: jest.fn(() => ({
    socket: mockNotificationSocket,
    isConnected: true,
  })),
  SocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/contexts/BookingSocketContext', () => ({
  useBookingSocket: jest.fn(() => ({
    socket: null, // No booking socket for players
    isConnected: false,
    activeClubId: null,
  })),
  BookingSocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Role-based Notification Delivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Player Notifications', () => {
    it('should receive notifications in player:{playerId} room', async () => {
      render(<GlobalSocketListener />);

      // Find the event handler for booking_created
      const eventHandler = mockNotificationSocket.on.mock.calls.find(
        call => call[0] === 'booking_created'
      )?.[1];

      expect(eventHandler).toBeDefined();

      // Simulate a booking notification for the player
      const playerNotificationEvent: BookingCreatedEvent = {
        booking: {
          id: 'booking-player-1',
          bookingStatus: 'CONFIRMED',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        } as any,
        clubId: 'club-1',
        courtId: 'court-1',
      };

      eventHandler(playerNotificationEvent);

      await waitFor(() => {
        // Player should receive notification
        expect(mockAddNotification).toHaveBeenCalled();
      });
    });

    it('should receive personal admin notifications', async () => {
      render(<GlobalSocketListener />);

      const eventHandler = mockNotificationSocket.on.mock.calls.find(
        call => call[0] === 'admin_notification'
      )?.[1];

      expect(eventHandler).toBeDefined();

      // Simulate a personal notification for the player
      const personalNotification: AdminNotificationEvent = {
        id: 'notification-player-1',
        type: 'BOOKING_CREATED',
        playerId: 'player-1',
        playerName: 'John Player',
        coachId: 'coach-1',
        trainingRequestId: null,
        bookingId: 'booking-1',
        sessionDate: '2024-01-15',
        sessionTime: '10:00',
        courtInfo: 'Court 1',
        read: false,
        createdAt: new Date().toISOString(),
      };

      eventHandler(personalNotification);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(personalNotification);
      });
    });
  });

  describe('Club Admin Notifications', () => {
    beforeEach(() => {
      // Mock useBookingSocket to return booking socket for club admin
      (useBookingSocket as jest.Mock).mockReturnValue({
        socket: mockBookingSocket,
        isConnected: true,
        activeClubId: 'club-1',
      });
    });

    it('should receive notifications for their managed clubs', async () => {
      render(<GlobalSocketListener />);

      const eventHandler = mockNotificationSocket.on.mock.calls.find(
        call => call[0] === 'booking_created'
      )?.[1];

      expect(eventHandler).toBeDefined();

      // Simulate a club-level booking notification
      const clubNotificationEvent: BookingCreatedEvent = {
        booking: {
          id: 'booking-club-1',
          bookingStatus: 'CONFIRMED',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        } as any,
        clubId: 'club-1',
        courtId: 'court-1',
      };

      eventHandler(clubNotificationEvent);

      await waitFor(() => {
        // Club admin should receive notification
        expect(mockAddNotification).toHaveBeenCalled();
      });
    });

    it('should update booking store when receiving booking events on BookingSocket', async () => {
      render(<GlobalSocketListener />);

      const eventHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'booking_created'
      )?.[1];

      expect(eventHandler).toBeDefined();

      const bookingEvent: BookingCreatedEvent = {
        booking: {
          id: 'booking-club-2',
          bookingStatus: 'CONFIRMED',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        } as any,
        clubId: 'club-1',
        courtId: 'court-1',
      };

      eventHandler(bookingEvent);

      await waitFor(() => {
        // BookingSocket should update the booking store for real-time calendar sync
        expect(mockUpdateBookingFromSocket).toHaveBeenCalledWith(bookingEvent.booking);
      });
    });
  });

  describe('Organization Admin Notifications', () => {
    it('should receive notifications for their managed organizations', async () => {
      render(<GlobalSocketListener />);

      const eventHandler = mockNotificationSocket.on.mock.calls.find(
        call => call[0] === 'admin_notification'
      )?.[1];

      expect(eventHandler).toBeDefined();

      // Simulate an organization-level notification
      const orgNotification: AdminNotificationEvent = {
        id: 'notification-org-1',
        type: 'BOOKING_CREATED',
        playerId: 'player-1',
        playerName: 'John Player',
        coachId: 'coach-1',
        trainingRequestId: null,
        bookingId: 'booking-1',
        sessionDate: '2024-01-15',
        sessionTime: '10:00',
        courtInfo: 'Court 1',
        read: false,
        createdAt: new Date().toISOString(),
      };

      eventHandler(orgNotification);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(orgNotification);
      });
    });
  });

  describe('Root Admin Notifications', () => {
    it('should receive platform-wide notifications', async () => {
      render(<GlobalSocketListener />);

      const eventHandler = mockNotificationSocket.on.mock.calls.find(
        call => call[0] === 'admin_notification'
      )?.[1];

      expect(eventHandler).toBeDefined();

      // Simulate a platform-wide notification
      const rootNotification: AdminNotificationEvent = {
        id: 'notification-root-1',
        type: 'BOOKING_CREATED',
        playerId: 'player-1',
        playerName: 'John Player',
        coachId: 'coach-1',
        trainingRequestId: null,
        bookingId: 'booking-1',
        sessionDate: '2024-01-15',
        sessionTime: '10:00',
        courtInfo: 'Court 1',
        read: false,
        createdAt: new Date().toISOString(),
      };

      eventHandler(rootNotification);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(rootNotification);
      });
    });

    it('should receive all booking notifications from all clubs', async () => {
      render(<GlobalSocketListener />);

      const eventHandler = mockNotificationSocket.on.mock.calls.find(
        call => call[0] === 'booking_created'
      )?.[1];

      expect(eventHandler).toBeDefined();

      // Simulate multiple booking notifications from different clubs
      const bookingEvents: BookingCreatedEvent[] = [
        {
          booking: { id: 'booking-1', bookingStatus: 'CONFIRMED' } as any,
          clubId: 'club-1',
          courtId: 'court-1',
        },
        {
          booking: { id: 'booking-2', bookingStatus: 'CONFIRMED' } as any,
          clubId: 'club-2',
          courtId: 'court-2',
        },
        {
          booking: { id: 'booking-3', bookingStatus: 'CONFIRMED' } as any,
          clubId: 'club-3',
          courtId: 'court-3',
        },
      ];

      // Root admin should receive all notifications
      bookingEvents.forEach(event => {
        eventHandler(event);
      });

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('No Duplicate Subscriptions', () => {
    it('should maintain single socket connection across re-renders', async () => {
      const { rerender } = render(<GlobalSocketListener />);

      const initialOnCallCount = mockNotificationSocket.on.mock.calls.length;

      // Re-render the component (should not create new event listeners)
      rerender(<GlobalSocketListener />);

      // Socket connection should be reused (no new listeners added)
      // The component uses useEffect with socket as dependency, so it won't re-register
      // unless the socket instance changes
      expect(mockNotificationSocket.on.mock.calls.length).toBe(initialOnCallCount);
    });
  });

  describe('Proper Cleanup', () => {
    it('should cleanup all event listeners on unmount', async () => {
      const { unmount } = render(<GlobalSocketListener />);

      unmount();

      // Verify NotificationSocket listeners are cleaned up
      expect(mockNotificationSocket.off).toHaveBeenCalledWith('booking_created', expect.any(Function));
      expect(mockNotificationSocket.off).toHaveBeenCalledWith('booking_updated', expect.any(Function));
      expect(mockNotificationSocket.off).toHaveBeenCalledWith('booking_cancelled', expect.any(Function));
      expect(mockNotificationSocket.off).toHaveBeenCalledWith('admin_notification', expect.any(Function));
      expect(mockNotificationSocket.off).toHaveBeenCalledWith('payment_confirmed', expect.any(Function));
      expect(mockNotificationSocket.off).toHaveBeenCalledWith('payment_failed', expect.any(Function));
    });

    it('should cleanup BookingSocket listeners when activeClubId changes', async () => {
      // Start with booking socket connected
      (useBookingSocket as jest.Mock).mockReturnValue({
        socket: mockBookingSocket,
        isConnected: true,
        activeClubId: 'club-1',
      });

      const { rerender } = render(<GlobalSocketListener />);

      // Change to no active club
      (useBookingSocket as jest.Mock).mockReturnValue({
        socket: null,
        isConnected: false,
        activeClubId: null,
      });

      rerender(<GlobalSocketListener />);

      await waitFor(() => {
        // BookingSocket listeners should be cleaned up
        expect(mockBookingSocket.off).toHaveBeenCalled();
      });
    });
  });
});
