/**
 * Tests for Booking Socket
 * 
 * Verifies that the booking socket:
 * - Connects only when a club is selected (activeClubId is set)
 * - Disconnects when club is deselected or changed
 * - Passes clubId in authentication
 * - Verifies user has access to the requested club
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { BookingSocketProvider, useBookingSocket } from '@/contexts/BookingSocketContext';
import { io } from 'socket.io-client';
import { useUserStore } from '@/stores/useUserStore';

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
  adminType: 'club_admin' as const,
  managedIds: ['club-1', 'club-2'],
};

jest.mock('@/stores/useUserStore', () => ({
  useUserStore: jest.fn((selector) => {
    const mockStore = {
      sessionStatus: 'authenticated',
      user: mockUser,
      adminStatus: mockAdminStatus,
    };
    return selector(mockStore);
  }),
}));

// Mock ClubContext
const mockSetActiveClubId = jest.fn();
let mockActiveClubId: string | null = null;

jest.mock('@/contexts/ClubContext', () => ({
  useActiveClub: jest.fn(() => ({
    activeClubId: mockActiveClubId,
    setActiveClubId: mockSetActiveClubId,
  })),
  ClubProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Test component that uses the booking socket
function TestComponent() {
  const { socket, isConnected, activeClubId } = useBookingSocket();
  return (
    <div>
      <div data-testid="socket-id">{socket?.id || 'null'}</div>
      <div data-testid="is-connected">{isConnected ? 'true' : 'false'}</div>
      <div data-testid="active-club-id">{activeClubId || 'null'}</div>
    </div>
  );
}

describe('BookingSocket', () => {
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveClubId = null;
    
    // Create mock socket
    mockSocket = {
      id: 'test-booking-socket-id',
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

  it('should not initialize booking socket when no club is selected', async () => {
    mockActiveClubId = null;

    render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );

    // Wait to ensure socket is not initialized
    await waitFor(() => {
      expect(io).not.toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('should initialize booking socket with clubId when club is selected', async () => {
    mockActiveClubId = 'club-1';

    render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );

    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    // Verify socket was initialized with clubId
    expect(io).toHaveBeenCalledWith({
      path: '/socket.io',
      auth: {
        token: 'mock-jwt-token',
        clubId: 'club-1',
      },
    });
  });

  it('should allow connection attempt for any club (server validates access)', async () => {
    mockActiveClubId = 'club-3'; // Club not in managedIds

    render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );

    // Client allows connection attempt - server will validate actual membership
    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    // Verify socket was initialized (server will reject if no access)
    expect(io).toHaveBeenCalledWith({
      path: '/socket.io',
      auth: {
        token: 'mock-jwt-token',
        clubId: 'club-3',
      },
    });
  });

  it('should initialize socket for root admin regardless of club', async () => {
    // Update mock to be root admin
    const mockRootUser = { ...mockUser, isRoot: true };
    (useUserStore as jest.Mock)
    (useUserStore as jest.Mock).mockImplementation((selector) => {
      const mockStore = {
        sessionStatus: 'authenticated',
        user: mockRootUser,
        adminStatus: mockAdminStatus,
      };
      return selector(mockStore);
    });

    mockActiveClubId = 'any-club-id';

    render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );

    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    expect(io).toHaveBeenCalledWith({
      path: '/socket.io',
      auth: {
        token: 'mock-jwt-token',
        clubId: 'any-club-id',
      },
    });
  });

  it('should register connection event handlers', async () => {
    mockActiveClubId = 'club-1';

    render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
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

  it('should log connection with BookingSocket prefix', async () => {
    mockActiveClubId = 'club-1';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );

    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    // Verify initialization log uses BookingSocket prefix
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BookingSocket] Initializing booking socket connection for club:'),
      'club-1'
    );

    consoleSpy.mockRestore();
  });

  it('should disconnect on unmount', async () => {
    mockActiveClubId = 'club-1';

    const { unmount } = render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
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

  it('should disconnect when activeClubId is cleared', async () => {
    mockActiveClubId = 'club-1';

    const { rerender } = render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );

    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    // Clear active club
    mockActiveClubId = null;

    rerender(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );

    await waitFor(() => {
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  it('should not initialize socket for non-admin users even with activeClubId', async () => {
    // Update mock to be a regular player (non-admin)
    (useUserStore as jest.Mock)
    (useUserStore as jest.Mock).mockImplementation((selector) => {
      const mockStore = {
        sessionStatus: 'authenticated',
        user: mockUser,
        adminStatus: {
          isAdmin: false, // Not an admin
          adminType: 'none' as const,
          managedIds: [],
        },
      };
      return selector(mockStore);
    });

    mockActiveClubId = 'club-1'; // Club is selected

    render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );

    // Wait to ensure socket is not initialized
    await waitFor(() => {
      expect(io).not.toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('should disconnect socket when user loses admin privileges', async () => {
    mockActiveClubId = 'club-1';

    // Start with admin user
    (useUserStore as jest.Mock)
    (useUserStore as jest.Mock).mockImplementation((selector) => {
      const mockStore = {
        sessionStatus: 'authenticated',
        user: mockUser,
        adminStatus: mockAdminStatus,
      };
      return selector(mockStore);
    });

    const { rerender } = render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );

    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    jest.clearAllMocks();

    // Change to non-admin user
    (useUserStore as jest.Mock).mockImplementation((selector) => {
      const mockStore = {
        sessionStatus: 'authenticated',
        user: mockUser,
        adminStatus: {
          isAdmin: false,
          adminType: 'none' as const,
          managedIds: [],
        },
      };
      return selector(mockStore);
    });

    rerender(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );

    await waitFor(() => {
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  it('should initialize socket for organization admin with clubId', async () => {
    // Update mock to be organization admin
    (useUserStore as jest.Mock)
    (useUserStore as jest.Mock).mockImplementation((selector) => {
      const mockStore = {
        sessionStatus: 'authenticated',
        user: mockUser,
        adminStatus: {
          isAdmin: true,
          adminType: 'organization_admin' as const,
          managedIds: ['org-1', 'org-2'],
        },
      };
      return selector(mockStore);
    });

    mockActiveClubId = 'club-1';

    render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );

    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    expect(io).toHaveBeenCalledWith({
      path: '/socket.io',
      auth: {
        token: 'mock-jwt-token',
        clubId: 'club-1',
      },
    });
  });

  it('should initialize socket for club owner with clubId', async () => {
    // Update mock to be club owner
    (useUserStore as jest.Mock)
    (useUserStore as jest.Mock).mockImplementation((selector) => {
      const mockStore = {
        sessionStatus: 'authenticated',
        user: mockUser,
        adminStatus: {
          isAdmin: true,
          adminType: 'club_owner' as const,
          managedIds: ['club-1'],
        },
      };
      return selector(mockStore);
    });

    mockActiveClubId = 'club-1';

    render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );

    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    expect(io).toHaveBeenCalledWith({
      path: '/socket.io',
      auth: {
        token: 'mock-jwt-token',
        clubId: 'club-1',
      },
    });
  });
});
