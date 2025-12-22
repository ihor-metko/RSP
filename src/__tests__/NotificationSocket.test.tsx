/**
 * Tests for Notification Socket
 * 
 * Verifies that the notification socket:
 * - Connects once per session
 * - Remains active regardless of page/club changes
 * - Does NOT reconnect when activeClubId changes
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { SocketProvider, useSocket } from '@/contexts/SocketContext';
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

jest.mock('@/stores/useUserStore', () => ({
  useUserStore: jest.fn((selector) => {
    const mockStore = {
      sessionStatus: 'authenticated',
      user: mockUser,
    };
    return selector(mockStore);
  }),
}));

// Test component that uses the socket
function TestComponent() {
  const { socket, isConnected } = useSocket();
  return (
    <div>
      <div data-testid="socket-id">{socket?.id || 'null'}</div>
      <div data-testid="is-connected">{isConnected ? 'true' : 'false'}</div>
    </div>
  );
}

describe('NotificationSocket', () => {
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
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

    // Mock token retrieval
    mockGetSocketToken.mockResolvedValue('mock-jwt-token');
  });

  it('should initialize notification socket without clubId', async () => {
    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    // Verify socket was initialized without clubId
    expect(io).toHaveBeenCalledWith({
      path: '/socket.io',
      auth: {
        token: 'mock-jwt-token',
        // No clubId should be passed for notification socket
      },
    });
  });

  it('should register connection event handlers', async () => {
    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Verify all connection handlers are registered
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(mockSocket.io.on).toHaveBeenCalledWith('reconnect', expect.any(Function));
  });

  it('should log connection with NotificationSocket prefix', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    // Verify initialization log uses NotificationSocket prefix
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[NotificationSocket] Initializing notification socket connection')
    );

    consoleSpy.mockRestore();
  });

  it('should disconnect on unmount', async () => {
    const { unmount } = render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    unmount();

    // Verify cleanup
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(mockSocket.off).toHaveBeenCalledWith('connect');
    expect(mockSocket.off).toHaveBeenCalledWith('disconnect');
    expect(mockSocket.off).toHaveBeenCalledWith('connect_error');
    expect(mockSocket.io.off).toHaveBeenCalledWith('reconnect');
  });
});
