/**
 * Tests for WebSocket Token Validation
 * 
 * Verifies that socket connections properly validate tokens:
 * - Token must be a non-empty string
 * - Socket should not initialize with invalid tokens
 * - Proper error logging for invalid tokens
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { SocketProvider, useSocket } from '@/contexts/SocketContext';
import { BookingSocketProvider, useBookingSocket } from '@/contexts/BookingSocketContext';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

// Mock stores
const mockGetSocketToken = jest.fn();
const mockClearSocketToken = jest.fn();

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: jest.fn((selector) => {
    const mockStore = {
      getSocketToken: mockGetSocketToken,
      clearSocketToken: mockClearSocketToken,
    };
    return selector(mockStore);
  }),
}));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  isRoot: false,
};

const mockAdminStatus = {
  isAdmin: true,
  adminType: 'root_admin' as const,
  managedIds: [],
};

let mockSessionStatus = 'authenticated';
let mockCurrentUser = mockUser;
let mockCurrentAdminStatus = mockAdminStatus;

jest.mock('@/stores/useUserStore', () => ({
  useUserStore: jest.fn((selector) => {
    const mockStore = {
      sessionStatus: mockSessionStatus,
      user: mockCurrentUser,
      adminStatus: mockCurrentAdminStatus,
    };
    return selector(mockStore);
  }),
}));

// Mock ClubContext
let mockActiveClubId: string | null = null;

jest.mock('@/contexts/ClubContext', () => ({
  useActiveClub: jest.fn(() => ({
    activeClubId: mockActiveClubId,
    setActiveClubId: jest.fn(),
  })),
}));

// Test component for NotificationSocket
function NotificationSocketTestComponent() {
  const { socket, isConnected } = useSocket();
  return (
    <div>
      <div data-testid="notification-socket-id">{socket?.id || 'null'}</div>
      <div data-testid="notification-is-connected">{isConnected ? 'true' : 'false'}</div>
    </div>
  );
}

// Test component for BookingSocket
function BookingSocketTestComponent() {
  const { socket, isConnected } = useBookingSocket();
  return (
    <div>
      <div data-testid="booking-socket-id">{socket?.id || 'null'}</div>
      <div data-testid="booking-is-connected">{isConnected ? 'true' : 'false'}</div>
    </div>
  );
}

describe('Socket Token Validation', () => {
  let mockSocket: any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock values
    mockSessionStatus = 'authenticated';
    mockCurrentUser = mockUser;
    mockCurrentAdminStatus = mockAdminStatus;
    mockActiveClubId = null;
    
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

    // Mock io() to return the mock socket
    (io as jest.Mock).mockReturnValue(mockSocket);

    // Spy on console.error to verify error logging
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('NotificationSocket', () => {
    it('should not initialize socket when token is null', async () => {
      mockGetSocketToken.mockResolvedValue(null);

      render(
        <SocketProvider>
          <NotificationSocketTestComponent />
        </SocketProvider>
      );

      await waitFor(() => {
        expect(mockGetSocketToken).toHaveBeenCalled();
      });

      // Socket should NOT be initialized
      expect(io).not.toHaveBeenCalled();
      
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NotificationSocket] Cannot initialize socket: no token available')
      );
    });

    it('should not initialize socket when token is undefined', async () => {
      mockGetSocketToken.mockResolvedValue(undefined);

      render(
        <SocketProvider>
          <NotificationSocketTestComponent />
        </SocketProvider>
      );

      await waitFor(() => {
        expect(mockGetSocketToken).toHaveBeenCalled();
      });

      // Socket should NOT be initialized
      expect(io).not.toHaveBeenCalled();
      
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NotificationSocket] Cannot initialize socket: no token available')
      );
    });

    it('should not initialize socket when token is not a string', async () => {
      mockGetSocketToken.mockResolvedValue(12345 as any);

      render(
        <SocketProvider>
          <NotificationSocketTestComponent />
        </SocketProvider>
      );

      await waitFor(() => {
        expect(mockGetSocketToken).toHaveBeenCalled();
      });

      // Socket should NOT be initialized
      expect(io).not.toHaveBeenCalled();
      
      // Should log error with type information
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NotificationSocket] Cannot initialize socket: token is not a string'),
        'number'
      );
    });

    it('should not initialize socket when token is an empty string', async () => {
      mockGetSocketToken.mockResolvedValue('   ');

      render(
        <SocketProvider>
          <NotificationSocketTestComponent />
        </SocketProvider>
      );

      await waitFor(() => {
        expect(mockGetSocketToken).toHaveBeenCalled();
      });

      // Socket should NOT be initialized
      expect(io).not.toHaveBeenCalled();
      
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NotificationSocket] Cannot initialize socket: token is empty')
      );
    });

    it('should initialize socket with valid token', async () => {
      mockGetSocketToken.mockResolvedValue('valid-jwt-token');

      render(
        <SocketProvider>
          <NotificationSocketTestComponent />
        </SocketProvider>
      );

      await waitFor(() => {
        expect(io).toHaveBeenCalled();
      });

      // Socket should be initialized with correct config
      expect(io).toHaveBeenCalledWith({
        path: '/socket.io',
        auth: {
          token: 'valid-jwt-token',
        },
      });
      
      // Should log success
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[NotificationSocket] Cannot initialize socket')
      );
    });
  });

  describe('BookingSocket', () => {
    beforeEach(() => {
      // Set active club for booking socket tests
      mockActiveClubId = 'club-123';
    });

    it('should not initialize socket when token is null', async () => {
      mockGetSocketToken.mockResolvedValue(null);

      render(
        <SocketProvider>
          <BookingSocketProvider>
            <BookingSocketTestComponent />
          </BookingSocketProvider>
        </SocketProvider>
      );

      await waitFor(() => {
        expect(mockGetSocketToken).toHaveBeenCalled();
      });

      // Socket should NOT be initialized
      expect(io).not.toHaveBeenCalled();
      
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BookingSocket] Cannot initialize socket: no token available')
      );
    });

    it('should not initialize socket when token is not a string', async () => {
      mockGetSocketToken.mockResolvedValue({ token: 'invalid' } as any);

      render(
        <SocketProvider>
          <BookingSocketProvider>
            <BookingSocketTestComponent />
          </BookingSocketProvider>
        </SocketProvider>
      );

      await waitFor(() => {
        expect(mockGetSocketToken).toHaveBeenCalled();
      });

      // Socket should NOT be initialized
      expect(io).not.toHaveBeenCalled();
      
      // Should log error with type information
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BookingSocket] Cannot initialize socket: token is not a string'),
        'object'
      );
    });

    it('should not initialize socket when token is an empty string', async () => {
      mockGetSocketToken.mockResolvedValue('');

      render(
        <SocketProvider>
          <BookingSocketProvider>
            <BookingSocketTestComponent />
          </BookingSocketProvider>
        </SocketProvider>
      );

      await waitFor(() => {
        expect(mockGetSocketToken).toHaveBeenCalled();
      });

      // Socket should NOT be initialized
      expect(io).not.toHaveBeenCalled();
      
      // Should log error (empty string is caught by the null/undefined check since it's falsy)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BookingSocket] Cannot initialize socket: no token available')
      );
    });

    it('should not initialize socket when token is whitespace only', async () => {
      mockGetSocketToken.mockResolvedValue('   ');

      render(
        <SocketProvider>
          <BookingSocketProvider>
            <BookingSocketTestComponent />
          </BookingSocketProvider>
        </SocketProvider>
      );

      await waitFor(() => {
        expect(mockGetSocketToken).toHaveBeenCalled();
      });

      // Socket should NOT be initialized
      expect(io).not.toHaveBeenCalled();
      
      // Should log error (whitespace string is caught by the trim check)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BookingSocket] Cannot initialize socket: token is empty')
      );
    });

    it('should initialize socket with valid token and clubId', async () => {
      mockGetSocketToken.mockResolvedValue('valid-jwt-token');

      render(
        <SocketProvider>
          <BookingSocketProvider>
            <BookingSocketTestComponent />
          </BookingSocketProvider>
        </SocketProvider>
      );

      await waitFor(() => {
        expect(io).toHaveBeenCalledTimes(2); // NotificationSocket + BookingSocket
      });

      // BookingSocket should be initialized with correct config
      expect(io).toHaveBeenCalledWith({
        path: '/socket.io',
        auth: {
          token: 'valid-jwt-token',
          clubId: 'club-123',
        },
      });
      
      // Should log success
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[BookingSocket] Cannot initialize socket')
      );
    });
  });
});
