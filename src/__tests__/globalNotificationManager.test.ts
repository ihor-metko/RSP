/**
 * Unit tests for Global Notification Manager
 */

import { 
  getNotificationManager, 
  handleSocketEvent,
  cleanupNotificationManager 
} from '@/utils/globalNotificationManager';
import { showToast } from '@/lib/toast';
import type {
  BookingCreatedEvent,
  PaymentConfirmedEvent,
  PaymentFailedEvent,
  SlotLockedEvent,
} from '@/types/socket';

// Mock the toast library
jest.mock('@/lib/toast', () => ({
  showToast: jest.fn(),
}));

describe('Global Notification Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanupNotificationManager();
  });

  afterEach(() => {
    cleanupNotificationManager();
  });

  describe('Event Handling', () => {
    it('should show info toast for booking_created event', () => {
      const event: BookingCreatedEvent = {
        booking: {
          id: 'booking-1',
          bookingStatus: 'CONFIRMED',
        } as BookingCreatedEvent['booking'],
        clubId: 'club-1',
        courtId: 'court-1',
      };

      handleSocketEvent('booking_created', event);

      expect(showToast).toHaveBeenCalledWith(
        '📅 New booking created',
        { type: 'info', duration: 6000 }
      );
    });

    it('should show success toast for payment_confirmed event', () => {
      const event: PaymentConfirmedEvent = {
        paymentId: 'payment-1',
        bookingId: 'booking-1',
        amount: 50.0,
        currency: 'USD',
        clubId: 'club-1',
      };

      handleSocketEvent('payment_confirmed', event);

      expect(showToast).toHaveBeenCalledWith(
        '✅ Payment confirmed: USD 50',
        { type: 'success', duration: 6000 }
      );
    });

    it('should show error toast for payment_failed event', () => {
      const event: PaymentFailedEvent = {
        paymentId: 'payment-1',
        bookingId: 'booking-1',
        reason: 'Insufficient funds',
        clubId: 'club-1',
      };

      handleSocketEvent('payment_failed', event);

      expect(showToast).toHaveBeenCalledWith(
        '💳 Payment failed: Insufficient funds',
        { type: 'error', duration: 6000 }
      );
    });

    it('should show info toast for slot_locked event', () => {
      const event: SlotLockedEvent = {
        slotId: 'slot-1',
        courtId: 'court-1',
        clubId: 'club-1',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
      };

      handleSocketEvent('slot_locked', event);

      expect(showToast).toHaveBeenCalledWith(
        '🔒 Court slot locked',
        { type: 'info', duration: 6000 }
      );
    });
  });

  describe('Duplicate Prevention', () => {
    it('should prevent duplicate notifications for the same event', () => {
      const event: BookingCreatedEvent = {
        booking: {
          id: 'booking-1',
          bookingStatus: 'CONFIRMED',
        } as BookingCreatedEvent['booking'],
        clubId: 'club-1',
        courtId: 'court-1',
      };

      // First call should show toast
      handleSocketEvent('booking_created', event);
      expect(showToast).toHaveBeenCalledTimes(1);

      // Second call with same event should be ignored
      handleSocketEvent('booking_created', event);
      expect(showToast).toHaveBeenCalledTimes(1);
    });

    it('should allow duplicate after timeout window', (done) => {
      const event: BookingCreatedEvent = {
        booking: {
          id: 'booking-1',
          bookingStatus: 'CONFIRMED',
        } as BookingCreatedEvent['booking'],
        clubId: 'club-1',
        courtId: 'court-1',
      };

      // First call
      handleSocketEvent('booking_created', event);
      expect(showToast).toHaveBeenCalledTimes(1);

      // Wait for duplicate window to expire (5 seconds + buffer)
      setTimeout(() => {
        handleSocketEvent('booking_created', event);
        expect(showToast).toHaveBeenCalledTimes(2);
        done();
      }, 5100);
    }, 6000);
  });

  describe('Manager Singleton', () => {
    it('should return the same manager instance', () => {
      const manager1 = getNotificationManager();
      const manager2 = getNotificationManager();
      expect(manager1).toBe(manager2);
    });

    it('should cleanup and create new instance after cleanup', () => {
      const manager1 = getNotificationManager();
      cleanupNotificationManager();
      const manager2 = getNotificationManager();
      expect(manager1).not.toBe(manager2);
    });
  });
});
