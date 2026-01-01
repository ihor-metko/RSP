/**
 * Example: WebSocket-enabled Booking Component
 * 
 * This is a demonstration component showing how to use
 * the centralized SocketProvider for real-time booking updates.
 * 
 * NOTE: Real-time updates are now handled globally by GlobalSocketListener,
 * which automatically updates the booking store. Components just need to
 * read from the store.
 * 
 * USAGE:
 * Import this component in any page that displays bookings.
 * 
 * @example
 * ```tsx
 * import { BookingListWithWebSocket } from '@/components/examples/BookingListWithWebSocket';
 * 
 * export default function BookingsPage() {
 *   return <BookingListWithWebSocket clubId="club-123" date="2024-01-15" />;
 * }
 * ```
 */

'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useBookingStore } from '@/stores/useBookingStore';
import type { OperationsBooking } from '@/types/booking';

interface BookingListWithWebSocketProps {
  clubId: string;
  date: string;
}

/**
 * Example component demonstrating WebSocket integration
 * for real-time booking updates
 * 
 * This component now uses the global socket from SocketProvider.
 * Real-time updates are automatically handled by GlobalSocketListener.
 */
export function BookingListWithWebSocket({
  clubId,
  date,
}: BookingListWithWebSocketProps) {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  // Get socket connection status from global SocketProvider
  const { isConnected } = useSocket();
  
  // Get bookings from Zustand store
  const bookings = useBookingStore((state) => state.bookings);
  const loading = useBookingStore((state) => state.loading);
  const fetchBookingsForDay = useBookingStore((state) => state.fetchBookingsForDay);

  // Initial fetch of bookings
  useEffect(() => {
    fetchBookingsForDay(clubId, date);
  }, [clubId, date, fetchBookingsForDay]);

  // Track booking changes for demo purposes
  useEffect(() => {
    if (bookings.length > 0) {
      setLastUpdate(`Bookings updated: ${bookings.length} total`);
    }
  }, [bookings]);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Connection Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: isConnected ? '#10b981' : '#ef4444',
          color: 'white',
          borderRadius: '6px',
        }}
      >
        <span style={{ fontSize: '20px' }}>
          {isConnected ? '🟢' : '🔴'}
        </span>
        <span style={{ fontWeight: 'bold' }}>
          {isConnected ? 'Connected - Live Updates Enabled' : 'Disconnected'}
        </span>
      </div>

      {/* Last Update Info */}
      {lastUpdate && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        >
          <strong>Last Update:</strong> {lastUpdate}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ padding: '12px', color: '#6b7280' }}>
          Loading bookings...
        </div>
      )}

      {/* Bookings List */}
      <div style={{ marginTop: '16px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '20px', fontWeight: 'bold' }}>
          Bookings for {date}
        </h2>
        
        {bookings.length === 0 && !loading ? (
          <p style={{ color: '#6b7280' }}>No bookings found for this date.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bookings.map((booking: OperationsBooking) => (
              <div
                key={booking.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong>{booking.courtName}</strong>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor:
                        booking.bookingStatus === 'Active'
                          ? '#10b981'
                          : booking.bookingStatus === 'Cancelled'
                          ? '#ef4444'
                          : '#6b7280',
                      color: 'white',
                    }}
                  >
                    {booking.bookingStatus}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  <div>User: {booking.userName}</div>
                  <div>
                    Time: {new Date(booking.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} -{' '}
                    {new Date(booking.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </div>
                  <div>Price: ${booking.price}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Alternative: Minimal WebSocket Status Indicator
 * 
 * Use this in any component to show WebSocket connection status
 * from the global SocketProvider
 */
export function WebSocketStatusIndicator() {
  const { isConnected } = useSocket();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        backgroundColor: isConnected ? '#10b981' : '#6b7280',
        color: 'white',
      }}
      title={isConnected ? 'Live updates enabled' : 'Connecting...'}
    >
      <span>{isConnected ? '🟢' : '⚪'}</span>
      <span>{isConnected ? 'Live' : 'Offline'}</span>
    </div>
  );
}
