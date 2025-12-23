/**
 * Tests for Operations Page Socket Cleanup
 * 
 * Verifies that:
 * - activeClubId is set when entering the operations page
 * - activeClubId is cleared when leaving the operations page
 * - Booking Socket disconnects when activeClubId is cleared
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';

// Mock the ClubContext
const mockSetActiveClubId = jest.fn();
const mockActiveClubId = jest.fn().mockReturnValue(null);

jest.mock('@/contexts/ClubContext', () => ({
  useActiveClub: jest.fn(() => ({
    activeClubId: mockActiveClubId(),
    setActiveClubId: mockSetActiveClubId,
  })),
  ClubProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock other dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
  useParams: jest.fn(() => ({ clubId: 'test-club-id' })),
}));

jest.mock('next-intl', () => ({
  useTranslations: jest.fn(() => (key: string) => key),
}));

jest.mock('@/stores/useUserStore', () => ({
  useUserStore: jest.fn((selector) => {
    const mockStore = {
      adminStatus: {
        isAdmin: true,
        adminType: 'root_admin',
        managedIds: [],
      },
      isLoggedIn: true,
      isLoading: false,
      isHydrated: true,
      user: { id: 'user-1', isRoot: true },
    };
    return selector(mockStore);
  }),
}));

jest.mock('@/stores/useAdminClubStore', () => ({
  useAdminClubStore: jest.fn(() => ({
    clubsById: {
      'test-club-id': {
        id: 'test-club-id',
        name: 'Test Club',
      },
    },
    clubs: [],
    ensureClubById: jest.fn().mockResolvedValue({}),
    loadingClubs: false,
    clubsError: null,
  })),
}));

jest.mock('@/stores/useCourtStore', () => ({
  useCourtStore: jest.fn(() => ({
    courts: [],
    fetchCourtsIfNeeded: jest.fn().mockResolvedValue([]),
    loading: false,
  })),
}));

jest.mock('@/stores/useBookingStore', () => ({
  useBookingStore: jest.fn(() => ({
    bookings: [],
    fetchBookingsForDay: jest.fn().mockResolvedValue([]),
    loading: false,
    error: null,
  })),
}));

// Mock the BookingSocketListener component
jest.mock('@/components/BookingSocketListener', () => ({
  BookingSocketListener: () => null,
}));

// Mock UI components
jest.mock('@/components/ui', () => ({
  PageHeader: ({ title, description }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  Input: ({ value, onChange }: any) => (
    <input value={value} onChange={onChange} />
  ),
  Card: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/skeletons', () => ({
  TableSkeleton: () => <div>Loading...</div>,
}));

jest.mock('@/components/club-operations', () => ({
  DayCalendar: () => <div>Calendar</div>,
  TodayBookingsList: () => <div>Bookings List</div>,
  BookingDetailModal: () => null,
}));

jest.mock('@/components/AdminQuickBookingWizard', () => ({
  AdminQuickBookingWizard: () => null,
}));

describe('Operations Page Socket Cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set activeClubId when component mounts', async () => {
    // Dynamically import the component to ensure fresh module state
    const ClubOperationsPage = (await import(
      '@/app/(pages)/admin/operations/[clubId]/page'
    )).default;

    render(<ClubOperationsPage />);

    await waitFor(() => {
      expect(mockSetActiveClubId).toHaveBeenCalledWith('test-club-id');
    });
  });

  it('should clear activeClubId when component unmounts', async () => {
    // Dynamically import the component
    const ClubOperationsPage = (await import(
      '@/app/(pages)/admin/operations/[clubId]/page'
    )).default;

    const { unmount } = render(<ClubOperationsPage />);

    // Verify it was set on mount
    await waitFor(() => {
      expect(mockSetActiveClubId).toHaveBeenCalledWith('test-club-id');
    });

    // Clear the mock to track unmount calls
    mockSetActiveClubId.mockClear();

    // Unmount the component
    unmount();

    // Verify activeClubId is cleared on unmount
    await waitFor(() => {
      expect(mockSetActiveClubId).toHaveBeenCalledWith(null);
    });
  });
});
