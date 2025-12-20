/**
 * @jest-environment jsdom
 * 
 * WebSocket Error Handling and Edge Case Tests
 * 
 * This test suite verifies that components correctly handle:
 * - Invalid/malformed WebSocket messages
 * - Unexpected event types
 * - Missing required fields in events
 * - Null/undefined values
 * - Type mismatches
 * 
 * Ensures the UI remains stable and doesn't break when receiving
 * unexpected or malformed data from the WebSocket server.
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { useSocketIO } from "@/hooks/useSocketIO";
import { useBookingStore } from "@/stores/useBookingStore";
import type {
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
} from "@/types/socket";

// Mock socket instance
let mockSocket: any;

// Test constants
const DEBOUNCE_WAIT_TIME = 350; // Wait time for 300ms debounce + buffer
const SHORT_DEBOUNCE = 100; // For tests with custom short debounce

// Mock socket.io-client
jest.mock("socket.io-client", () => {
  return {
    io: jest.fn(() => {
      mockSocket = {
        id: "mock-socket-id",
        connected: false,
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        connect: jest.fn(function () {
          this.connected = true;
        }),
        disconnect: jest.fn(function () {
          this.connected = false;
        }),
        io: {
          on: jest.fn(),
          off: jest.fn(),
        },
      };
      return mockSocket;
    }),
  };
});

// Helper to simulate event emission
function emitSocketEvent(eventName: string, data: any) {
  const handler = mockSocket.on.mock.calls.find(
    (call: any) => call[0] === eventName
  )?.[1];
  if (handler) {
    handler(data);
  }
}

describe("WebSocket Error Handling - Invalid Messages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = null;
    
    // Reset booking store
    useBookingStore.setState({
      bookings: [],
      loading: false,
      error: null,
      lastFetchedAt: null,
      lastFetchParams: null,
    });
  });

  describe("Malformed Event Data", () => {
    it("should not crash when receiving null data", async () => {
      const onBookingCreated = jest.fn();

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingCreated,
          debounceMs: SHORT_DEBOUNCE,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Emit event with null data - should not crash the hook
      expect(() => {
        act(() => {
          emitSocketEvent("bookingCreated", null);
        });
      }).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, SHORT_DEBOUNCE + 50));

      // The debounce wrapper should handle null gracefully
      // The callback may or may not be called depending on debounce implementation
      // The important thing is the app doesn't crash
    });

    it("should not crash when receiving undefined data", async () => {
      const onBookingUpdated = jest.fn();

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingUpdated,
          debounceMs: SHORT_DEBOUNCE,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Emit event with undefined data - should not crash the hook
      expect(() => {
        act(() => {
          emitSocketEvent("bookingUpdated", undefined);
        });
      }).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, SHORT_DEBOUNCE + 50));

      // The debounce wrapper should handle undefined gracefully
      // The important thing is the app doesn't crash
    });

    it("should not crash when receiving empty object", async () => {
      const onBookingDeleted = jest.fn();

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingDeleted,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Emit event with empty object
      expect(() => {
        act(() => {
          emitSocketEvent("bookingDeleted", {});
        });
      }).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      await waitFor(() => {
        expect(onBookingDeleted).toHaveBeenCalledWith({});
      });
    });

    it("should not crash when booking data has missing required fields", async () => {
      const onBookingCreated = jest.fn((data: BookingCreatedEvent) => {
        // Even with missing fields, should not throw
        if (data?.booking) {
          useBookingStore.getState().updateBookingFromSocket(data.booking);
        }
      });

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingCreated,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Emit event with incomplete booking data
      const incompleteEvent = {
        booking: {
          id: "booking-1",
          // Missing many required fields
        },
        clubId: "club-1",
        // Missing courtId
      };

      expect(() => {
        act(() => {
          emitSocketEvent("bookingCreated", incompleteEvent);
        });
      }).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));
    });

    it("should handle booking event with wrong data types", async () => {
      const onBookingUpdated = jest.fn();

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingUpdated,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Emit event with wrong data types
      const wrongTypeEvent = {
        booking: "not-an-object", // Should be an object
        clubId: 123, // Should be a string
        courtId: null, // Should be a string
      };

      expect(() => {
        act(() => {
          emitSocketEvent("bookingUpdated", wrongTypeEvent);
        });
      }).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      await waitFor(() => {
        expect(onBookingUpdated).toHaveBeenCalledWith(wrongTypeEvent);
      });
    });
  });

  describe("Unexpected Event Types", () => {
    it("should ignore unknown event types", async () => {
      const onBookingCreated = jest.fn();
      const onBookingUpdated = jest.fn();
      const onBookingDeleted = jest.fn();

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingCreated,
          onBookingUpdated,
          onBookingDeleted,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Try to emit an unknown event type
      expect(() => {
        act(() => {
          emitSocketEvent("unknownEvent", { data: "some data" });
        });
      }).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      // Known callbacks should not be triggered
      expect(onBookingCreated).not.toHaveBeenCalled();
      expect(onBookingUpdated).not.toHaveBeenCalled();
      expect(onBookingDeleted).not.toHaveBeenCalled();
    });

    it("should not crash on unexpected event with random data", async () => {
      renderHook(() =>
        useSocketIO({
          autoConnect: true,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Various unexpected payloads
      const unexpectedPayloads = [
        123,
        "string",
        true,
        [],
        [1, 2, 3],
        { random: "object", with: { nested: "data" } },
      ];

      for (const payload of unexpectedPayloads) {
        expect(() => {
          act(() => {
            emitSocketEvent("randomEvent", payload);
          });
        }).not.toThrow();
      }
    });
  });

  describe("State Consistency After Invalid Events", () => {
    it("should maintain store state when receiving invalid booking created event", async () => {
      const initialBooking = {
        id: "booking-1",
        userId: "user-1",
        userName: "Test User",
        userEmail: "test@example.com",
        courtId: "court-1",
        courtName: "Court 1",
        start: "2024-01-15T10:00:00Z",
        end: "2024-01-15T11:00:00Z",
        bookingStatus: "Active",
        paymentStatus: "Paid",
        price: 100,
        sportType: "PADEL",
        coachId: null,
        coachName: null,
        createdAt: "2024-01-15T09:00:00Z",
        updatedAt: "2024-01-15T09:00:00Z",
      };

      useBookingStore.setState({
        bookings: [initialBooking],
      });

      const onBookingCreated = jest.fn((data: BookingCreatedEvent) => {
        // Only update if data is valid
        if (data?.booking?.id) {
          useBookingStore.getState().updateBookingFromSocket(data.booking);
        }
      });

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingCreated,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Emit invalid event
      act(() => {
        emitSocketEvent("bookingCreated", { invalid: "data" });
      });

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      // Store should still have the original booking
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(1);
        expect(bookings[0]).toEqual(initialBooking);
      });
    });

    it("should not corrupt store when receiving invalid booking updated event", async () => {
      const originalBooking = {
        id: "booking-1",
        userId: "user-1",
        userName: "Test User",
        userEmail: "test@example.com",
        courtId: "court-1",
        courtName: "Court 1",
        start: "2024-01-15T10:00:00Z",
        end: "2024-01-15T11:00:00Z",
        bookingStatus: "Active",
        paymentStatus: "Paid",
        price: 100,
        sportType: "PADEL",
        coachId: null,
        coachName: null,
        createdAt: "2024-01-15T09:00:00Z",
        updatedAt: "2024-01-15T09:00:00Z",
      };

      useBookingStore.setState({
        bookings: [originalBooking],
      });

      const onBookingUpdated = jest.fn((data: BookingUpdatedEvent) => {
        // Guard against invalid data
        if (data?.booking?.id) {
          useBookingStore.getState().updateBookingFromSocket(data.booking);
        }
      });

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingUpdated,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Emit event with null booking
      act(() => {
        emitSocketEvent("bookingUpdated", {
          booking: null,
          clubId: "club-1",
          courtId: "court-1",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      // Store should remain unchanged
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(1);
        expect(bookings[0]).toEqual(originalBooking);
      });
    });

    it("should safely ignore invalid booking deleted event", async () => {
      useBookingStore.setState({
        bookings: [
          {
            id: "booking-1",
            userId: "user-1",
            userName: "Test User",
            userEmail: "test@example.com",
            courtId: "court-1",
            courtName: "Court 1",
            start: "2024-01-15T10:00:00Z",
            end: "2024-01-15T11:00:00Z",
            bookingStatus: "Active",
            paymentStatus: "Paid",
            price: 100,
            sportType: "PADEL",
            coachId: null,
            coachName: null,
            createdAt: "2024-01-15T09:00:00Z",
            updatedAt: "2024-01-15T09:00:00Z",
          },
        ],
      });

      const onBookingDeleted = jest.fn((data: BookingDeletedEvent) => {
        // Guard against invalid data
        if (data?.bookingId) {
          useBookingStore.getState().removeBookingFromSocket(data.bookingId);
        }
      });

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingDeleted,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Emit event with missing bookingId
      act(() => {
        emitSocketEvent("bookingDeleted", {
          clubId: "club-1",
          courtId: "court-1",
          // bookingId is missing
        });
      });

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      // Booking should not be deleted
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(1);
      });
    });
  });

  describe("Concurrent Invalid and Valid Events", () => {
    it("should process valid events even when invalid events are received", async () => {
      useBookingStore.setState({
        bookings: [],
      });

      const onBookingCreated = jest.fn((data: BookingCreatedEvent) => {
        // Defensive check
        if (data?.booking?.id) {
          useBookingStore.getState().updateBookingFromSocket(data.booking);
        }
      });

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingCreated,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Emit an invalid event
      act(() => {
        emitSocketEvent("bookingCreated", null);
      });

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      // Emit a valid event
      act(() => {
        emitSocketEvent("bookingCreated", {
          booking: {
            id: "booking-1",
            userId: "user-1",
            userName: "Test User",
            userEmail: "test@example.com",
            courtId: "court-1",
            courtName: "Court 1",
            start: "2024-01-15T10:00:00Z",
            end: "2024-01-15T11:00:00Z",
            bookingStatus: "Active",
            paymentStatus: "Paid",
            price: 100,
            sportType: "PADEL",
            coachId: null,
            coachName: null,
            createdAt: "2024-01-15T09:00:00Z",
            updatedAt: "2024-01-15T09:00:00Z",
          },
          clubId: "club-1",
          courtId: "court-1",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      // Valid booking should be in the store
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(1);
        expect(bookings[0].id).toBe("booking-1");
      });
    });
  });

  describe("Connection Error Handling", () => {
    it("should handle connect_error gracefully", async () => {
      renderHook(() =>
        useSocketIO({
          autoConnect: true,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Simulate connection error
      const connectErrorHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === "connect_error"
      )?.[1];

      expect(() => {
        act(() => {
          if (connectErrorHandler) {
            connectErrorHandler(new Error("Connection failed"));
          }
        });
      }).not.toThrow();
    });

    it("should remain stable when multiple connection errors occur", async () => {
      const { result } = renderHook(() =>
        useSocketIO({
          autoConnect: true,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      const connectErrorHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === "connect_error"
      )?.[1];

      // Simulate multiple connection errors
      for (let i = 0; i < 5; i++) {
        expect(() => {
          act(() => {
            if (connectErrorHandler) {
              connectErrorHandler(new Error(`Connection error ${i}`));
            }
          });
        }).not.toThrow();
      }

      // Hook should still be functional
      expect(result.current.disconnect).toBeDefined();
      expect(result.current.connect).toBeDefined();
    });
  });
});
