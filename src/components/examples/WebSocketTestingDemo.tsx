/**
 * WebSocket Real-time Updates - Testing Example Component
 * 
 * This component demonstrates and tests real-time booking updates
 * using the centralized SocketProvider. It's useful for:
 * - Manual testing during development
 * - Demonstrating WebSocket functionality
 * - Training/onboarding developers
 * 
 * Usage:
 * 1. Import this component in a test page
 * 2. Open the page in multiple browser tabs
 * 3. Use the controls to simulate booking events
 * 4. Observe real-time updates across all tabs
 * 
 * NOTE: Real-time updates are now handled by GlobalSocketListener.
 * This component only monitors the connection status and displays data.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useBookingStore } from '@/stores/useBookingStore';
import type { OperationsBooking } from '@/types/booking';

interface WebSocketTestingDemoProps {
  /**
   * Club ID to filter events for
   */
  clubId: string;
  
  /**
   * Whether to show debug logs
   */
  showDebugLogs?: boolean;
}

/**
 * Demo component for testing WebSocket real-time updates
 * 
 * This component uses the global socket from SocketProvider.
 * Real-time updates are automatically handled by GlobalSocketListener.
 */
export function WebSocketTestingDemo({
  clubId,
  showDebugLogs = true,
}: WebSocketTestingDemoProps) {
  const [logs, setLogs] = useState<string[]>([]);

  const { socket, isConnected } = useSocket();
  const bookings = useBookingStore((state) => state.bookings);
  const fetchBookingsForDay = useBookingStore((state) => state.fetchBookingsForDay);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  // Initial fetch
  useEffect(() => {
    fetchBookingsForDay(clubId, new Date().toISOString().split('T')[0]);
  }, [clubId, fetchBookingsForDay]);

  // Monitor booking changes
  useEffect(() => {
    if (bookings.length > 0) {
      addLog(`📊 Bookings list updated: ${bookings.length} total`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  // Manual disconnect/connect handlers (for testing)
  const handleDisconnect = () => {
    if (socket) {
      socket.disconnect();
      addLog('🔴 Manually disconnected');
    }
  };

  const handleConnect = () => {
    if (socket) {
      socket.connect();
      addLog('🟢 Manually reconnected');
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="im-card">
      <div className="im-card-header">
        <h2 className="im-card-title">WebSocket Real-time Updates - Testing Demo</h2>
        <p className="im-card-description">
          Open this page in multiple tabs to test real-time updates
        </p>
      </div>

      <div className="im-card-content space-y-6">
        {/* Connection Status */}
        <div className="im-section">
          <h3 className="im-section-title">Connection Status</h3>
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                isConnected
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              <span className="text-2xl">{isConnected ? '🟢' : '🔴'}</span>
              <span className="font-semibold">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {socket && (
              <div className="text-sm text-gray-400">
                Socket ID: <code className="im-code">{socket.id}</code>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleConnect}
              disabled={isConnected}
              className="im-button im-button-sm"
            >
              Connect
            </button>
            <button
              onClick={handleDisconnect}
              disabled={!isConnected}
              className="im-button im-button-sm im-button-danger"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Current Bookings */}
        <div className="im-section">
          <h3 className="im-section-title">
            Current Bookings ({bookings.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bookings.length === 0 ? (
              <p className="text-gray-400">No bookings for this club</p>
            ) : (
              bookings.map((booking: OperationsBooking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{booking.courtName}</div>
                    <div className="text-sm text-gray-400">
                      {booking.userName} - {booking.bookingStatus}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(booking.start).toLocaleTimeString()} -{' '}
                    {new Date(booking.end).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Event Logs */}
        {showDebugLogs && (
          <div className="im-section">
            <div className="flex items-center justify-between mb-4">
              <h3 className="im-section-title">Event Logs</h3>
              <button
                onClick={handleClearLogs}
                className="im-button im-button-sm"
              >
                Clear Logs
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-500">No events logged yet</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-gray-300 py-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Testing Instructions */}
        <div className="im-section">
          <h3 className="im-section-title">Testing Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>Open this page in 2-3 browser tabs</li>
            <li>
              In another tab, create/update/delete bookings for club: {clubId}
            </li>
            <li>Observe all tabs receiving updates simultaneously</li>
            <li>
              Test reconnection: Use the &quot;Disconnect&quot; button, then &quot;Connect&quot;
            </li>
            <li>Verify no duplicate bookings appear in the list</li>
            <li>Check toast notifications appear for booking events</li>
          </ol>

          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-400">
              💡 <strong>Tip:</strong> Open browser DevTools Console to see
              additional WebSocket debug logs from SocketProvider and GlobalSocketListener
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example: Minimal WebSocket Status Indicator
 * 
 * A lightweight component that just shows connection status
 * from the global SocketProvider.
 * Can be added to any page header or toolbar.
 */
export function WebSocketStatusBadge() {
  const { isConnected } = useSocket();

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
        isConnected
          ? 'bg-green-500/20 text-green-400'
          : 'bg-gray-500/20 text-gray-400'
      }`}
      title={isConnected ? 'Live updates enabled' : 'Connecting...'}
    >
      <span className="text-sm">{isConnected ? '🟢' : '⚪'}</span>
      <span>{isConnected ? 'Live' : 'Offline'}</span>
    </div>
  );
}
