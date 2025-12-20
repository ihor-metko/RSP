/**
 * Example: WebSocket-enabled Booking Component
 * 
 * This is a demonstration component showing how to integrate
 * the useSocketIO hook for real-time booking updates.
 * 
 * USAGE:
 * Import this component in any page that displays bookings
 * and needs real-time updates.
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
import { useSocketIO } from '@/hooks';
import { useBookingStore } from '@/stores/useBookingStore';
import type { OperationsBooking } from '@/types/booking';

interface BookingListWithWebSocketProps {
  clubId: string;
  date: string;
}

/**
 * Example component demonstrating WebSocket integration
 * for real-time booking updates
 */
export function BookingListWithWebSocket({
  clubId,
  date,
}: BookingListWithWebSocketProps) {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  // Get bookings from Zustand store
  const bookings = useBookingStore((state) => state.bookings);
  const loading = useBookingStore((state) => state.loading);
  const fetchBookingsForDay = useBookingStore((state) => state.fetchBookingsForDay);
  const invalidateBookings = useBookingStore((state) => state.invalidateBookings);

  // Set up WebSocket connection with event handlers
  const { isConnected } = useSocketIO({
    autoConnect: true,
    onBookingCreated: (data) => {
      console.log('📅 New booking created:', data);
      
      // Only refresh if the event is for the current club
      if (data.clubId === clubId) {
        setLastUpdate(`Booking created: ${data.booking.id}`);
        invalidateBookings();
        fetchBookingsForDay(clubId, date);
      }
    },
    onBookingUpdated: (data) => {
      console.log('✏️ Booking updated:', data);
      
      if (data.clubId === clubId) {
        setLastUpdate(
          `Booking updated: ${data.booking.id} (${data.previousStatus} → ${data.booking.bookingStatus})`
        );
        invalidateBookings();
        fetchBookingsForDay(clubId, date);
      }
    },
    onBookingDeleted: (data) => {
      console.log('🗑️ Booking deleted:', data);
      
      if (data.clubId === clubId) {
        setLastUpdate(`Booking deleted: ${data.bookingId}`);
        invalidateBookings();
        fetchBookingsForDay(clubId, date);
      }
    },
  });

  // Initial fetch of bookings
  useEffect(() => {
    fetchBookingsForDay(clubId, date);
  }, [clubId, date, fetchBookingsForDay]);

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
                    Time: {new Date(booking.start).toLocaleTimeString()} -{' '}
                    {new Date(booking.end).toLocaleTimeString()}
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
 */
export function WebSocketStatusIndicator() {
  const { isConnected } = useSocketIO({ autoConnect: true });

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
