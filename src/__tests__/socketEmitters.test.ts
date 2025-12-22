/**
 * Tests for Socket.IO event emitters
 */
import {
  getSocketIO,
  emitBookingCreated,
  emitBookingUpdated,
  emitBookingDeleted,
} from '@/lib/socketEmitters';
import type { BookingCreatedEvent, BookingUpdatedEvent, BookingDeletedEvent } from '@/types/socket';
import { SportType } from '@/constants/sports';

// Mock the global.io with room-based emit
const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({
  emit: mockEmit,
}));
const mockIO = {
  emit: mockEmit,
  to: mockTo,
};

describe('Socket Emitters', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear global.io before each test
    global.io = undefined;
    // Mock console.warn to avoid noise in test output
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('getSocketIO', () => {
    it('should return null when io is not initialized', () => {
      const result = getSocketIO();
      expect(result).toBeNull();
    });

    it('should return io instance when initialized', () => {
      global.io = mockIO as any;
      const result = getSocketIO();
      expect(result).toBe(mockIO);
    });
  });

  describe('emitBookingCreated', () => {
    it('should emit booking_created event to club room when io is available', () => {
      global.io = mockIO as any;

      const event: BookingCreatedEvent = {
        booking: {
          id: 'booking-123',
          userId: 'user-123',
          userName: 'Test User',
          userEmail: 'test@example.com',
          courtId: 'court-123',
          courtName: 'Court 1',
          clubId: 'club-123',
          clubName: 'Test Club',
          start: '2024-01-15T10:00:00Z',
          end: '2024-01-15T11:00:00Z',
          bookingStatus: 'Active',
          paymentStatus: 'Paid',
          price: 100,
          sportType: SportType.TENNIS,
          coachId: null,
          coachName: null,
          createdAt: '2024-01-15T09:00:00Z',
        },
        clubId: 'club-123',
        courtId: 'court-123',
      };

      emitBookingCreated(event);

      // Verify it emits to the club room
      expect(mockTo).toHaveBeenCalledWith('club:club-123');
      // Verify it emits both new and legacy event names
      expect(mockEmit).toHaveBeenCalledWith('booking_created', event);
      expect(mockEmit).toHaveBeenCalledWith('bookingCreated', event);
      // Verify it also emits to root_admin room
      expect(mockTo).toHaveBeenCalledWith('root_admin');
    });

    it('should not throw when io is not available', () => {
      const event: BookingCreatedEvent = {
        booking: {
          id: 'booking-123',
          userId: 'user-123',
          userName: 'Test User',
          userEmail: 'test@example.com',
          courtId: 'court-123',
          courtName: 'Court 1',
          clubId: 'club-123',
          clubName: 'Test Club',
          start: '2024-01-15T10:00:00Z',
          end: '2024-01-15T11:00:00Z',
          bookingStatus: 'Active',
          paymentStatus: 'Paid',
          price: 100,
          sportType: SportType.TENNIS,
          coachId: null,
          coachName: null,
          createdAt: '2024-01-15T09:00:00Z',
        },
        clubId: 'club-123',
        courtId: 'court-123',
      };

      expect(() => emitBookingCreated(event)).not.toThrow();
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('emitBookingUpdated', () => {
    it('should emit booking_updated event to club room when io is available', () => {
      global.io = mockIO as any;

      const event: BookingUpdatedEvent = {
        booking: {
          id: 'booking-123',
          userId: 'user-123',
          userName: 'Test User',
          userEmail: 'test@example.com',
          courtId: 'court-123',
          courtName: 'Court 1',
          clubId: 'club-123',
          clubName: 'Test Club',
          start: '2024-01-15T10:00:00Z',
          end: '2024-01-15T11:00:00Z',
          bookingStatus: 'Cancelled',
          paymentStatus: 'Refunded',
          price: 100,
          sportType: SportType.TENNIS,
          coachId: null,
          coachName: null,
          createdAt: '2024-01-15T09:00:00Z',
        },
        clubId: 'club-123',
        courtId: 'court-123',
        previousStatus: 'confirmed',
      };

      emitBookingUpdated(event);

      // Verify it emits to the club room
      expect(mockTo).toHaveBeenCalledWith('club:club-123');
      // Verify it emits both new and legacy event names
      expect(mockEmit).toHaveBeenCalledWith('booking_updated', event);
      expect(mockEmit).toHaveBeenCalledWith('bookingUpdated', event);
      // Verify it also emits to root_admin room
      expect(mockTo).toHaveBeenCalledWith('root_admin');
    });

    it('should not throw when io is not available', () => {
      const event: BookingUpdatedEvent = {
        booking: {
          id: 'booking-123',
          userId: 'user-123',
          userName: 'Test User',
          userEmail: 'test@example.com',
          courtId: 'court-123',
          courtName: 'Court 1',
          clubId: 'club-123',
          clubName: 'Test Club',
          start: '2024-01-15T10:00:00Z',
          end: '2024-01-15T11:00:00Z',
          bookingStatus: 'Cancelled',
          paymentStatus: 'Refunded',
          price: 100,
          sportType: SportType.TENNIS,
          coachId: null,
          coachName: null,
          createdAt: '2024-01-15T09:00:00Z',
        },
        clubId: 'club-123',
        courtId: 'court-123',
      };

      expect(() => emitBookingUpdated(event)).not.toThrow();
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('emitBookingDeleted', () => {
    it('should emit booking_cancelled event to club room when io is available', () => {
      global.io = mockIO as any;

      const event: BookingDeletedEvent = {
        bookingId: 'booking-123',
        clubId: 'club-123',
        courtId: 'court-123',
      };

      emitBookingDeleted(event);

      // Verify it emits to the club room
      expect(mockTo).toHaveBeenCalledWith('club:club-123');
      // Verify it emits both new and legacy event names
      expect(mockEmit).toHaveBeenCalledWith('booking_cancelled', event);
      expect(mockEmit).toHaveBeenCalledWith('bookingDeleted', event);
      // Verify it also emits to root_admin room
      expect(mockTo).toHaveBeenCalledWith('root_admin');
    });

    it('should not throw when io is not available', () => {
      const event: BookingDeletedEvent = {
        bookingId: 'booking-123',
        clubId: 'club-123',
        courtId: 'court-123',
      };

      expect(() => emitBookingDeleted(event)).not.toThrow();
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });
});
