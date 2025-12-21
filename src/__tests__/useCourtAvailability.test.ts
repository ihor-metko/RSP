/**
 * Tests for useCourtAvailability hook
 * 
 * Tests real-time WebSocket updates for court availability
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useCourtAvailability } from '@/hooks/useCourtAvailability';

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  id: 'test-socket-id',
  connected: true,
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock SocketProvider by providing a mock socket
jest.mock('@/contexts/SocketContext', () => ({
  useSocket: jest.fn(() => ({
    socket: mockSocket,
    isConnected: true,
  })),
}));

// Mock the booking store
const mockLockedSlots = [];

jest.mock('@/stores/useBookingStore', () => ({
  useBookingStore: jest.fn((selector) => {
    const mockStore = {
      lockedSlots: mockLockedSlots,
    };
    return selector(mockStore);
  }),
}));

describe('useCourtAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register event listeners for the specified club', () => {
    const clubId = 'club-1';
    renderHook(() => useCourtAvailability(clubId));

    const registeredEvents = mockSocket.on.mock.calls.map(call => call[0]);
    
    expect(registeredEvents).toContain('booking_created');
    expect(registeredEvents).toContain('booking_cancelled');
    expect(registeredEvents).toContain('slot_locked');
    expect(registeredEvents).toContain('slot_unlocked');
    expect(registeredEvents).toContain('lock_expired');
  });

  it('should not register listeners when clubId is null', () => {
    renderHook(() => useCourtAvailability(null));

    expect(mockSocket.on).not.toHaveBeenCalled();
  });

  it('should trigger refresh when booking_created event occurs for the club', async () => {
    const clubId = 'club-1';
    const onAvailabilityChange = jest.fn();
    
    renderHook(() => useCourtAvailability(clubId, onAvailabilityChange));

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'booking_created'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      booking: { id: 'booking-1' },
      clubId: 'club-1',
      courtId: 'court-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      expect(onAvailabilityChange).toHaveBeenCalled();
    });
  });

  it('should not trigger refresh when booking_created event is for a different club', async () => {
    const clubId = 'club-1';
    const onAvailabilityChange = jest.fn();
    
    renderHook(() => useCourtAvailability(clubId, onAvailabilityChange));

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'booking_created'
    )?.[1];

    const eventData = {
      booking: { id: 'booking-1' },
      clubId: 'club-2', // Different club
      courtId: 'court-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      expect(onAvailabilityChange).not.toHaveBeenCalled();
    });
  });

  it('should trigger refresh when slot_locked event occurs for the club', async () => {
    const clubId = 'club-1';
    const onAvailabilityChange = jest.fn();
    
    renderHook(() => useCourtAvailability(clubId, onAvailabilityChange));

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'slot_locked'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      slotId: 'slot-1',
      clubId: 'club-1',
      courtId: 'court-1',
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-15T11:00:00Z',
    };

    eventHandler(eventData);

    await waitFor(() => {
      expect(onAvailabilityChange).toHaveBeenCalled();
    });
  });

  it('should deduplicate events within 5 seconds', async () => {
    const clubId = 'club-1';
    const onAvailabilityChange = jest.fn();
    
    renderHook(() => useCourtAvailability(clubId, onAvailabilityChange));

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'booking_created'
    )?.[1];

    const eventData = {
      booking: { id: 'booking-1' },
      clubId: 'club-1',
      courtId: 'court-1',
    };

    // Fire the same event twice in quick succession
    eventHandler(eventData);
    eventHandler(eventData);

    await waitFor(() => {
      // Should only trigger once due to deduplication
      expect(onAvailabilityChange).toHaveBeenCalledTimes(1);
    });
  });

  it('should cleanup event listeners on unmount', () => {
    const clubId = 'club-1';
    const { unmount } = renderHook(() => useCourtAvailability(clubId));

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('booking_created', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('booking_cancelled', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('slot_locked', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('slot_unlocked', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('lock_expired', expect.any(Function));
  });

  it('should return refreshKey that increments on updates', async () => {
    const clubId = 'club-1';
    
    const { result } = renderHook(() => useCourtAvailability(clubId));
    
    const initialRefreshKey = result.current.refreshKey;

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'booking_created'
    )?.[1];

    const eventData = {
      booking: { id: 'booking-1' },
      clubId: 'club-1',
      courtId: 'court-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      expect(result.current.refreshKey).toBe(initialRefreshKey + 1);
    });
  });
});
