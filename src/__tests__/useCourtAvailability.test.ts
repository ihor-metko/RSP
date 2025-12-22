/**
 * Tests for useCourtAvailability hook
 * 
 * Tests basic availability management functionality.
 * Note: Real-time WebSocket updates are now only available on the club operations page.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useCourtAvailability } from '@/hooks/useCourtAvailability';

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

  it('should return initial state with refreshKey', () => {
    const clubId = 'club-1';
    const { result } = renderHook(() => useCourtAvailability(clubId));

    expect(result.current.refreshKey).toBe(0);
    expect(result.current.isConnected).toBe(false); // No real-time connection on player pages
    expect(result.current.lockedSlots).toEqual(mockLockedSlots);
    expect(result.current.triggerRefresh).toBeDefined();
  });

  it('should work when clubId is null', () => {
    const { result } = renderHook(() => useCourtAvailability(null));

    expect(result.current.refreshKey).toBe(0);
    expect(result.current.isConnected).toBe(false);
  });

  it('should trigger refresh when triggerRefresh is called', async () => {
    const clubId = 'club-1';
    const onAvailabilityChange = jest.fn();
    
    const { result } = renderHook(() => useCourtAvailability(clubId, onAvailabilityChange));

    const initialRefreshKey = result.current.refreshKey;

    act(() => {
      result.current.triggerRefresh();
    });

    await waitFor(() => {
      expect(result.current.refreshKey).toBe(initialRefreshKey + 1);
      expect(onAvailabilityChange).toHaveBeenCalled();
    });
  });

  it('should call onAvailabilityChange callback when refresh is triggered', async () => {
    const clubId = 'club-1';
    const onAvailabilityChange = jest.fn();
    
    const { result } = renderHook(() => useCourtAvailability(clubId, onAvailabilityChange));

    act(() => {
      result.current.triggerRefresh();
    });

    await waitFor(() => {
      expect(onAvailabilityChange).toHaveBeenCalledTimes(1);
    });
  });

  it('should increment refreshKey on multiple triggers', async () => {
    const clubId = 'club-1';
    
    const { result } = renderHook(() => useCourtAvailability(clubId));

    const initialRefreshKey = result.current.refreshKey;

    act(() => {
      result.current.triggerRefresh();
    });

    await waitFor(() => {
      expect(result.current.refreshKey).toBe(initialRefreshKey + 1);
    });

    act(() => {
      result.current.triggerRefresh();
    });

    await waitFor(() => {
      expect(result.current.refreshKey).toBe(initialRefreshKey + 2);
    });
  });

  it('should always return isConnected as false (no real-time on player pages)', () => {
    const clubId = 'club-1';
    const { result } = renderHook(() => useCourtAvailability(clubId));

    expect(result.current.isConnected).toBe(false);
  });
});
