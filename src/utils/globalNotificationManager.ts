/**
 * Global Real-Time Notification Manager
 * 
 * Manages display of real-time Socket.IO event notifications as toast messages.
 * Also provides transformation utilities to convert Booking/Payment events
 * into AdminNotification format for the unified notification system.
 * 
 * Features:
 * - Event-to-toast-type mapping
 * - Duplicate event prevention
 * - Multi-toast queue support
 * - Auto-dismiss after 6 seconds
 * - Event transformation for notification store integration
 */

import { showToast, type ToastType } from '@/lib/toast';
import type {
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
  SlotLockedEvent,
  SlotUnlockedEvent,
  LockExpiredEvent,
  PaymentConfirmedEvent,
  PaymentFailedEvent,
  AdminNotificationEvent,
} from '@/types/socket';

/**
 * Socket event types
 */
export type SocketEventType =
  | 'booking_created'
  | 'booking_updated'
  | 'booking_cancelled'
  | 'slot_locked'
  | 'slot_unlocked'
  | 'lock_expired'
  | 'payment_confirmed'
  | 'payment_failed';

/**
 * Union type of all event data
 */
type SocketEventData =
  | BookingCreatedEvent
  | BookingUpdatedEvent
  | BookingDeletedEvent
  | SlotLockedEvent
  | SlotUnlockedEvent
  | LockExpiredEvent
  | PaymentConfirmedEvent
  | PaymentFailedEvent;

/**
 * Event type to toast type mapping
 */
const EVENT_TO_TOAST_TYPE: Record<SocketEventType, ToastType> = {
  booking_created: 'info',
  booking_updated: 'info',
  booking_cancelled: 'info',
  slot_locked: 'info',
  slot_unlocked: 'info',
  lock_expired: 'info',
  payment_confirmed: 'success',
  payment_failed: 'error',
};

/**
 * Default toast duration (6 seconds)
 */
const DEFAULT_DURATION = 6000;

/**
 * Generate user-friendly message for each event type
 */
function getEventMessage(eventType: SocketEventType, data: SocketEventData): string {
  switch (eventType) {
    case 'booking_created':
      return '📅 New booking created';
    
    case 'booking_updated':
      return '🔄 Booking updated';
    
    case 'booking_cancelled':
      return '❌ Booking cancelled';
    
    case 'slot_locked':
      return '🔒 Court slot locked';
    
    case 'slot_unlocked':
      return '🔓 Court slot unlocked';
    
    case 'lock_expired':
      return '⏰ Slot lock expired';
    
    case 'payment_confirmed': {
      const paymentData = data as PaymentConfirmedEvent;
      return `✅ Payment confirmed: ${paymentData.currency} ${paymentData.amount}`;
    }
    
    case 'payment_failed': {
      const paymentData = data as PaymentFailedEvent;
      return `💳 Payment failed: ${paymentData.reason}`;
    }
    
    default:
      return '🔔 Notification received';
  }
}

/**
 * Generate unique event ID for duplicate detection
 */
function getEventId(eventType: SocketEventType, data: SocketEventData): string {
  switch (eventType) {
    case 'booking_created':
    case 'booking_updated':
      return `${eventType}:${(data as BookingCreatedEvent | BookingUpdatedEvent).booking.id}`;
    
    case 'booking_cancelled':
      return `${eventType}:${(data as BookingDeletedEvent).bookingId}`;
    
    case 'slot_locked':
    case 'slot_unlocked':
    case 'lock_expired':
      return `${eventType}:${(data as SlotLockedEvent | SlotUnlockedEvent | LockExpiredEvent).slotId}`;
    
    case 'payment_confirmed':
    case 'payment_failed':
      return `${eventType}:${(data as PaymentConfirmedEvent | PaymentFailedEvent).paymentId}`;
    
    default:
      return `${eventType}:${Date.now()}`;
  }
}

/**
 * Global Notification Manager Class
 */
class GlobalNotificationManager {
  private recentEventIds: Set<string> = new Set();
  private eventIdTimeout: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Time window for duplicate detection (5 seconds)
   */
  private readonly DUPLICATE_WINDOW = 5000;

  /**
   * Handle a socket event and show appropriate toast notification
   */
  public handleEvent(eventType: SocketEventType, data: SocketEventData): void {
    const eventId = getEventId(eventType, data);
    
    // Prevent duplicate notifications
    if (this.recentEventIds.has(eventId)) {
      console.log(`[GlobalNotificationManager] Duplicate event ignored: ${eventId}`);
      return;
    }

    // Mark event as seen
    this.recentEventIds.add(eventId);
    
    // Clear from recent events after duplicate window
    const timeout = setTimeout(() => {
      this.recentEventIds.delete(eventId);
      this.eventIdTimeout.delete(eventId);
    }, this.DUPLICATE_WINDOW);
    
    this.eventIdTimeout.set(eventId, timeout);

    // Get toast configuration
    const toastType = EVENT_TO_TOAST_TYPE[eventType];
    const message = getEventMessage(eventType, data);

    // Show toast notification
    showToast(message, {
      type: toastType,
      duration: DEFAULT_DURATION,
    });

    console.log(`[GlobalNotificationManager] Toast shown: ${eventType} - ${message}`);
  }

  /**
   * Clean up all timeouts
   */
  public cleanup(): void {
    this.eventIdTimeout.forEach((timeout) => clearTimeout(timeout));
    this.eventIdTimeout.clear();
    this.recentEventIds.clear();
  }
}

// Singleton instance
let managerInstance: GlobalNotificationManager | null = null;

/**
 * Get the global notification manager instance
 */
export function getNotificationManager(): GlobalNotificationManager {
  if (!managerInstance) {
    managerInstance = new GlobalNotificationManager();
  }
  return managerInstance;
}

/**
 * Handle a socket event (convenience function)
 */
export function handleSocketEvent(eventType: SocketEventType, data: SocketEventData): void {
  const manager = getNotificationManager();
  manager.handleEvent(eventType, data);
}

/**
 * Cleanup notification manager (for unmount)
 */
export function cleanupNotificationManager(): void {
  if (managerInstance) {
    managerInstance.cleanup();
    managerInstance = null;
  }
}

/**
 * =============================================================================
 * Event Transformation Functions
 * =============================================================================
 * 
 * These functions transform Booking and Payment WebSocket events into 
 * AdminNotification format so they can be stored in the notification store
 * and displayed in the notification UI components.
 * 
 * This enables a unified notification system where all admin-relevant events
 * (Training requests, Bookings, Payments) flow through the same UI components.
 */

/**
 * Generate a unique notification ID for an event
 */
function generateNotificationId(eventType: string, eventId: string): string {
  return `${eventType}-${eventId}-${Date.now()}`;
}

/**
 * Transform BookingCreatedEvent to AdminNotification
 */
export function transformBookingCreated(event: BookingCreatedEvent): AdminNotificationEvent {
  const { booking, courtId } = event;
  
  const courtInfo = booking.courtName || `Court ${courtId}`;
  const playerInfo = booking.userName || booking.userEmail;
  
  return {
    id: generateNotificationId('booking_created', booking.id),
    type: 'BOOKING_CREATED',
    playerId: booking.userId,
    playerName: booking.userName ?? undefined,
    playerEmail: booking.userEmail,
    coachId: booking.coachId || '',
    coachName: booking.coachName ?? undefined,
    trainingRequestId: null,
    bookingId: booking.id,
    sessionDate: booking.start,
    sessionTime: new Date(booking.start).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    }),
    courtInfo: courtInfo,
    summary: `New booking created by ${playerInfo} for ${courtInfo}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Transform BookingUpdatedEvent to AdminNotification
 */
export function transformBookingUpdated(event: BookingUpdatedEvent): AdminNotificationEvent {
  const { booking, courtId, previousStatus } = event;
  
  const courtInfo = booking.courtName || `Court ${courtId}`;
  const statusChange = previousStatus 
    ? ` (${previousStatus} → ${booking.bookingStatus})`
    : '';
  
  return {
    id: generateNotificationId('booking_updated', booking.id),
    type: 'BOOKING_UPDATED',
    playerId: booking.userId,
    playerName: booking.userName ?? undefined,
    playerEmail: booking.userEmail,
    coachId: booking.coachId || '',
    coachName: booking.coachName ?? undefined,
    trainingRequestId: null,
    bookingId: booking.id,
    sessionDate: booking.start,
    sessionTime: new Date(booking.start).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    }),
    courtInfo: courtInfo,
    summary: `Booking updated${statusChange} for ${courtInfo}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Transform BookingDeletedEvent to AdminNotification
 */
export function transformBookingCancelled(event: BookingDeletedEvent): AdminNotificationEvent {
  const { bookingId, courtId } = event;
  
  return {
    id: generateNotificationId('booking_cancelled', bookingId),
    type: 'BOOKING_CANCELLED',
    playerId: '',
    playerEmail: null,
    coachId: '',
    trainingRequestId: null,
    bookingId: bookingId,
    sessionDate: null,
    sessionTime: null,
    courtInfo: `Court ${courtId}`,
    summary: `Booking cancelled for Court ${courtId}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Transform PaymentConfirmedEvent to AdminNotification
 */
export function transformPaymentConfirmed(event: PaymentConfirmedEvent): AdminNotificationEvent {
  const { paymentId, bookingId, amount, currency } = event;
  
  return {
    id: generateNotificationId('payment_confirmed', paymentId),
    type: 'PAYMENT_CONFIRMED',
    playerId: '',
    playerEmail: null,
    coachId: '',
    trainingRequestId: null,
    bookingId: bookingId,
    sessionDate: null,
    sessionTime: null,
    courtInfo: null,
    summary: `Payment confirmed: ${currency} ${amount}`,
    read: false,
    createdAt: new Date().toISOString(),
    paymentId: paymentId,
    amount: amount,
    currency: currency,
  };
}

/**
 * Transform PaymentFailedEvent to AdminNotification
 */
export function transformPaymentFailed(event: PaymentFailedEvent): AdminNotificationEvent {
  const { paymentId, bookingId, reason } = event;
  
  return {
    id: generateNotificationId('payment_failed', paymentId),
    type: 'PAYMENT_FAILED',
    playerId: '',
    playerEmail: null,
    coachId: '',
    trainingRequestId: null,
    bookingId: bookingId,
    sessionDate: null,
    sessionTime: null,
    courtInfo: null,
    summary: `Payment failed: ${reason}`,
    read: false,
    createdAt: new Date().toISOString(),
    paymentId: paymentId,
    paymentReason: reason,
  };
}
