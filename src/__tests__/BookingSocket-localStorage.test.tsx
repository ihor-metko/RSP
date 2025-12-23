/**
 * Tests for BookingSocket initialization behavior with localStorage
 * 
 * Validates that:
 * 1. BookingSocket does NOT initialize automatically from stale localStorage clubId
 * 2. BookingSocket only initializes when activeClubId is explicitly set (e.g., by operations page)
 * 3. RootAdmin and OrgAdmin do not get unwanted socket connections on Dashboard/other pages
 * 4. ClubAdmin only connects when navigating to operations page
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
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

// Mock user store - will be configured per test
let mockUserStoreData: any = {
  sessionStatus: 'authenticated',
  user: { id: 'user-1', email: 'admin@test.com', name: 'Admin User', isRoot: false },
  adminStatus: { isAdmin: true, adminType: 'club_admin', managedIds: ['club-1'] },
};

jest.mock('@/stores/useUserStore', () => ({
  useUserStore: jest.fn((selector) => selector(mockUserStoreData)),
}));

// Mock ClubContext - will be configured per test
let mockActiveClubId: string | null = null;
const mockSetActiveClubId = jest.fn();

jest.mock('@/contexts/ClubContext', () => ({
  useActiveClub: jest.fn(() => ({
    activeClubId: mockActiveClubId,
    setActiveClubId: mockSetActiveClubId,
  })),
  ClubProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Test component to access BookingSocket context
function TestComponent() {
  const { socket, isConnected, activeClubId } = useBookingSocket();
  
  return (
    <div>
      <div data-testid="socket-status">{socket ? 'connected' : 'disconnected'}</div>
      <div data-testid="is-connected">{isConnected ? 'true' : 'false'}</div>
      <div data-testid="active-club">{activeClubId || 'none'}</div>
    </div>
  );
}

describe('BookingSocket localStorage behavior', () => {
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset mock data
    mockActiveClubId = null;
    mockUserStoreData = {
      sessionStatus: 'authenticated',
      user: { id: 'user-1', email: 'admin@test.com', name: 'Admin User', isRoot: false },
      adminStatus: { isAdmin: true, adminType: 'club_admin', managedIds: ['club-1'] },
    };
    
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
    (io as jest.MockedFunction<typeof io>).mockReturnValue(mockSocket as any);
    
    // Mock getSocketToken to return a token
    mockGetSocketToken.mockResolvedValue('mock-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should NOT initialize BookingSocket from stale localStorage clubId', async () => {
    // Simulate stale clubId in localStorage (from previous session)
    localStorage.setItem('activeClubId', 'club-1');
    
    // No activeClubId set in ClubContext (simulating Dashboard/home page)
    mockActiveClubId = null;
    
    // Render with authenticated admin user
    const { getByTestId } = render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );
    
    // Wait a bit to ensure no initialization happens
    await waitFor(() => {
      expect(getByTestId('socket-status')).toHaveTextContent('disconnected');
    }, { timeout: 100 });
    
    // Verify socket did NOT connect despite stale localStorage
    expect(getByTestId('socket-status')).toHaveTextContent('disconnected');
    expect(getByTestId('active-club')).toHaveTextContent('none');
    
    // Verify socket token was not requested (since no connection should happen)
    expect(mockGetSocketToken).not.toHaveBeenCalled();
  });

  it('should initialize BookingSocket ONLY when activeClubId is explicitly set', async () => {
    // Start with no clubId in localStorage
    localStorage.clear();
    
    // Start with no activeClubId
    mockActiveClubId = null;
    
    // Render with authenticated admin user
    const { getByTestId, rerender } = render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );
    
    // Initially disconnected
    expect(getByTestId('socket-status')).toHaveTextContent('disconnected');
    
    // Now set activeClubId (simulating navigation to operations page)
    mockActiveClubId = 'club-1';
    
    rerender(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );
    
    // Should now initialize socket
    await waitFor(() => {
      expect(mockGetSocketToken).toHaveBeenCalled();
    });
  });

  it('should NOT initialize BookingSocket for RootAdmin on Dashboard (no activeClubId)', async () => {
    // Root admin user
    mockUserStoreData.user.isRoot = true;
    mockUserStoreData.adminStatus.adminType = 'root_admin';
    
    // Stale clubId in localStorage
    localStorage.setItem('activeClubId', 'club-1');
    
    // No activeClubId set (user is on Dashboard, not operations page)
    mockActiveClubId = null;
    
    const { getByTestId } = render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );
    
    // Wait and verify no connection
    await waitFor(() => {
      expect(getByTestId('socket-status')).toHaveTextContent('disconnected');
    }, { timeout: 100 });
    
    expect(mockGetSocketToken).not.toHaveBeenCalled();
  });

  it('should NOT initialize BookingSocket for OrgAdmin on Dashboard (no activeClubId)', async () => {
    // Organization admin user
    mockUserStoreData.adminStatus.adminType = 'organization_admin';
    mockUserStoreData.adminStatus.managedIds = ['org-1'];
    
    // Stale clubId in localStorage
    localStorage.setItem('activeClubId', 'club-1');
    
    // No activeClubId set (user is on Dashboard, not operations page)
    mockActiveClubId = null;
    
    const { getByTestId } = render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );
    
    // Wait and verify no connection
    await waitFor(() => {
      expect(getByTestId('socket-status')).toHaveTextContent('disconnected');
    }, { timeout: 100 });
    
    expect(mockGetSocketToken).not.toHaveBeenCalled();
  });

  it('should initialize BookingSocket for ClubAdmin ONLY when navigating to operations page', async () => {
    // Club admin user
    mockUserStoreData.adminStatus.adminType = 'club_admin';
    mockUserStoreData.adminStatus.managedIds = ['club-1'];
    
    // Start with no activeClubId (user on Dashboard)
    mockActiveClubId = null;
    
    const { getByTestId, rerender } = render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );
    
    // Initially disconnected
    expect(getByTestId('socket-status')).toHaveTextContent('disconnected');
    expect(mockGetSocketToken).not.toHaveBeenCalled();
    
    // Simulate navigation to operations page (sets activeClubId)
    mockActiveClubId = 'club-1';
    
    rerender(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );
    
    // Should now initialize socket
    await waitFor(() => {
      expect(mockGetSocketToken).toHaveBeenCalled();
    });
  });

  it('should disconnect BookingSocket when leaving operations page (activeClubId becomes null)', async () => {
    // Start with active club (on operations page)
    mockActiveClubId = 'club-1';
    
    const { rerender } = render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );
    
    // Socket should initialize
    await waitFor(() => {
      expect(mockGetSocketToken).toHaveBeenCalled();
    });
    
    // Now simulate leaving operations page (activeClubId becomes null)
    mockActiveClubId = null;
    
    rerender(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );
    
    // Socket should disconnect
    await waitFor(() => {
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  it('should NOT initialize BookingSocket for non-admin users even with activeClubId', async () => {
    // Regular user (not admin)
    mockUserStoreData.adminStatus = { isAdmin: false, adminType: 'none', managedIds: [] };
    
    // ActiveClubId is set
    mockActiveClubId = 'club-1';
    
    const { getByTestId } = render(
      <BookingSocketProvider>
        <TestComponent />
      </BookingSocketProvider>
    );
    
    // Wait and verify no connection (non-admin users should not connect to BookingSocket)
    await waitFor(() => {
      expect(getByTestId('socket-status')).toHaveTextContent('disconnected');
    }, { timeout: 100 });
    
    expect(mockGetSocketToken).not.toHaveBeenCalled();
  });
});
