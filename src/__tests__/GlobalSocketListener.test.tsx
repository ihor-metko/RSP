/**
 * Integration tests for Global Socket Listener
 * 
 * Tests the unified notification system where all admin-relevant events
 * (Booking, Payment, Admin) show toasts AND persist in notification store.
 * 
 * Note: Legacy event names (bookingCreated, bookingUpdated, bookingDeleted) have been removed.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { GlobalSocketListener } from '@/components/GlobalSocketListener';
import { handleSocketEvent } from '@/utils/globalNotificationManager';

// Mock the notification manager
jest.mock('@/utils/globalNotificationManager', () => ({
  handleSocketEvent: jest.fn(),
  cleanupNotificationManager: jest.fn(),
  transformBookingCreated: jest.fn((event) => ({
    id: `mock-notification-${event.booking.id}`,
    type: 'BOOKING_CREATED',
    summary: 'Mock booking created notification',
    read: false,
    createdAt: new Date().toISOString(),
  })),
  transformBookingUpdated: jest.fn((event) => ({
    id: `mock-notification-${event.booking.id}`,
    type: 'BOOKING_UPDATED',
    summary: 'Mock booking updated notification',
    read: false,
    createdAt: new Date().toISOString(),
  })),
  transformBookingCancelled: jest.fn((event) => ({
    id: `mock-notification-${event.bookingId}`,
    type: 'BOOKING_CANCELLED',
    summary: 'Mock booking cancelled notification',
    read: false,
    createdAt: new Date().toISOString(),
  })),
  transformPaymentConfirmed: jest.fn((event) => ({
    id: `mock-notification-${event.paymentId}`,
    type: 'PAYMENT_CONFIRMED',
    summary: 'Mock payment confirmed notification',
    read: false,
    createdAt: new Date().toISOString(),
  })),
  transformPaymentFailed: jest.fn((event) => ({
    id: `mock-notification-${event.paymentId}`,
    type: 'PAYMENT_FAILED',
    summary: 'Mock payment failed notification',
    read: false,
    createdAt: new Date().toISOString(),
  })),
}));

// Mock the booking store
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
    jest.fn((selector) => {
      return selector(mockBookingStore);
    }),
    {
      getState: () => mockBookingStore,
    }
  ),
}));

// Mock booking socket.io-client
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

// Mock the notification store
const mockAddNotification = jest.fn();

jest.mock('@/stores/useNotificationStore', () => ({
  useNotificationStore: jest.fn((selector) => {
    const mockStore = {
      addNotification: mockAddNotification,
    };
    return selector(mockStore);
  }),
}));

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  id: 'test-socket-id',
  connected: false,
  io: {
    on: jest.fn(),
    off: jest.fn(),
  },
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock SocketProvider by providing a mock notification socket
jest.mock('@/contexts/SocketContext', () => ({
  useSocket: jest.fn(() => ({
    socket: mockSocket,
    isConnected: true,
  })),
  SocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock BookingSocketProvider by providing a mock booking socket
jest.mock('@/contexts/BookingSocketContext', () => ({
  useBookingSocket: jest.fn(() => ({
    socket: mockBookingSocket,
    isConnected: true,
    activeClubId: 'club-1',
  })),
  BookingSocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('GlobalSocketListener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register all event listeners for both sockets', () => {
    render(<GlobalSocketListener />);

    // Check NotificationSocket events
    const notificationEvents = mockSocket.on.mock.calls.map(call => call[0]);
    expect(notificationEvents).toContain('booking_created');
    expect(notificationEvents).toContain('booking_updated');
    expect(notificationEvents).toContain('booking_cancelled');
    expect(notificationEvents).toContain('admin_notification');
    expect(notificationEvents).toContain('payment_confirmed');
    expect(notificationEvents).toContain('payment_failed');
    
    // Check BookingSocket events
    const bookingEvents = mockBookingSocket.on.mock.calls.map(call => call[0]);
    expect(bookingEvents).toContain('booking_created');
    expect(bookingEvents).toContain('booking_updated');
    expect(bookingEvents).toContain('booking_cancelled');
    expect(bookingEvents).toContain('slot_locked');
    expect(bookingEvents).toContain('slot_unlocked');
    expect(bookingEvents).toContain('lock_expired');
  });

  it('should handle booking_created event from NotificationSocket (notification only)', async () => {
    const { transformBookingCreated } = jest.requireMock('@/utils/globalNotificationManager');
    render(<GlobalSocketListener />);

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'booking_created'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      booking: { id: 'booking-1', bookingStatus: 'CONFIRMED' },
      clubId: 'club-1',
      courtId: 'court-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      // Toast notification
      expect(handleSocketEvent).toHaveBeenCalledWith('booking_created', eventData);
      
      // Notification store update
      expect(transformBookingCreated).toHaveBeenCalledWith(eventData);
      expect(mockAddNotification).toHaveBeenCalled();
      
      // Should NOT update booking store (that's for BookingSocket)
      expect(mockUpdateBookingFromSocket).not.toHaveBeenCalled();
    });
  });

  it('should handle booking_created event from BookingSocket (store update only)', async () => {
    render(<GlobalSocketListener />);

    const eventHandler = mockBookingSocket.on.mock.calls.find(
      call => call[0] === 'booking_created'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      booking: { id: 'booking-2', bookingStatus: 'CONFIRMED' },
      clubId: 'club-1',
      courtId: 'court-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      // Should update booking store for calendar sync
      expect(mockUpdateBookingFromSocket).toHaveBeenCalledWith(eventData.booking);
    });
  });

  it('should ignore booking events from BookingSocket for different club', async () => {
    render(<GlobalSocketListener />);

    const eventHandler = mockBookingSocket.on.mock.calls.find(
      call => call[0] === 'booking_created'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      booking: { id: 'booking-3', bookingStatus: 'CONFIRMED' },
      clubId: 'club-2', // Different club
      courtId: 'court-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      // Should NOT update booking store for different club
      expect(mockUpdateBookingFromSocket).not.toHaveBeenCalled();
    });
  });

  it('should handle booking_updated event from NotificationSocket', async () => {
    const { transformBookingUpdated } = jest.requireMock('@/utils/globalNotificationManager');
    render(<GlobalSocketListener />);

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'booking_updated'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      booking: { id: 'booking-2', bookingStatus: 'ACTIVE' },
      clubId: 'club-1',
      courtId: 'court-1',
      previousStatus: 'PENDING',
    };

    eventHandler(eventData);

    await waitFor(() => {
      // Toast notification
      expect(handleSocketEvent).toHaveBeenCalledWith('booking_updated', eventData);
      
      // Notification store update
      expect(transformBookingUpdated).toHaveBeenCalledWith(eventData);
      expect(mockAddNotification).toHaveBeenCalled();
    });
  });

  it('should handle booking_cancelled event from NotificationSocket', async () => {
    const { transformBookingCancelled } = jest.requireMock('@/utils/globalNotificationManager');
    render(<GlobalSocketListener />);

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'booking_cancelled'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      bookingId: 'booking-1',
      clubId: 'club-1',
      courtId: 'court-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      // Toast notification
      expect(handleSocketEvent).toHaveBeenCalledWith('booking_cancelled', eventData);
      
      // Notification store update
      expect(transformBookingCancelled).toHaveBeenCalledWith(eventData);
      expect(mockAddNotification).toHaveBeenCalled();
    });
  });

  it('should handle slot_locked event from BookingSocket', async () => {
    render(<GlobalSocketListener />);

    const eventHandler = mockBookingSocket.on.mock.calls.find(
      call => call[0] === 'slot_locked'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      slotId: 'slot-1',
      courtId: 'court-1',
      clubId: 'club-1',
      userId: 'user-1',
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-15T11:00:00Z',
    };

    eventHandler(eventData);

    await waitFor(() => {
      // Should add locked slot to booking store
      expect(mockAddLockedSlot).toHaveBeenCalledWith(eventData);
    });
  });

  it('should handle slot_unlocked event from BookingSocket', async () => {
    render(<GlobalSocketListener />);

    const eventHandler = mockBookingSocket.on.mock.calls.find(
      call => call[0] === 'slot_unlocked'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      slotId: 'slot-1',
      courtId: 'court-1',
      clubId: 'club-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      // Should remove locked slot from booking store
      expect(mockRemoveLockedSlot).toHaveBeenCalledWith(eventData.slotId);
    });
  });

  it('should handle lock_expired event from BookingSocket', async () => {
    render(<GlobalSocketListener />);

    const eventHandler = mockBookingSocket.on.mock.calls.find(
      call => call[0] === 'lock_expired'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      slotId: 'slot-2',
      courtId: 'court-1',
      clubId: 'club-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      // Should remove expired lock from booking store
      expect(mockRemoveLockedSlot).toHaveBeenCalledWith(eventData.slotId);
    });
  });

  it('should handle payment_confirmed event with unified notification system', async () => {
    const { transformPaymentConfirmed } = jest.requireMock('@/utils/globalNotificationManager');
    render(<GlobalSocketListener />);

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'payment_confirmed'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      paymentId: 'payment-1',
      bookingId: 'booking-1',
      amount: 100,
      currency: 'USD',
      clubId: 'club-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      // Toast notification
      expect(handleSocketEvent).toHaveBeenCalledWith('payment_confirmed', eventData);
      
      // Notification store update (unified system)
      expect(transformPaymentConfirmed).toHaveBeenCalledWith(eventData);
      expect(mockAddNotification).toHaveBeenCalled();
    });
  });

  it('should handle payment_failed event with unified notification system', async () => {
    const { transformPaymentFailed } = jest.requireMock('@/utils/globalNotificationManager');
    render(<GlobalSocketListener />);

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'payment_failed'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      paymentId: 'payment-1',
      bookingId: 'booking-1',
      reason: 'Insufficient funds',
      clubId: 'club-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      // Toast notification
      expect(handleSocketEvent).toHaveBeenCalledWith('payment_failed', eventData);
      
      // Notification store update (unified system)
      expect(transformPaymentFailed).toHaveBeenCalledWith(eventData);
      expect(mockAddNotification).toHaveBeenCalled();
    });
  });

  it('should handle admin_notification event', async () => {
    render(<GlobalSocketListener />);

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'admin_notification'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      id: 'notification-1',
      type: 'REQUESTED' as const,
      playerId: 'player-1',
      coachId: 'coach-1',
      read: false,
      createdAt: new Date().toISOString(),
    };

    eventHandler(eventData);

    await waitFor(() => {
      // Admin notifications go directly to store without transformation
      expect(mockAddNotification).toHaveBeenCalledWith(eventData);
    });
  });

  it('should cleanup on unmount', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cleanupNotificationManager } = require('@/utils/globalNotificationManager');
    const { unmount } = render(<GlobalSocketListener />);

    unmount();

    // Check that NotificationSocket event listeners are unregistered
    expect(mockSocket.off).toHaveBeenCalledWith('booking_created', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('booking_updated', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('booking_cancelled', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('admin_notification', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('payment_confirmed', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('payment_failed', expect.any(Function));

    // Check that BookingSocket event listeners are unregistered
    expect(mockBookingSocket.off).toHaveBeenCalledWith('booking_created', expect.any(Function));
    expect(mockBookingSocket.off).toHaveBeenCalledWith('booking_updated', expect.any(Function));
    expect(mockBookingSocket.off).toHaveBeenCalledWith('booking_cancelled', expect.any(Function));
    expect(mockBookingSocket.off).toHaveBeenCalledWith('slot_locked', expect.any(Function));
    expect(mockBookingSocket.off).toHaveBeenCalledWith('slot_unlocked', expect.any(Function));
    expect(mockBookingSocket.off).toHaveBeenCalledWith('lock_expired', expect.any(Function));

    // Check notification manager is cleaned up
    expect(cleanupNotificationManager).toHaveBeenCalled();
  });

  it('should not render any visible content', () => {
    const { container } = render(<GlobalSocketListener />);
    expect(container.firstChild).toBeNull();
  });
});
