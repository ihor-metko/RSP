'use client';

/**
 * Test page for Global Real-Time Notifications
 *
 * Use this page to manually test all notification events
 */

import { useState } from 'react';
import { Button, Card } from '@/components/ui';

const EVENTS = [
  { type: 'booking_created', label: 'Booking Created', description: 'Test booking creation notification' },
  { type: 'booking_updated', label: 'Booking Updated', description: 'Test booking update notification' },
  { type: 'booking_cancelled', label: 'Booking Cancelled', description: 'Test booking cancellation notification' },
  { type: 'slot_locked', label: 'Slot Locked', description: 'Test slot lock notification' },
  { type: 'slot_unlocked', label: 'Slot Unlocked', description: 'Test slot unlock notification' },
  { type: 'lock_expired', label: 'Lock Expired', description: 'Test lock expiration notification' },
  { type: 'payment_confirmed', label: 'Payment Confirmed', description: 'Test successful payment notification' },
  { type: 'payment_failed', label: 'Payment Failed', description: 'Test failed payment notification' },
];

export default function NotificationsTestPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  const triggerEvent = async (eventType: string) => {
    setLoading(eventType);
    try {
      const response = await fetch(`/api/test/notifications?event=${eventType}`);
      const data = await response.json();

      if (response.ok) {
        setResults(prev => [`✅ ${eventType}: ${data.message}`, ...prev].slice(0, 10));
      } else {
        setResults(prev => [`❌ ${eventType}: ${data.error}`, ...prev].slice(0, 10));
      }
    } catch {
      setResults(prev => [`❌ ${eventType}: Network error`, ...prev].slice(0, 10));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-900 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">
          🔔 Global Notifications Test Page
        </h1>
        <p className="text-gray-400 mb-8">
          Click any button below to trigger a test notification. Watch the top-right corner for toast notifications.
        </p>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Trigger Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EVENTS.map((event) => (
                <div key={event.type} className="border border-gray-700 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-1">{event.label}</h3>
                  <p className="text-gray-400 text-sm mb-3">{event.description}</p>
                  <Button
                    onClick={() => triggerEvent(event.type)}
                    disabled={loading === event.type}
                    variant="primary"
                    className="w-full"
                  >
                    {loading === event.type ? 'Triggering...' : 'Trigger'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {results.length > 0 && (
          <Card className="mt-6">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Event Log</h2>
                <Button
                  onClick={() => setResults([])}
                  variant="outline"
                  className="text-sm"
                >
                  Clear
                </Button>
              </div>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-800 rounded text-sm text-gray-300 font-mono"
                  >
                    {result}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        <Card className="mt-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Instructions</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>Open your browser&apos;s Developer Console (F12) to see Socket.IO events</li>
              <li>Click any &quot;Trigger&quot; button to emit a test event</li>
              <li>Watch for toast notifications in the top-right corner</li>
              <li>Try clicking the same button multiple times to test duplicate prevention</li>
              <li>Try triggering multiple different events to see the toast queue in action</li>
            </ol>
          </div>
        </Card>

        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <p className="text-blue-200 text-sm">
            <strong>Note:</strong> This test page is for development purposes only.
            In production, these events will be emitted automatically by the backend when real actions occur.
          </p>
        </div>
      </div>
    </div>
  );
}
