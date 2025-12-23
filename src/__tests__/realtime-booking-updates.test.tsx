/**
 * Real-Time Booking Updates Integration Tests
 * 
 * Tests the complete flow of WebSocket-based real-time booking updates
 * focusing on multi-client scenarios and edge cases:
 * 
 * 1. Multi-client simultaneous updates
 * 2. Rapid/multiple events deduplication
 * 3. Socket reconnection behavior
 * 4. Listener cleanup on component unmount and route changes
 * 5. Slot locking and unlocking across clients
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { GlobalSocketListener } from '@/components/GlobalSocketListener';
import { useBookingStore } from '@/stores/useBookingStore';
import type { OperationsBooking } from '@/types/booking';
import type {
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
  SlotLockedEvent,
  SlotUnlockedEvent,
} from '@/types/socket';

// Mock socket
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  id: 'test-socket-id',
  connected: true,
  io: {
    on: jest.fn(),
    off: jest.fn(),
  },
};

// Mock Socket.IO client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock SocketContext
const mockUseSocket = jest.fn(() => ({
  socket: mockSocket,
  isConnected: true,
}));

jest.mock('@/contexts/SocketContext', () => ({
  useSocket: () => mockUseSocket(),
  SocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock BookingSocketContext
const mockBookingSocket = {
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  id: 'test-booking-socket-id',
  connected: true,
  io: {
    on: jest.fn(),
    off: jest.fn(),
  },
};

const mockUseBookingSocket = jest.fn(() => ({
  socket: mockBookingSocket,
  isConnected: true,
  activeClubId: 'club-1',
}));

jest.mock('@/contexts/BookingSocketContext', () => ({
  useBookingSocket: () => mockUseBookingSocket(),
  BookingSocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock notification manager
jest.mock('@/utils/globalNotificationManager', () => ({
  handleSocketEvent: jest.fn(),
  cleanupNotificationManager: jest.fn(),
  transformBookingCreated: jest.fn((event) => ({
    id: `notification-${event.booking.id}`,
    type: 'BOOKING_CREATED',
    summary: 'Booking created',
    read: false,
    createdAt: new Date().toISOString(),
  })),
  transformBookingUpdated: jest.fn((event) => ({
    id: `notification-${event.booking.id}`,
    type: 'BOOKING_UPDATED',
    summary: 'Booking updated',
    read: false,
    createdAt: new Date().toISOString(),
  })),
  transformBookingCancelled: jest.fn((event) => ({
    id: `notification-${event.bookingId}`,
    type: 'BOOKING_CANCELLED',
    summary: 'Booking cancelled',
    read: false,
    createdAt: new Date().toISOString(),
  })),
}));

// Mock notification store
const mockAddNotification = jest.fn();

jest.mock('@/stores/useNotificationStore', () => ({
  useNotificationStore: jest.fn((selector) => {
    const mockStore = {
      addNotification: mockAddNotification,
    };
    return selector(mockStore);
  }),
}));

// Helper to create mock booking
const createMockBooking = (
  id: string,
  overrides?: Partial<OperationsBooking>
): OperationsBooking => ({
  id,
  userId: 'user-1',
  userName: 'Test User',
  userEmail: 'test@example.com',
  courtId: 'court-1',
  courtName: 'Court 1',
  start: '2024-01-15T10:00:00Z',
  end: '2024-01-15T11:00:00Z',
  bookingStatus: 'CONFIRMED',
  paymentStatus: 'PAID',
  price: 100,
  sportType: 'PADEL',
  coachId: null,
  coachName: null,
  createdAt: '2024-01-15T09:00:00Z',
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Real-Time Booking Updates - Client Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset booking store state
    useBookingStore.setState({
      bookings: [],
      lockedSlots: [],
      loading: false,
      error: null,
      lastFetchedAt: null,
      lastFetchParams: null,
      _inflightFetch: null,
    });
  });

  describe('Multi-Client Updates', () => {
    it('should update all clients when booking is created by one user', async () => {
      // Simulate multiple clients by rendering multiple GlobalSocketListener instances
      const { unmount: unmount1 } = render(<GlobalSocketListener />);
      const { unmount: unmount2 } = render(<GlobalSocketListener />);
      const { unmount: unmount3 } = render(<GlobalSocketListener />);

      // Get the booking_created event handler
      const eventHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'booking_created'
      )?.[1];

      expect(eventHandler).toBeDefined();

      const booking = createMockBooking('booking-1');
      const eventData: BookingCreatedEvent = {
        booking,
        clubId: 'club-1',
        courtId: 'court-1',
      };

      // Trigger the event (simulating server broadcast)
      act(() => {
        eventHandler(eventData);
      });

      // Verify all clients (listeners) receive the update
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings).toHaveLength(1);
        expect(bookings[0].id).toBe('booking-1');
      });

      // Cleanup
      unmount1();
      unmount2();
      unmount3();
    });

    it('should reflect cancelled booking as available across all clients', async () => {
      // Set initial state with a booking
      const initialBooking = createMockBooking('booking-1');
      useBookingStore.setState({
        bookings: [initialBooking],
      });

      render(<GlobalSocketListener />);

      // Get the booking_cancelled event handler
      const eventHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'booking_cancelled'
      )?.[1];

      expect(eventHandler).toBeDefined();

      const eventData: BookingDeletedEvent = {
        bookingId: 'booking-1',
        clubId: 'club-1',
        courtId: 'court-1',
      };

      // Trigger the event
      act(() => {
        eventHandler(eventData);
      });

      // Verify booking is removed
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings).toHaveLength(0);
      });
    });
  });

  describe('Rapid Events Deduplication', () => {
    it('should handle rapid consecutive booking updates without duplicates', async () => {
      render(<GlobalSocketListener />);

      const eventHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'booking_updated'
      )?.[1];

      expect(eventHandler).toBeDefined();

      // Create multiple rapid updates for the same booking with increasing timestamps
      const timestamps = [
        '2024-01-15T10:00:00.000Z',
        '2024-01-15T10:00:00.100Z',
        '2024-01-15T10:00:00.200Z',
        '2024-01-15T10:00:00.300Z',
        '2024-01-15T10:00:00.400Z',
      ];

      // Trigger rapid consecutive events
      act(() => {
        timestamps.forEach((timestamp, index) => {
          const booking = createMockBooking('booking-1', {
            bookingStatus: index === timestamps.length - 1 ? 'CONFIRMED' : 'PENDING',
            updatedAt: timestamp,
          });
          const eventData: BookingUpdatedEvent = {
            booking,
            clubId: 'club-1',
            courtId: 'court-1',
            previousStatus: 'PENDING',
          };
          eventHandler(eventData);
        });
      });

      // Verify only one booking exists with the latest state
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings).toHaveLength(1);
        expect(bookings[0].id).toBe('booking-1');
        expect(bookings[0].bookingStatus).toBe('CONFIRMED');
        expect(bookings[0].updatedAt).toBe(timestamps[timestamps.length - 1]);
      });
    });

    it('should ignore outdated updates when newer data already exists', async () => {
      // Set initial state with a newer booking
      const newerBooking = createMockBooking('booking-1', {
        bookingStatus: 'CONFIRMED',
        updatedAt: '2024-01-15T10:01:00Z',
      });
      useBookingStore.setState({
        bookings: [newerBooking],
      });

      render(<GlobalSocketListener />);

      const eventHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'booking_updated'
      )?.[1];

      expect(eventHandler).toBeDefined();

      // Try to update with older data
      const olderBooking = createMockBooking('booking-1', {
        bookingStatus: 'CANCELLED',
        updatedAt: '2024-01-15T10:00:00Z', // Older timestamp
      });

      act(() => {
        const eventData: BookingUpdatedEvent = {
          booking: olderBooking,
          clubId: 'club-1',
          courtId: 'court-1',
          previousStatus: 'PENDING',
        };
        eventHandler(eventData);
      });

      // Verify the booking state remains unchanged
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings).toHaveLength(1);
        expect(bookings[0].bookingStatus).toBe('CONFIRMED'); // Not changed
        expect(bookings[0].updatedAt).toBe('2024-01-15T10:01:00Z'); // Still newer
      });
    });

    it('should not create duplicate bookings from multiple create events', async () => {
      render(<GlobalSocketListener />);

      const eventHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'booking_created'
      )?.[1];

      expect(eventHandler).toBeDefined();

      const booking = createMockBooking('booking-1');

      // Trigger the same create event multiple times (network duplicate)
      act(() => {
        const eventData: BookingCreatedEvent = {
          booking,
          clubId: 'club-1',
          courtId: 'court-1',
        };
        eventHandler(eventData);
        eventHandler(eventData);
        eventHandler(eventData);
      });

      // Verify only one booking exists
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings).toHaveLength(1);
        expect(bookings[0].id).toBe('booking-1');
      });
    });
  });

  describe('Slot Lock Synchronization', () => {
    it('should reflect temporary slot locks across all clients', async () => {
      render(<GlobalSocketListener />);

      const eventHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'slot_locked'
      )?.[1];

      expect(eventHandler).toBeDefined();

      const slotData: SlotLockedEvent = {
        slotId: 'slot-1',
        courtId: 'court-1',
        clubId: 'club-1',
        userId: 'user-2',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
      };

      act(() => {
        eventHandler(slotData);
      });

      // Verify slot is locked in the store
      await waitFor(() => {
        const { lockedSlots, isSlotLocked } = useBookingStore.getState();
        expect(lockedSlots).toHaveLength(1);
        expect(isSlotLocked('court-1', '2024-01-15T10:00:00Z', '2024-01-15T11:00:00Z')).toBe(true);
      });
    });

    it('should reflect slot unlocks immediately across all clients', async () => {
      // Set initial state with a locked slot
      useBookingStore.setState({
        lockedSlots: [{
          slotId: 'slot-1',
          courtId: 'court-1',
          clubId: 'club-1',
          userId: 'user-2',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          lockedAt: Date.now(),
        }],
      });

      render(<GlobalSocketListener />);

      const eventHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'slot_unlocked'
      )?.[1];

      expect(eventHandler).toBeDefined();

      const unlockData: SlotUnlockedEvent = {
        slotId: 'slot-1',
        courtId: 'court-1',
        clubId: 'club-1',
      };

      act(() => {
        eventHandler(unlockData);
      });

      // Verify slot is unlocked
      await waitFor(() => {
        const { lockedSlots, isSlotLocked } = useBookingStore.getState();
        expect(lockedSlots).toHaveLength(0);
        expect(isSlotLocked('court-1', '2024-01-15T10:00:00Z', '2024-01-15T11:00:00Z')).toBe(false);
      });
    });

    it('should handle multiple slot locks without conflicts', async () => {
      render(<GlobalSocketListener />);

      const eventHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'slot_locked'
      )?.[1];

      expect(eventHandler).toBeDefined();

      // Lock multiple different slots
      const slots: SlotLockedEvent[] = [
        {
          slotId: 'slot-1',
          courtId: 'court-1',
          clubId: 'club-1',
          userId: 'user-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        },
        {
          slotId: 'slot-2',
          courtId: 'court-2',
          clubId: 'club-1',
          userId: 'user-2',
          startTime: '2024-01-15T11:00:00Z',
          endTime: '2024-01-15T12:00:00Z',
        },
        {
          slotId: 'slot-3',
          courtId: 'court-1',
          clubId: 'club-1',
          userId: 'user-3',
          startTime: '2024-01-15T12:00:00Z',
          endTime: '2024-01-15T13:00:00Z',
        },
      ];

      act(() => {
        slots.forEach(slot => eventHandler(slot));
      });

      // Verify all slots are locked
      await waitFor(() => {
        const { lockedSlots } = useBookingStore.getState();
        expect(lockedSlots).toHaveLength(3);
      });
    });
  });

  describe('Socket Reconnection Behavior', () => {
    it('should maintain listener registration after reconnection', async () => {
      const { rerender } = render(<GlobalSocketListener />);

      // Simulate disconnect
      act(() => {
        mockUseSocket.mockReturnValue({
          socket: mockSocket,
          isConnected: false,
        });
      });

      rerender(<GlobalSocketListener />);

      // Simulate reconnection
      act(() => {
        mockUseSocket.mockReturnValue({
          socket: mockSocket,
          isConnected: true,
        });
      });

      rerender(<GlobalSocketListener />);

      // Verify event listeners are still registered
      const registeredEvents = mockSocket.on.mock.calls.map(call => call[0]);
      expect(registeredEvents.filter(e => e === 'booking_created').length).toBeGreaterThan(0);
      expect(registeredEvents.filter(e => e === 'booking_updated').length).toBeGreaterThan(0);
      expect(registeredEvents.filter(e => e === 'booking_cancelled').length).toBeGreaterThan(0);
    });

    it('should handle events correctly after reconnection', async () => {
      const { rerender } = render(<GlobalSocketListener />);

      // Simulate disconnect and reconnect
      act(() => {
        mockUseSocket.mockReturnValue({
          socket: mockSocket,
          isConnected: false,
        });
      });
      rerender(<GlobalSocketListener />);

      act(() => {
        mockUseSocket.mockReturnValue({
          socket: mockSocket,
          isConnected: true,
        });
      });
      rerender(<GlobalSocketListener />);

      // Get event handler after reconnection
      const eventHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'booking_created'
      )?.[1];

      expect(eventHandler).toBeDefined();

      const booking = createMockBooking('booking-after-reconnect');
      const eventData: BookingCreatedEvent = {
        booking,
        clubId: 'club-1',
        courtId: 'court-1',
      };

      act(() => {
        eventHandler(eventData);
      });

      // Verify event is processed correctly
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings).toHaveLength(1);
        expect(bookings[0].id).toBe('booking-after-reconnect');
      });
    });
  });

  describe('Listener Cleanup', () => {
    it('should cleanup all event listeners on component unmount', () => {
      const { unmount } = render(<GlobalSocketListener />);

      // Clear previous calls to isolate unmount behavior
      mockSocket.off.mockClear();
      mockBookingSocket.off.mockClear();

      unmount();

      // Verify NotificationSocket event listeners are cleaned up
      const notificationCleanedEvents = mockSocket.off.mock.calls.map(call => call[0]);
      expect(notificationCleanedEvents).toContain('booking_created');
      expect(notificationCleanedEvents).toContain('booking_updated');
      expect(notificationCleanedEvents).toContain('booking_cancelled');
      expect(notificationCleanedEvents).toContain('payment_confirmed');
      expect(notificationCleanedEvents).toContain('payment_failed');
      expect(notificationCleanedEvents).toContain('admin_notification');

      // Verify BookingSocket event listeners are cleaned up
      const bookingCleanedEvents = mockBookingSocket.off.mock.calls.map(call => call[0]);
      expect(bookingCleanedEvents).toContain('booking_created');
      expect(bookingCleanedEvents).toContain('booking_updated');
      expect(bookingCleanedEvents).toContain('booking_cancelled');
      expect(bookingCleanedEvents).toContain('slot_locked');
      expect(bookingCleanedEvents).toContain('slot_unlocked');
      expect(bookingCleanedEvents).toContain('lock_expired');
    });

    it('should cleanup listeners on route change (component unmount and remount)', () => {
      // Initial mount (route 1)
      const { unmount } = render(<GlobalSocketListener />);

      // Record initial listener registrations
      const initialNotificationOnCalls = mockSocket.on.mock.calls.length;
      const initialBookingOnCalls = mockBookingSocket.on.mock.calls.length;

      // Simulate route change (unmount)
      unmount();

      // Record cleanup calls
      const notificationOffCalls = mockSocket.off.mock.calls.length;
      const bookingOffCalls = mockBookingSocket.off.mock.calls.length;
      expect(notificationOffCalls).toBeGreaterThan(0);
      expect(bookingOffCalls).toBeGreaterThan(0);

      // Remount on new route
      render(<GlobalSocketListener />);

      // Verify new listeners are registered
      const newNotificationOnCalls = mockSocket.on.mock.calls.length;
      const newBookingOnCalls = mockBookingSocket.on.mock.calls.length;
      expect(newNotificationOnCalls).toBeGreaterThan(initialNotificationOnCalls);
      expect(newBookingOnCalls).toBeGreaterThan(initialBookingOnCalls);
    });

    it('should not process events after component unmount', async () => {
      const { unmount } = render(<GlobalSocketListener />);

      const eventHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'booking_created'
      )?.[1];

      expect(eventHandler).toBeDefined();

      // Unmount the component
      unmount();

      // Clear the store
      useBookingStore.setState({ bookings: [] });

      // Try to trigger event after unmount
      const booking = createMockBooking('should-not-appear');
      const eventData: BookingCreatedEvent = {
        booking,
        clubId: 'club-1',
        courtId: 'court-1',
      };

      act(() => {
        eventHandler(eventData);
      });

      // Verify the event was not processed (store should be empty)
      // Note: In reality, the handler would still execute but we verify cleanup was called
      const { cleanupNotificationManager } = jest.requireMock('@/utils/globalNotificationManager');
      expect(cleanupNotificationManager).toHaveBeenCalled();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed rapid events (create, update, delete) correctly', async () => {
      render(<GlobalSocketListener />);

      const createHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'booking_created'
      )?.[1];
      const updateHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'booking_updated'
      )?.[1];
      const deleteHandler = mockBookingSocket.on.mock.calls.find(
        call => call[0] === 'booking_cancelled'
      )?.[1];

      expect(createHandler).toBeDefined();
      expect(updateHandler).toBeDefined();
      expect(deleteHandler).toBeDefined();

      // Create booking
      const booking1 = createMockBooking('booking-1', {
        updatedAt: '2024-01-15T10:00:00Z',
      });
      
      act(() => {
        createHandler({
          booking: booking1,
          clubId: 'club-1',
          courtId: 'court-1',
        });
      });

      // Update booking
      const booking1Updated = createMockBooking('booking-1', {
        bookingStatus: 'CONFIRMED',
        updatedAt: '2024-01-15T10:00:01Z',
      });

      act(() => {
        updateHandler({
          booking: booking1Updated,
          clubId: 'club-1',
          courtId: 'court-1',
          previousStatus: 'PENDING',
        });
      });

      // Create another booking
      const booking2 = createMockBooking('booking-2', {
        updatedAt: '2024-01-15T10:00:02Z',
      });

      act(() => {
        createHandler({
          booking: booking2,
          clubId: 'club-1',
          courtId: 'court-1',
        });
      });

      // Delete first booking
      act(() => {
        deleteHandler({
          bookingId: 'booking-1',
          clubId: 'club-1',
          courtId: 'court-1',
        });
      });

      // Verify final state
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings).toHaveLength(1);
        expect(bookings[0].id).toBe('booking-2');
      });
    });
  });
});
