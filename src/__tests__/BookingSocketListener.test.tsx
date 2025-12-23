/**
 * Tests for Booking Socket Listener
 * 
 * Verifies that the BookingSocketListener:
 * - Registers event handlers for booking and slot events
 * - Filters events by activeClubId
 * - Updates booking store on events
 * - Shows toast notifications
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { BookingSocketListener } from '@/components/BookingSocketListener';
import type {
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
  SlotLockedEvent,
} from '@/types/socket';
import { handleSocketEvent } from '@/utils/globalNotificationManager';

// Mock booking socket context
const mockSocket = {
  id: 'test-booking-socket-id',
  on: jest.fn(),
  off: jest.fn(),
};

const mockActiveClubId = 'club-1';

jest.mock('@/contexts/BookingSocketContext', () => ({
  useBookingSocket: jest.fn(() => ({
    socket: mockSocket,
    isConnected: true,
    activeClubId: mockActiveClubId,
  })),
}));

// Mock booking store
const mockUpdateBookingFromSocket = jest.fn();
const mockRemoveBookingFromSocket = jest.fn();
const mockAddLockedSlot = jest.fn();
const mockRemoveLockedSlot = jest.fn();

jest.mock('@/stores/useBookingStore', () => ({
  useBookingStore: jest.fn((selector) => {
    const mockStore = {
      updateBookingFromSocket: mockUpdateBookingFromSocket,
      removeBookingFromSocket: mockRemoveBookingFromSocket,
      addLockedSlot: mockAddLockedSlot,
      removeLockedSlot: mockRemoveLockedSlot,
    };
    return selector(mockStore);
  }),
}));

// Mock notification manager
jest.mock('@/utils/globalNotificationManager', () => ({
  handleSocketEvent: jest.fn(),
}));

describe('BookingSocketListener', () => {
  let mockHandleSocketEvent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleSocketEvent = handleSocketEvent as jest.Mock;
  });

  it('should register event handlers on mount', async () => {
    render(<BookingSocketListener />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Verify all booking event handlers are registered
    expect(mockSocket.on).toHaveBeenCalledWith('booking_created', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('booking_updated', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('booking_cancelled', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('slot_locked', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('slot_unlocked', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('lock_expired', expect.any(Function));
  });

  it('should handle booking_created event for active club', async () => {
    render(<BookingSocketListener />);

    // Get the registered handler for booking_created
    const bookingCreatedHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'booking_created'
    )?.[1];

    expect(bookingCreatedHandler).toBeDefined();

    // Simulate booking created event
    const event: BookingCreatedEvent = {
      booking: {
        id: 'booking-1',
        clubId: 'club-1',
        courtId: 'court-1',
      } as any,
      clubId: 'club-1',
      courtId: 'court-1',
    };

    bookingCreatedHandler(event);

    // Verify toast notification was shown
    expect(mockHandleSocketEvent).toHaveBeenCalledWith('booking_created', event);

    // Verify booking store was updated
    expect(mockUpdateBookingFromSocket).toHaveBeenCalledWith(event.booking);
  });

  it('should ignore booking_created event for different club', async () => {
    render(<BookingSocketListener />);

    const bookingCreatedHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'booking_created'
    )?.[1];

    // Simulate booking created event for different club
    const event: BookingCreatedEvent = {
      booking: {
        id: 'booking-1',
        clubId: 'club-2',
        courtId: 'court-1',
      } as any,
      clubId: 'club-2',
      courtId: 'court-1',
    };

    bookingCreatedHandler(event);

    // Verify toast notification was NOT shown
    expect(mockHandleSocketEvent).not.toHaveBeenCalled();

    // Verify booking store was NOT updated
    expect(mockUpdateBookingFromSocket).not.toHaveBeenCalled();
  });

  it('should handle booking_updated event for active club', async () => {
    render(<BookingSocketListener />);

    const bookingUpdatedHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'booking_updated'
    )?.[1];

    const event: BookingUpdatedEvent = {
      booking: {
        id: 'booking-1',
        clubId: 'club-1',
        courtId: 'court-1',
      } as any,
      clubId: 'club-1',
      courtId: 'court-1',
    };

    bookingUpdatedHandler(event);

    expect(mockHandleSocketEvent).toHaveBeenCalledWith('booking_updated', event);
    expect(mockUpdateBookingFromSocket).toHaveBeenCalledWith(event.booking);
  });

  it('should handle booking_cancelled event for active club', async () => {
    render(<BookingSocketListener />);

    const bookingCancelledHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'booking_cancelled'
    )?.[1];

    const event: BookingDeletedEvent = {
      bookingId: 'booking-1',
      clubId: 'club-1',
      courtId: 'court-1',
    };

    bookingCancelledHandler(event);

    expect(mockHandleSocketEvent).toHaveBeenCalledWith('booking_cancelled', event);
    expect(mockRemoveBookingFromSocket).toHaveBeenCalledWith('booking-1');
  });

  it('should handle slot_locked event for active club', async () => {
    render(<BookingSocketListener />);

    const slotLockedHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'slot_locked'
    )?.[1];

    const event: SlotLockedEvent = {
      slotId: 'slot-1',
      courtId: 'court-1',
      clubId: 'club-1',
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T11:00:00Z',
    };

    slotLockedHandler(event);

    expect(mockHandleSocketEvent).toHaveBeenCalledWith('slot_locked', event);
    expect(mockAddLockedSlot).toHaveBeenCalledWith(event);
  });

  it('should clean up event handlers on unmount', async () => {
    const { unmount } = render(<BookingSocketListener />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    unmount();

    // Verify all event handlers are removed
    expect(mockSocket.off).toHaveBeenCalledWith('booking_created', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('booking_updated', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('booking_cancelled', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('slot_locked', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('slot_unlocked', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('lock_expired', expect.any(Function));
  });
});
