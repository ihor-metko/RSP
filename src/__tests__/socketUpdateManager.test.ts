/**
 * @jest-environment jsdom
 */
import {
  debounceSocketEvent,
  throttleSocketEvent,
  shouldApplyBookingUpdate,
  updateBookingInList,
  removeBookingFromList,
  mergeBookingLists,
} from '@/utils/socketUpdateManager';
import type { OperationsBooking } from '@/types/booking';

// Mock booking helper
const createMockBooking = (
  id: string,
  updatedAt: string,
  overrides?: Partial<OperationsBooking>
): OperationsBooking => ({
  id,
  userId: 'user-1',
  userName: 'Test User',
  userEmail: 'test@example.com',
  courtId: 'court-1',
  courtName: 'Court 1',
  start: '2024-01-15T10:00:00Z',
  end: '2024-01-15T11:00:00Z',
  bookingStatus: 'Active',
  paymentStatus: 'Paid',
  price: 100,
  sportType: 'PADEL',
  coachId: null,
  coachName: null,
  createdAt: '2024-01-15T09:00:00Z',
  updatedAt,
  ...overrides,
});

describe('socketUpdateManager', () => {
  describe('debounceSocketEvent', () => {
    jest.useFakeTimers();

    it('should debounce rapid consecutive calls', () => {
      const callback = jest.fn();
      const debouncedFn = debounceSocketEvent(callback, 300);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      // Should not have called yet
      expect(callback).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(300);

      // Should have called only once with the last value
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('third');
    });

    it('should call immediately after delay', () => {
      const callback = jest.fn();
      const debouncedFn = debounceSocketEvent(callback, 300);

      debouncedFn('data');
      jest.advanceTimersByTime(300);

      expect(callback).toHaveBeenCalledWith('data');
    });
  });

  describe('throttleSocketEvent', () => {
    jest.useFakeTimers();

    it('should throttle calls within time window', () => {
      const callback = jest.fn();
      const throttledFn = throttleSocketEvent(callback, 1000);

      throttledFn('first');
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');

      // Call again immediately
      throttledFn('second');
      expect(callback).toHaveBeenCalledTimes(1); // Still 1

      // Fast-forward time
      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith('second');
    });
  });

  describe('shouldApplyBookingUpdate', () => {
    it('should apply update if no current booking exists', () => {
      const incomingBooking = createMockBooking('booking-1', '2024-01-15T10:00:00Z');
      expect(shouldApplyBookingUpdate(undefined, incomingBooking)).toBe(true);
    });

    it('should apply update if incoming booking is newer', () => {
      const currentBooking = createMockBooking('booking-1', '2024-01-15T10:00:00Z');
      const incomingBooking = createMockBooking('booking-1', '2024-01-15T10:01:00Z');
      expect(shouldApplyBookingUpdate(currentBooking, incomingBooking)).toBe(true);
    });

    it('should not apply update if incoming booking is older', () => {
      const currentBooking = createMockBooking('booking-1', '2024-01-15T10:01:00Z');
      const incomingBooking = createMockBooking('booking-1', '2024-01-15T10:00:00Z');
      expect(shouldApplyBookingUpdate(currentBooking, incomingBooking)).toBe(false);
    });

    it('should not apply update if timestamps are equal', () => {
      const currentBooking = createMockBooking('booking-1', '2024-01-15T10:00:00Z');
      const incomingBooking = createMockBooking('booking-1', '2024-01-15T10:00:00Z');
      expect(shouldApplyBookingUpdate(currentBooking, incomingBooking)).toBe(false);
    });
  });

  describe('updateBookingInList', () => {
    it('should update existing booking with newer data', () => {
      const bookings = [
        createMockBooking('booking-1', '2024-01-15T10:00:00Z'),
        createMockBooking('booking-2', '2024-01-15T10:00:00Z'),
      ];
      const updatedBooking = createMockBooking('booking-1', '2024-01-15T10:01:00Z', {
        bookingStatus: 'Cancelled',
      });

      const result = updateBookingInList(bookings, updatedBooking);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('booking-1');
      expect(result[0].bookingStatus).toBe('Cancelled');
      expect(result[0].updatedAt).toBe('2024-01-15T10:01:00Z');
    });

    it('should not update booking if incoming data is older', () => {
      const bookings = [
        createMockBooking('booking-1', '2024-01-15T10:01:00Z'),
      ];
      const olderBooking = createMockBooking('booking-1', '2024-01-15T10:00:00Z', {
        bookingStatus: 'Cancelled',
      });

      const result = updateBookingInList(bookings, olderBooking);

      expect(result).toBe(bookings); // Same reference, unchanged
      expect(result[0].bookingStatus).toBe('Active'); // Original status preserved
    });

    it('should add new booking if not in list', () => {
      const bookings = [
        createMockBooking('booking-1', '2024-01-15T10:00:00Z'),
      ];
      const newBooking = createMockBooking('booking-2', '2024-01-15T10:00:00Z');

      const result = updateBookingInList(bookings, newBooking);

      expect(result).toHaveLength(2);
      expect(result[1].id).toBe('booking-2');
    });
  });

  describe('removeBookingFromList', () => {
    it('should remove booking from list', () => {
      const bookings = [
        createMockBooking('booking-1', '2024-01-15T10:00:00Z'),
        createMockBooking('booking-2', '2024-01-15T10:00:00Z'),
      ];

      const result = removeBookingFromList(bookings, 'booking-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('booking-2');
    });

    it('should return unchanged list if booking not found', () => {
      const bookings = [
        createMockBooking('booking-1', '2024-01-15T10:00:00Z'),
      ];

      const result = removeBookingFromList(bookings, 'booking-999');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('booking-1');
    });
  });

  describe('mergeBookingLists', () => {
    it('should merge lists keeping newest versions', () => {
      const currentBookings = [
        createMockBooking('booking-1', '2024-01-15T10:00:00Z'),
        createMockBooking('booking-2', '2024-01-15T10:00:00Z'),
      ];
      const incomingBookings = [
        createMockBooking('booking-1', '2024-01-15T10:01:00Z', { bookingStatus: 'Cancelled' }),
        createMockBooking('booking-3', '2024-01-15T10:00:00Z'),
      ];

      const result = mergeBookingLists(currentBookings, incomingBookings);

      expect(result).toHaveLength(3);
      
      // booking-1 should be updated
      const booking1 = result.find(b => b.id === 'booking-1');
      expect(booking1?.bookingStatus).toBe('Cancelled');
      expect(booking1?.updatedAt).toBe('2024-01-15T10:01:00Z');

      // booking-2 should remain unchanged
      const booking2 = result.find(b => b.id === 'booking-2');
      expect(booking2?.updatedAt).toBe('2024-01-15T10:00:00Z');

      // booking-3 should be added
      const booking3 = result.find(b => b.id === 'booking-3');
      expect(booking3).toBeDefined();
    });

    it('should not overwrite with older data', () => {
      const currentBookings = [
        createMockBooking('booking-1', '2024-01-15T10:01:00Z', { bookingStatus: 'Cancelled' }),
      ];
      const incomingBookings = [
        createMockBooking('booking-1', '2024-01-15T10:00:00Z', { bookingStatus: 'Active' }),
      ];

      const result = mergeBookingLists(currentBookings, incomingBookings);

      expect(result).toHaveLength(1);
      expect(result[0].bookingStatus).toBe('Cancelled');
      expect(result[0].updatedAt).toBe('2024-01-15T10:01:00Z');
    });
  });
});
