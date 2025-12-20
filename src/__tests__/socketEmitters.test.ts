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

// Mock the global.io
const mockEmit = jest.fn();
const mockIO = {
  emit: mockEmit,
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
    it('should emit bookingCreated event when io is available', () => {
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
          bookingStatus: 'confirmed',
          paymentStatus: 'paid',
          price: 100,
          sportType: 'tennis',
          coachId: null,
          coachName: null,
          createdAt: '2024-01-15T09:00:00Z',
        },
        clubId: 'club-123',
        courtId: 'court-123',
      };

      emitBookingCreated(event);

      expect(mockEmit).toHaveBeenCalledWith('bookingCreated', event);
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
          bookingStatus: 'confirmed',
          paymentStatus: 'paid',
          price: 100,
          sportType: 'tennis',
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
    it('should emit bookingUpdated event when io is available', () => {
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
          bookingStatus: 'cancelled',
          paymentStatus: 'refunded',
          price: 100,
          sportType: 'tennis',
          coachId: null,
          coachName: null,
          createdAt: '2024-01-15T09:00:00Z',
        },
        clubId: 'club-123',
        courtId: 'court-123',
        previousStatus: 'confirmed',
      };

      emitBookingUpdated(event);

      expect(mockEmit).toHaveBeenCalledWith('bookingUpdated', event);
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
          bookingStatus: 'cancelled',
          paymentStatus: 'refunded',
          price: 100,
          sportType: 'tennis',
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
    it('should emit bookingDeleted event when io is available', () => {
      global.io = mockIO as any;

      const event: BookingDeletedEvent = {
        bookingId: 'booking-123',
        clubId: 'club-123',
        courtId: 'court-123',
      };

      emitBookingDeleted(event);

      expect(mockEmit).toHaveBeenCalledWith('bookingDeleted', event);
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
