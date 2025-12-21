/**
 * Unit tests for notification transformation functions
 * 
 * Tests the transformation of Booking and Payment events into AdminNotification format
 * for the unified notification system.
 */

import {
  transformBookingCreated,
  transformBookingUpdated,
  transformBookingCancelled,
  transformPaymentConfirmed,
  transformPaymentFailed,
} from '@/utils/globalNotificationManager';
import type {
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
  PaymentConfirmedEvent,
  PaymentFailedEvent,
} from '@/types/socket';
import type { OperationsBooking } from '@/types/booking';

describe('Notification Transformation Functions', () => {
  describe('transformBookingCreated', () => {
    it('should transform BookingCreatedEvent to AdminNotification', () => {
      const mockBooking: OperationsBooking = {
        id: 'booking-123',
        userId: 'user-456',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        courtId: 'court-789',
        courtName: 'Court A',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        bookingStatus: 'Active',
        paymentStatus: 'Paid',
        price: 50,
        sportType: 'tennis',
        coachId: null,
        coachName: null,
        createdAt: '2024-01-14T10:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z',
      };

      const event: BookingCreatedEvent = {
        booking: mockBooking,
        clubId: 'club-101',
        courtId: 'court-789',
      };

      const notification = transformBookingCreated(event);

      expect(notification.type).toBe('BOOKING_CREATED');
      expect(notification.playerId).toBe('user-456');
      expect(notification.playerName).toBe('John Doe');
      expect(notification.playerEmail).toBe('john@example.com');
      expect(notification.bookingId).toBe('booking-123');
      expect(notification.courtInfo).toBe('Court A');
      expect(notification.sessionDate).toBe('2024-01-15T10:00:00Z');
      expect(notification.summary).toContain('New booking created');
      expect(notification.summary).toContain('John Doe');
      expect(notification.summary).toContain('Court A');
      expect(notification.read).toBe(false);
      expect(notification.id).toContain('booking_created-booking-123');
    });

    it('should handle booking without userName', () => {
      const mockBooking: OperationsBooking = {
        id: 'booking-123',
        userId: 'user-456',
        userName: null,
        userEmail: 'user@example.com',
        courtId: 'court-789',
        courtName: 'Court B',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        bookingStatus: 'Active',
        paymentStatus: 'Paid',
        price: 50,
        sportType: 'tennis',
        coachId: null,
        coachName: null,
        createdAt: '2024-01-14T10:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z',
      };

      const event: BookingCreatedEvent = {
        booking: mockBooking,
        clubId: 'club-101',
        courtId: 'court-789',
      };

      const notification = transformBookingCreated(event);

      expect(notification.playerName).toBeFalsy();
      expect(notification.summary).toContain('user@example.com');
    });

    it('should handle booking without courtName', () => {
      const mockBooking: OperationsBooking = {
        id: 'booking-123',
        userId: 'user-456',
        userName: 'Jane Doe',
        userEmail: 'jane@example.com',
        courtId: 'court-789',
        courtName: '',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        bookingStatus: 'Active',
        paymentStatus: 'Paid',
        price: 50,
        sportType: 'tennis',
        coachId: null,
        coachName: null,
        createdAt: '2024-01-14T10:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z',
      };

      const event: BookingCreatedEvent = {
        booking: mockBooking,
        clubId: 'club-101',
        courtId: 'court-789',
      };

      const notification = transformBookingCreated(event);

      expect(notification.courtInfo).toBe('Court court-789');
    });
  });

  describe('transformBookingUpdated', () => {
    it('should transform BookingUpdatedEvent to AdminNotification', () => {
      const mockBooking: OperationsBooking = {
        id: 'booking-123',
        userId: 'user-456',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        courtId: 'court-789',
        courtName: 'Court A',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        bookingStatus: 'Active',
        paymentStatus: 'Paid',
        price: 50,
        sportType: 'tennis',
        coachId: null,
        coachName: null,
        createdAt: '2024-01-14T10:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z',
      };

      const event: BookingUpdatedEvent = {
        booking: mockBooking,
        clubId: 'club-101',
        courtId: 'court-789',
        previousStatus: 'Pending',
      };

      const notification = transformBookingUpdated(event);

      expect(notification.type).toBe('BOOKING_UPDATED');
      expect(notification.bookingId).toBe('booking-123');
      expect(notification.summary).toContain('Booking updated');
      expect(notification.summary).toContain('Pending → Active');
      expect(notification.read).toBe(false);
    });

    it('should handle update without previousStatus', () => {
      const mockBooking: OperationsBooking = {
        id: 'booking-123',
        userId: 'user-456',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        courtId: 'court-789',
        courtName: 'Court A',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        bookingStatus: 'Active',
        paymentStatus: 'Paid',
        price: 50,
        sportType: 'tennis',
        coachId: null,
        coachName: null,
        createdAt: '2024-01-14T10:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z',
      };

      const event: BookingUpdatedEvent = {
        booking: mockBooking,
        clubId: 'club-101',
        courtId: 'court-789',
      };

      const notification = transformBookingUpdated(event);

      expect(notification.summary).toBe('Booking updated for Court A');
      expect(notification.summary).not.toContain('→');
    });
  });

  describe('transformBookingCancelled', () => {
    it('should transform BookingDeletedEvent to AdminNotification', () => {
      const event: BookingDeletedEvent = {
        bookingId: 'booking-123',
        clubId: 'club-101',
        courtId: 'court-789',
      };

      const notification = transformBookingCancelled(event);

      expect(notification.type).toBe('BOOKING_CANCELLED');
      expect(notification.bookingId).toBe('booking-123');
      expect(notification.courtInfo).toBe('Court court-789');
      expect(notification.summary).toContain('Booking cancelled');
      expect(notification.playerId).toBe('');
      expect(notification.read).toBe(false);
    });
  });

  describe('transformPaymentConfirmed', () => {
    it('should transform PaymentConfirmedEvent to AdminNotification', () => {
      const event: PaymentConfirmedEvent = {
        paymentId: 'payment-123',
        bookingId: 'booking-456',
        amount: 75.50,
        currency: 'USD',
        clubId: 'club-101',
      };

      const notification = transformPaymentConfirmed(event);

      expect(notification.type).toBe('PAYMENT_CONFIRMED');
      expect(notification.paymentId).toBe('payment-123');
      expect(notification.bookingId).toBe('booking-456');
      expect(notification.amount).toBe(75.50);
      expect(notification.currency).toBe('USD');
      expect(notification.summary).toBe('Payment confirmed: USD 75.5');
      expect(notification.read).toBe(false);
    });
  });

  describe('transformPaymentFailed', () => {
    it('should transform PaymentFailedEvent to AdminNotification', () => {
      const event: PaymentFailedEvent = {
        paymentId: 'payment-123',
        bookingId: 'booking-456',
        reason: 'Insufficient funds',
        clubId: 'club-101',
      };

      const notification = transformPaymentFailed(event);

      expect(notification.type).toBe('PAYMENT_FAILED');
      expect(notification.paymentId).toBe('payment-123');
      expect(notification.bookingId).toBe('booking-456');
      expect(notification.paymentReason).toBe('Insufficient funds');
      expect(notification.summary).toBe('Payment failed: Insufficient funds');
      expect(notification.read).toBe(false);
    });
  });

  describe('Notification ID generation', () => {
    it('should generate unique IDs for different events', async () => {
      const mockBooking: OperationsBooking = {
        id: 'booking-123',
        userId: 'user-456',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        courtId: 'court-789',
        courtName: 'Court A',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        bookingStatus: 'Active',
        paymentStatus: 'Paid',
        price: 50,
        sportType: 'tennis',
        coachId: null,
        coachName: null,
        createdAt: '2024-01-14T10:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z',
      };

      const event: BookingCreatedEvent = {
        booking: mockBooking,
        clubId: 'club-101',
        courtId: 'court-789',
      };

      const notification1 = transformBookingCreated(event);
      
      // Wait a bit to ensure timestamp is different
      await new Promise(resolve => setTimeout(resolve, 2));
      
      const notification2 = transformBookingCreated(event);

      // IDs should be different due to timestamp
      expect(notification1.id).not.toBe(notification2.id);
      expect(notification1.id).toContain('booking_created-booking-123');
      expect(notification2.id).toContain('booking_created-booking-123');
    });
  });

  describe('Timestamp generation', () => {
    it('should generate current timestamp for createdAt', () => {
      const mockBooking: OperationsBooking = {
        id: 'booking-123',
        userId: 'user-456',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        courtId: 'court-789',
        courtName: 'Court A',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        bookingStatus: 'Active',
        paymentStatus: 'Paid',
        price: 50,
        sportType: 'tennis',
        coachId: null,
        coachName: null,
        createdAt: '2024-01-14T10:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z',
      };

      const event: BookingCreatedEvent = {
        booking: mockBooking,
        clubId: 'club-101',
        courtId: 'court-789',
      };

      const beforeTime = new Date();
      const notification = transformBookingCreated(event);
      const afterTime = new Date();

      const notificationTime = new Date(notification.createdAt);
      
      expect(notificationTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(notificationTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});
