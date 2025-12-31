/**
 * Tests for useSocketStore
 * 
 * Ensures centralized socket management:
 * - Single socket instance per type
 * - React StrictMode safety (no duplicates on double-mount)
 * - Proper cleanup
 * - Token caching and deduplication
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSocketStore } from '@/stores/useSocketStore';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

// Mock fetch for token endpoint
global.fetch = jest.fn();

describe('useSocketStore', () => {
  let mockSocket: any;

  beforeEach(() => {
    // Reset store state
    useSocketStore.setState({
      notificationSocket: null,
      notificationConnected: false,
      bookingSocket: null,
      bookingConnected: false,
      activeClubId: null,
      socketToken: null,
      isLoadingToken: false,
      tokenError: null,
      tokenPromise: null,
    });

    // Create mock socket
    mockSocket = {
      id: 'test-socket-id',
      on: jest.fn(),
      off: jest.fn(),
      disconnect: jest.fn(),
      io: {
        on: jest.fn(),
        off: jest.fn(),
      },
    };

    // Mock io() to return our mock socket
    (io as jest.Mock).mockReturnValue(mockSocket);

    // Mock fetch for token endpoint
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'test-token-123' }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Socket Token Management', () => {
    it('should fetch socket token from API', async () => {
      const { result } = renderHook(() => useSocketStore());

      let token: string | null = null;
      await act(async () => {
        token = await result.current.getSocketToken();
      });

      expect(fetch).toHaveBeenCalledWith('/api/socket/token');
      expect(token).toBe('test-token-123');
      expect(result.current.socketToken).toBe('test-token-123');
    });

    it('should cache socket token and not refetch', async () => {
      const { result } = renderHook(() => useSocketStore());

      // First fetch
      await act(async () => {
        await result.current.getSocketToken();
      });

      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cached token
      let token: string | null = null;
      await act(async () => {
        token = await result.current.getSocketToken();
      });

      expect(fetch).toHaveBeenCalledTimes(1); // Still 1, not 2
      expect(token).toBe('test-token-123');
    });

    it('should prevent duplicate token requests (inflight guard)', async () => {
      const { result } = renderHook(() => useSocketStore());

      // Make two simultaneous requests
      const promises = [
        act(async () => result.current.getSocketToken()),
        act(async () => result.current.getSocketToken()),
      ];

      await Promise.all(promises);

      // Should only call API once
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should clear socket token', async () => {
      // Fetch token
      await act(async () => {
        await useSocketStore.getState().getSocketToken();
      });

      expect(useSocketStore.getState().socketToken).toBe('test-token-123');

      // Clear token
      act(() => {
        useSocketStore.getState().clearSocketToken();
      });

      expect(useSocketStore.getState().socketToken).toBeNull();
      expect(useSocketStore.getState().tokenError).toBeNull();
    });

    it('should handle token fetch errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      let token: string | null = null;
      await act(async () => {
        token = await useSocketStore.getState().getSocketToken();
      });

      expect(token).toBeNull();
      expect(useSocketStore.getState().tokenError).toBe('Unauthorized');
    });
  });

  describe('NotificationSocket', () => {
    it('should initialize notification socket', () => {
      act(() => {
        useSocketStore.getState().initializeNotificationSocket('test-token');
      });

      expect(io).toHaveBeenCalledWith({
        path: '/socket.io',
        auth: {
          token: 'test-token',
        },
      });
      expect(useSocketStore.getState().notificationSocket).toBe(mockSocket);
    });

    it('should prevent duplicate notification socket initialization', () => {
      // Initialize twice
      act(() => {
        useSocketStore.getState().initializeNotificationSocket('test-token');
        useSocketStore.getState().initializeNotificationSocket('test-token');
      });

      // Should only create socket once
      expect(io).toHaveBeenCalledTimes(1);
    });

    it('should update connection state on connect', () => {
      act(() => {
        useSocketStore.getState().initializeNotificationSocket('test-token');
      });

      expect(useSocketStore.getState().notificationConnected).toBe(false);

      // Simulate socket connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1];

      act(() => {
        connectHandler?.();
      });

      expect(useSocketStore.getState().notificationConnected).toBe(true);
    });

    it('should disconnect notification socket', () => {
      act(() => {
        useSocketStore.getState().initializeNotificationSocket('test-token');
      });

      expect(useSocketStore.getState().notificationSocket).not.toBeNull();

      act(() => {
        useSocketStore.getState().disconnectNotificationSocket();
      });

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.off).toHaveBeenCalledWith('connect');
      expect(mockSocket.off).toHaveBeenCalledWith('disconnect');
      expect(mockSocket.off).toHaveBeenCalledWith('connect_error');
      expect(useSocketStore.getState().notificationSocket).toBeNull();
      expect(useSocketStore.getState().notificationConnected).toBe(false);
    });
  });

  describe('BookingSocket', () => {
    it('should initialize booking socket with clubId', () => {
      act(() => {
        useSocketStore.getState().initializeBookingSocket('test-token', 'club-123');
      });

      expect(io).toHaveBeenCalledWith({
        path: '/socket.io',
        auth: {
          token: 'test-token',
          clubId: 'club-123',
        },
      });
      expect(useSocketStore.getState().bookingSocket).toBe(mockSocket);
      expect(useSocketStore.getState().activeClubId).toBe('club-123');
    });

    it('should prevent duplicate booking socket for same club', () => {
      // Initialize twice with same club
      act(() => {
        useSocketStore.getState().initializeBookingSocket('test-token', 'club-123');
        useSocketStore.getState().initializeBookingSocket('test-token', 'club-123');
      });

      // Should only create socket once
      expect(io).toHaveBeenCalledTimes(1);
    });

    it('should disconnect old socket when changing clubs', () => {
      // Initialize for club-123
      act(() => {
        useSocketStore.getState().initializeBookingSocket('test-token', 'club-123');
      });

      const firstSocket = mockSocket;
      expect(useSocketStore.getState().activeClubId).toBe('club-123');

      // Create new mock for second socket
      const secondSocket = { ...mockSocket };
      (io as jest.Mock).mockReturnValueOnce(secondSocket);

      // Initialize for club-456 (different club)
      act(() => {
        useSocketStore.getState().initializeBookingSocket('test-token', 'club-456');
      });

      // Should disconnect first socket
      expect(firstSocket.disconnect).toHaveBeenCalled();
      
      // Should create new socket for new club
      expect(io).toHaveBeenCalledTimes(2);
      expect(useSocketStore.getState().activeClubId).toBe('club-456');
    });

    it('should disconnect booking socket', () => {
      act(() => {
        useSocketStore.getState().initializeBookingSocket('test-token', 'club-123');
      });

      expect(useSocketStore.getState().bookingSocket).not.toBeNull();

      act(() => {
        useSocketStore.getState().disconnectBookingSocket();
      });

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(useSocketStore.getState().bookingSocket).toBeNull();
      expect(useSocketStore.getState().bookingConnected).toBe(false);
      expect(useSocketStore.getState().activeClubId).toBeNull();
    });
  });

  describe('React StrictMode Safety', () => {
    it('should handle double initialization (StrictMode simulation)', () => {
      // First mount
      act(() => {
        useSocketStore.getState().initializeNotificationSocket('test-token');
      });

      // Simulate StrictMode double-mount by reinitializing
      act(() => {
        useSocketStore.getState().initializeNotificationSocket('test-token');
      });

      // Should still only have one socket instance
      expect(io).toHaveBeenCalledTimes(1);
      expect(useSocketStore.getState().notificationSocket).toBe(mockSocket);
    });
  });

  describe('Active Club ID', () => {
    it('should set active club ID', () => {
      expect(useSocketStore.getState().activeClubId).toBeNull();

      act(() => {
        useSocketStore.getState().setActiveClubId('club-123');
      });

      expect(useSocketStore.getState().activeClubId).toBe('club-123');
    });

    it('should clear active club ID', () => {
      act(() => {
        useSocketStore.getState().setActiveClubId('club-123');
      });

      expect(useSocketStore.getState().activeClubId).toBe('club-123');

      act(() => {
        useSocketStore.getState().setActiveClubId(null);
      });

      expect(useSocketStore.getState().activeClubId).toBeNull();
    });
  });
});
