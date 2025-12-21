/**
 * Integration tests for Global Socket Listener
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { GlobalSocketListener } from '@/components/GlobalSocketListener';
import { handleSocketEvent } from '@/utils/globalNotificationManager';

// Mock the notification manager
jest.mock('@/utils/globalNotificationManager', () => ({
  handleSocketEvent: jest.fn(),
  cleanupNotificationManager: jest.fn(),
}));

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  id: 'test-socket-id',
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

describe('GlobalSocketListener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize socket connection on mount', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { io } = require('socket.io-client');
    
    render(<GlobalSocketListener />);

    expect(io).toHaveBeenCalledWith({
      path: '/socket.io',
    });
  });

  it('should register all event listeners', () => {
    render(<GlobalSocketListener />);

    // Check that all required events are registered
    const registeredEvents = mockSocket.on.mock.calls.map(call => call[0]);
    
    expect(registeredEvents).toContain('connect');
    expect(registeredEvents).toContain('disconnect');
    expect(registeredEvents).toContain('connect_error');
    expect(registeredEvents).toContain('booking_created');
    expect(registeredEvents).toContain('booking_updated');
    expect(registeredEvents).toContain('booking_cancelled');
    expect(registeredEvents).toContain('slot_locked');
    expect(registeredEvents).toContain('slot_unlocked');
    expect(registeredEvents).toContain('lock_expired');
    expect(registeredEvents).toContain('payment_confirmed');
    expect(registeredEvents).toContain('payment_failed');
    
    // Legacy events
    expect(registeredEvents).toContain('bookingCreated');
    expect(registeredEvents).toContain('bookingUpdated');
    expect(registeredEvents).toContain('bookingDeleted');
  });

  it('should handle booking_created event', async () => {
    render(<GlobalSocketListener />);

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'booking_created'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      booking: { id: 'booking-1', bookingStatus: 'CONFIRMED' },
      clubId: 'club-1',
      courtId: 'court-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      expect(handleSocketEvent).toHaveBeenCalledWith('booking_created', eventData);
    });
  });

  it('should handle payment_confirmed event', async () => {
    render(<GlobalSocketListener />);

    const eventHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'payment_confirmed'
    )?.[1];

    expect(eventHandler).toBeDefined();

    const eventData = {
      paymentId: 'payment-1',
      bookingId: 'booking-1',
      amount: 100,
      currency: 'USD',
      clubId: 'club-1',
    };

    eventHandler(eventData);

    await waitFor(() => {
      expect(handleSocketEvent).toHaveBeenCalledWith('payment_confirmed', eventData);
    });
  });

  it('should cleanup on unmount', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cleanupNotificationManager } = require('@/utils/globalNotificationManager');
    const { unmount } = render(<GlobalSocketListener />);

    unmount();

    // Check that all events are unregistered
    expect(mockSocket.off).toHaveBeenCalledWith('connect');
    expect(mockSocket.off).toHaveBeenCalledWith('disconnect');
    expect(mockSocket.off).toHaveBeenCalledWith('connect_error');
    expect(mockSocket.off).toHaveBeenCalledWith('booking_created');
    expect(mockSocket.off).toHaveBeenCalledWith('booking_updated');
    expect(mockSocket.off).toHaveBeenCalledWith('booking_cancelled');
    expect(mockSocket.off).toHaveBeenCalledWith('slot_locked');
    expect(mockSocket.off).toHaveBeenCalledWith('slot_unlocked');
    expect(mockSocket.off).toHaveBeenCalledWith('lock_expired');
    expect(mockSocket.off).toHaveBeenCalledWith('payment_confirmed');
    expect(mockSocket.off).toHaveBeenCalledWith('payment_failed');

    // Check socket is disconnected
    expect(mockSocket.disconnect).toHaveBeenCalled();

    // Check notification manager is cleaned up
    expect(cleanupNotificationManager).toHaveBeenCalled();
  });

  it('should not render any visible content', () => {
    const { container } = render(<GlobalSocketListener />);
    expect(container.firstChild).toBeNull();
  });
});
