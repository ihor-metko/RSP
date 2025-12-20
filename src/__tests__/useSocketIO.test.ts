/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useSocketIO } from '@/hooks/useSocketIO';
import type { BookingCreatedEvent, BookingUpdatedEvent, BookingDeletedEvent } from '@/types/socket';

// Mock socket instance
let mockSocket: any;

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  return {
    io: jest.fn(() => {
      mockSocket = {
        id: 'mock-socket-id',
        connected: false,
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        connect: jest.fn(function() {
          this.connected = true;
        }),
        disconnect: jest.fn(function() {
          this.connected = false;
        }),
      };
      return mockSocket;
    }),
  };
});

describe('useSocketIO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = null;
  });

  it('should initialize with disconnected state when autoConnect is false', () => {
    const { result } = renderHook(() => useSocketIO({ autoConnect: false }));

    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should initialize socket when autoConnect is true', async () => {
    renderHook(() => useSocketIO({ autoConnect: true }));

    await waitFor(() => {
      expect(mockSocket).toBeTruthy();
      expect(mockSocket.on).toHaveBeenCalled();
    });
  });

  it('should register event handlers when callbacks are provided', async () => {
    const onBookingCreated = jest.fn();
    const onBookingUpdated = jest.fn();
    const onBookingDeleted = jest.fn();

    renderHook(() =>
      useSocketIO({
        autoConnect: true,
        onBookingCreated,
        onBookingUpdated,
        onBookingDeleted,
      })
    );

    await waitFor(() => {
      expect(mockSocket).toBeTruthy();
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      // Check that handlers are registered (we use wrapper functions now)
      expect(mockSocket.on).toHaveBeenCalledWith('bookingCreated', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('bookingUpdated', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('bookingDeleted', expect.any(Function));
    });
  });

  it('should provide manual connect and disconnect functions', () => {
    const { result } = renderHook(() => useSocketIO({ autoConnect: false }));

    expect(result.current.connect).toBeDefined();
    expect(result.current.disconnect).toBeDefined();
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
  });

  it('should clean up event listeners on unmount', async () => {
    const { unmount } = renderHook(() => useSocketIO({ autoConnect: true }));

    await waitFor(() => {
      expect(mockSocket).toBeTruthy();
    });

    const socketInstance = mockSocket;
    unmount();

    expect(socketInstance.off).toHaveBeenCalledWith('connect');
    expect(socketInstance.off).toHaveBeenCalledWith('disconnect');
    expect(socketInstance.disconnect).toHaveBeenCalled();
  });
});

describe('Socket.IO Event Types', () => {
  it('should have correct BookingCreatedEvent structure', () => {
    const event: BookingCreatedEvent = {
      booking: {
        id: 'booking-123',
        userId: 'user-123',
        userName: 'Test User',
        userEmail: 'test@example.com',
        courtId: 'court-123',
        courtName: 'Court 1',
        clubId: 'club-123',
        clubName: 'Test Club',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        bookingStatus: 'confirmed',
        paymentStatus: 'paid',
        price: 100,
        sportType: 'tennis',
        coachId: null,
        coachName: null,
        createdAt: '2024-01-15T09:00:00Z',
      },
      clubId: 'club-123',
      courtId: 'court-123',
    };

    expect(event.booking.id).toBe('booking-123');
    expect(event.clubId).toBe('club-123');
    expect(event.courtId).toBe('court-123');
  });

  it('should have correct BookingUpdatedEvent structure', () => {
    const event: BookingUpdatedEvent = {
      booking: {
        id: 'booking-123',
        userId: 'user-123',
        userName: 'Test User',
        userEmail: 'test@example.com',
        courtId: 'court-123',
        courtName: 'Court 1',
        clubId: 'club-123',
        clubName: 'Test Club',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        bookingStatus: 'cancelled',
        paymentStatus: 'refunded',
        price: 100,
        sportType: 'tennis',
        coachId: null,
        coachName: null,
        createdAt: '2024-01-15T09:00:00Z',
      },
      clubId: 'club-123',
      courtId: 'court-123',
      previousStatus: 'confirmed',
    };

    expect(event.booking.bookingStatus).toBe('cancelled');
    expect(event.previousStatus).toBe('confirmed');
  });

  it('should have correct BookingDeletedEvent structure', () => {
    const event: BookingDeletedEvent = {
      bookingId: 'booking-123',
      clubId: 'club-123',
      courtId: 'court-123',
    };

    expect(event.bookingId).toBe('booking-123');
    expect(event.clubId).toBe('club-123');
  });
});
