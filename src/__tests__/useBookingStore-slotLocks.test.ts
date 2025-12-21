/**
 * Tests for useBookingStore slot lock functionality
 */

import { renderHook, act } from '@testing-library/react';
import { useBookingStore } from '@/stores/useBookingStore';
import type { SlotLockedEvent } from '@/types/socket';

describe('useBookingStore - Slot Lock Management', () => {
  beforeEach(() => {
    // Reset store state before each test by clearing all locked slots
    const { result } = renderHook(() => useBookingStore());
    act(() => {
      // Properly clear locked slots by removing each one
      const slotsToRemove = [...result.current.lockedSlots];
      slotsToRemove.forEach(slot => {
        result.current.removeLockedSlot(slot.slotId);
      });
    });
  });

  describe('addLockedSlot', () => {
    it('should add a locked slot to the store', () => {
      const { result } = renderHook(() => useBookingStore());

      const slotEvent: SlotLockedEvent = {
        slotId: 'slot-1',
        courtId: 'court-1',
        clubId: 'club-1',
        userId: 'user-1',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
      };

      act(() => {
        result.current.addLockedSlot(slotEvent);
      });

      expect(result.current.lockedSlots).toHaveLength(1);
      expect(result.current.lockedSlots[0]).toMatchObject({
        slotId: 'slot-1',
        courtId: 'court-1',
        clubId: 'club-1',
        userId: 'user-1',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
      });
      expect(result.current.lockedSlots[0].lockedAt).toBeGreaterThan(0);
    });

    it('should not add duplicate locked slots', () => {
      const { result } = renderHook(() => useBookingStore());

      const slotEvent: SlotLockedEvent = {
        slotId: 'slot-1',
        courtId: 'court-1',
        clubId: 'club-1',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
      };

      act(() => {
        result.current.addLockedSlot(slotEvent);
        result.current.addLockedSlot(slotEvent); // Duplicate
      });

      expect(result.current.lockedSlots).toHaveLength(1);
    });

    it('should allow multiple different locked slots', () => {
      const { result } = renderHook(() => useBookingStore());

      act(() => {
        result.current.addLockedSlot({
          slotId: 'slot-1',
          courtId: 'court-1',
          clubId: 'club-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        });

        result.current.addLockedSlot({
          slotId: 'slot-2',
          courtId: 'court-2',
          clubId: 'club-1',
          startTime: '2024-01-15T11:00:00Z',
          endTime: '2024-01-15T12:00:00Z',
        });
      });

      expect(result.current.lockedSlots).toHaveLength(2);
    });
  });

  describe('removeLockedSlot', () => {
    it('should remove a locked slot from the store', () => {
      const { result } = renderHook(() => useBookingStore());

      act(() => {
        result.current.addLockedSlot({
          slotId: 'slot-1',
          courtId: 'court-1',
          clubId: 'club-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        });
      });

      expect(result.current.lockedSlots).toHaveLength(1);

      act(() => {
        result.current.removeLockedSlot('slot-1');
      });

      expect(result.current.lockedSlots).toHaveLength(0);
    });

    it('should handle removing non-existent slot', () => {
      const { result } = renderHook(() => useBookingStore());

      act(() => {
        result.current.addLockedSlot({
          slotId: 'slot-1',
          courtId: 'court-1',
          clubId: 'club-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        });
      });

      act(() => {
        result.current.removeLockedSlot('non-existent');
      });

      expect(result.current.lockedSlots).toHaveLength(1);
    });
  });

  describe('isSlotLocked', () => {
    it('should return true when slot is locked', () => {
      const { result } = renderHook(() => useBookingStore());

      act(() => {
        result.current.addLockedSlot({
          slotId: 'slot-1',
          courtId: 'court-1',
          clubId: 'club-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        });
      });

      expect(
        result.current.isSlotLocked(
          'court-1',
          '2024-01-15T10:00:00Z',
          '2024-01-15T11:00:00Z'
        )
      ).toBe(true);
    });

    it('should return false when slot is not locked', () => {
      const { result } = renderHook(() => useBookingStore());

      expect(
        result.current.isSlotLocked(
          'court-1',
          '2024-01-15T10:00:00Z',
          '2024-01-15T11:00:00Z'
        )
      ).toBe(false);
    });

    it('should return false for different court', () => {
      const { result } = renderHook(() => useBookingStore());

      act(() => {
        result.current.addLockedSlot({
          slotId: 'slot-1',
          courtId: 'court-1',
          clubId: 'club-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        });
      });

      expect(
        result.current.isSlotLocked(
          'court-2',
          '2024-01-15T10:00:00Z',
          '2024-01-15T11:00:00Z'
        )
      ).toBe(false);
    });
  });

  describe('getLockedSlotsForCourt', () => {
    it('should return locked slots for a specific court', () => {
      const { result } = renderHook(() => useBookingStore());

      act(() => {
        result.current.addLockedSlot({
          slotId: 'slot-1',
          courtId: 'court-1',
          clubId: 'club-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        });

        result.current.addLockedSlot({
          slotId: 'slot-2',
          courtId: 'court-2',
          clubId: 'club-1',
          startTime: '2024-01-15T11:00:00Z',
          endTime: '2024-01-15T12:00:00Z',
        });
      });

      const court1Locks = result.current.getLockedSlotsForCourt('court-1');
      expect(court1Locks).toHaveLength(1);
      expect(court1Locks[0].slotId).toBe('slot-1');
    });

    it('should return empty array for court with no locks', () => {
      const { result } = renderHook(() => useBookingStore());

      const locks = result.current.getLockedSlotsForCourt('court-1');
      expect(locks).toEqual([]);
    });
  });

  describe('cleanupExpiredLocks', () => {
    it('should remove locks older than 5 minutes', () => {
      const { result } = renderHook(() => useBookingStore());

      // Mock Date.now to control time
      const originalNow = Date.now;
      const currentTime = 1000000000000;
      Date.now = jest.fn(() => currentTime);

      act(() => {
        result.current.addLockedSlot({
          slotId: 'slot-1',
          courtId: 'court-1',
          clubId: 'club-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        });
      });

      // Move time forward by 6 minutes (360000 ms)
      Date.now = jest.fn(() => currentTime + 360000);

      act(() => {
        result.current.cleanupExpiredLocks();
      });

      expect(result.current.lockedSlots).toHaveLength(0);

      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should keep locks younger than 5 minutes', () => {
      const { result } = renderHook(() => useBookingStore());

      const originalNow = Date.now;
      const currentTime = 1000000000000;
      Date.now = jest.fn(() => currentTime);

      act(() => {
        result.current.addLockedSlot({
          slotId: 'slot-1',
          courtId: 'court-1',
          clubId: 'club-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
        });
      });

      // Move time forward by 2 minutes (120000 ms)
      Date.now = jest.fn(() => currentTime + 120000);

      act(() => {
        result.current.cleanupExpiredLocks();
      });

      expect(result.current.lockedSlots).toHaveLength(1);

      // Restore original Date.now
      Date.now = originalNow;
    });
  });
});
