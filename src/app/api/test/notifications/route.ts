/**
 * Test API endpoint to trigger Socket.IO notifications
 * Use this to manually test the global notification system
 *
 * GET /api/test/notifications?event=<event_type>
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  emitBookingCreated,
  emitBookingUpdated,
  emitBookingDeleted,
  emitSlotLocked,
  emitSlotUnlocked,
  emitLockExpired,
  emitPaymentConfirmed,
  emitPaymentFailed,
} from '@/lib/socketEmitters';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const event = searchParams.get('event');

  if (!event) {
    return NextResponse.json(
      { error: 'Missing event parameter. Use ?event=<event_type>' },
      { status: 400 }
    );
  }

  try {
    switch (event) {
      case 'booking_created':
        emitBookingCreated({
          booking: {
            id: `test-booking-${Date.now()}`,
            bookingStatus: 'CONFIRMED',
          } as never,
          clubId: 'test-club',
          courtId: 'test-court',
        });
        break;

      case 'booking_updated':
        emitBookingUpdated({
          booking: {
            id: `test-booking-${Date.now()}`,
            bookingStatus: 'CONFIRMED',
          } as never,
          clubId: 'test-club',
          courtId: 'test-court',
        });
        break;

      case 'booking_cancelled':
        emitBookingDeleted({
          bookingId: `test-booking-${Date.now()}`,
          clubId: 'test-club',
          courtId: 'test-court',
        });
        break;

      case 'slot_locked':
        emitSlotLocked({
          slotId: `test-slot-${Date.now()}`,
          courtId: 'test-court',
          clubId: 'test-club',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
        });
        break;

      case 'slot_unlocked':
        emitSlotUnlocked({
          slotId: `test-slot-${Date.now()}`,
          courtId: 'test-court',
          clubId: 'test-club',
        });
        break;

      case 'lock_expired':
        emitLockExpired({
          slotId: `test-slot-${Date.now()}`,
          courtId: 'test-court',
          clubId: 'test-club',
        });
        break;

      case 'payment_confirmed':
        emitPaymentConfirmed({
          paymentId: `test-payment-${Date.now()}`,
          bookingId: 'test-booking',
          amount: 50.0,
          currency: 'UAH',
          clubId: 'test-club',
        });
        break;

      case 'payment_failed':
        emitPaymentFailed({
          paymentId: `test-payment-${Date.now()}`,
          bookingId: 'test-booking',
          reason: 'Insufficient funds',
          clubId: 'test-club',
        });
        break;

      default:
        return NextResponse.json(
          {
            error: `Unknown event type: ${event}`,
            availableEvents: [
              'booking_created',
              'booking_updated',
              'booking_cancelled',
              'slot_locked',
              'slot_unlocked',
              'lock_expired',
              'payment_confirmed',
              'payment_failed',
            ],
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Event ${event} emitted successfully`,
    });
  } catch (error) {
    console.error('Error emitting test event:', error);
    return NextResponse.json(
      { error: 'Failed to emit event' },
      { status: 500 }
    );
  }
}
