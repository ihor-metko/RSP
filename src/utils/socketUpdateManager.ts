import type { OperationsBooking } from '@/types/booking';

/**
 * Socket.IO Update Manager
 * 
 * Utilities for managing real-time booking updates with conflict resolution:
 * - Debouncing rapid consecutive events
 * - Timestamp-based conflict detection
 * - State comparison to prevent outdated updates
 */

/**
 * Debounce function for socket events
 * Groups rapid consecutive calls within a time window
 */
export function debounceSocketEvent<T>(
  callback: (data: T) => void,
  delayMs: number = 300
): (data: T) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingData: T | null = null;

  return (data: T) => {
    // Store the latest data
    pendingData = data;

    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      if (pendingData) {
        callback(pendingData);
        pendingData = null;
      }
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle function for socket events
 * Ensures callback is called at most once per time window
 */
export function throttleSocketEvent<T>(
  callback: (data: T) => void,
  delayMs: number = 1000
): (data: T) => void {
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingData: T | null = null;

  return (data: T) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= delayMs) {
      // Enough time has passed, call immediately
      callback(data);
      lastCallTime = now;
    } else {
      // Store the latest data and schedule a call
      pendingData = data;

      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          if (pendingData) {
            callback(pendingData);
            lastCallTime = Date.now();
            pendingData = null;
          }
          timeoutId = null;
        }, delayMs - timeSinceLastCall);
      }
    }
  };
}

/**
 * Check if an incoming booking update is newer than the current booking
 * Returns true if the update should be applied, false if it should be ignored
 */
export function shouldApplyBookingUpdate(
  currentBooking: OperationsBooking | undefined,
  incomingBooking: OperationsBooking
): boolean {
  // If we don't have a current booking, always apply the update
  if (!currentBooking) {
    return true;
  }

  // Compare timestamps (updatedAt is the authoritative source)
  const currentTimestamp = new Date(currentBooking.updatedAt).getTime();
  const incomingTimestamp = new Date(incomingBooking.updatedAt).getTime();

  // Only apply if incoming is strictly newer
  if (incomingTimestamp > currentTimestamp) {
    return true;
  }

  // Log conflict in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Socket Update Conflict]', {
      bookingId: incomingBooking.id,
      currentTimestamp: new Date(currentBooking.updatedAt).toISOString(),
      incomingTimestamp: new Date(incomingBooking.updatedAt).toISOString(),
      message: 'Ignoring outdated or duplicate update',
    });
  }

  return false;
}

/**
 * Merge booking lists, keeping only the newest version of each booking
 */
export function mergeBookingLists(
  currentBookings: OperationsBooking[],
  incomingBookings: OperationsBooking[]
): OperationsBooking[] {
  const bookingMap = new Map<string, OperationsBooking>();

  // Add all current bookings to the map
  currentBookings.forEach(booking => {
    bookingMap.set(booking.id, booking);
  });

  // Update with incoming bookings if they're newer
  incomingBookings.forEach(incomingBooking => {
    const currentBooking = bookingMap.get(incomingBooking.id);
    if (shouldApplyBookingUpdate(currentBooking, incomingBooking)) {
      bookingMap.set(incomingBooking.id, incomingBooking);
    }
  });

  return Array.from(bookingMap.values());
}

/**
 * Update a booking in a list, respecting timestamps
 */
export function updateBookingInList(
  bookings: OperationsBooking[],
  updatedBooking: OperationsBooking
): OperationsBooking[] {
  const currentBooking = bookings.find(b => b.id === updatedBooking.id);

  // Check if we should apply the update
  if (!shouldApplyBookingUpdate(currentBooking, updatedBooking)) {
    return bookings; // Return original list unchanged
  }

  // If booking exists, replace it; otherwise add it
  if (currentBooking) {
    return bookings.map(b => b.id === updatedBooking.id ? updatedBooking : b);
  } else {
    return [...bookings, updatedBooking];
  }
}

/**
 * Remove a booking from a list
 */
export function removeBookingFromList(
  bookings: OperationsBooking[],
  bookingId: string
): OperationsBooking[] {
  return bookings.filter(b => b.id !== bookingId);
}
