/**
 * @jest-environment jsdom
 * 
 * Enhanced WebSocket Reconnection and State Consistency Tests
 * 
 * This test suite verifies:
 * - Reconnection behavior after network interruptions
 * - State consistency after reconnection
 * - Data synchronization after missed updates
 * - Multiple reconnection attempts
 * - Exponential backoff behavior (if implemented)
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { useSocketIO } from "@/hooks/useSocketIO";
import { useBookingStore } from "@/stores/useBookingStore";
import type {
  BookingCreatedEvent,
  BookingUpdatedEvent,
} from "@/types/socket";
import type { OperationsBooking } from "@/types/booking";

// Mock socket instance
let mockSocket: any;

// Test constants
const DEBOUNCE_WAIT_TIME = 350; // Wait time for 300ms debounce + buffer

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

// Helper to create a mock booking
function createMockBooking(
  id: string,
  overrides?: Partial<OperationsBooking>
): OperationsBooking {
  return {
    id,
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
    ...overrides,
  };
}

// Helper to simulate socket event
function emitSocketEvent(eventName: string, data: any) {
  const handler = mockSocket.on.mock.calls.find(
    (call: any) => call[0] === eventName
  )?.[1];
  if (handler) {
    handler(data);
  }
}

describe("WebSocket Reconnection and State Consistency", () => {
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

  describe("Basic Reconnection Flow", () => {
    it("should transition from connected to disconnected to reconnected", async () => {
      const { result } = renderHook(() =>
        useSocketIO({
          autoConnect: true,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
        expect(result.current.isConnected).toBe(false);
      });

      // Step 1: Connect
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(
          (call: any) => call[0] === "connect"
        )?.[1];
        if (connectHandler) {
          mockSocket.connected = true;
          connectHandler();
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Step 2: Disconnect
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find(
          (call: any) => call[0] === "disconnect"
        )?.[1];
        if (disconnectHandler) {
          mockSocket.connected = false;
          disconnectHandler();
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Step 3: Reconnect
      act(() => {
        const reconnectHandler = mockSocket.io.on.mock.calls.find(
          (call: any) => call[0] === "reconnect"
        )?.[1];
        if (reconnectHandler) {
          mockSocket.connected = true;
          reconnectHandler(1);
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it("should trigger onReconnect callback after successful reconnection", async () => {
      const onReconnect = jest.fn();

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onReconnect,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Simulate reconnection
      act(() => {
        const reconnectHandler = mockSocket.io.on.mock.calls.find(
          (call: any) => call[0] === "reconnect"
        )?.[1];
        if (reconnectHandler) {
          reconnectHandler(1);
        }
      });

      await waitFor(() => {
        expect(onReconnect).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle multiple reconnection attempts", async () => {
      const onReconnect = jest.fn();

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onReconnect,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Simulate multiple reconnections
      for (let attempt = 1; attempt <= 5; attempt++) {
        act(() => {
          const reconnectHandler = mockSocket.io.on.mock.calls.find(
            (call: any) => call[0] === "reconnect"
          )?.[1];
          if (reconnectHandler) {
            reconnectHandler(attempt);
          }
        });

        await waitFor(() => {
          expect(onReconnect).toHaveBeenCalledTimes(attempt);
        });
      }
    });
  });

  describe("State Consistency After Reconnection", () => {
    it("should maintain existing bookings after reconnection", async () => {
      const initialBookings = [
        createMockBooking("booking-1"),
        createMockBooking("booking-2"),
      ];

      useBookingStore.setState({
        bookings: initialBookings,
      });

      const { result } = renderHook(() =>
        useSocketIO({
          autoConnect: true,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Connect
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(
          (call: any) => call[0] === "connect"
        )?.[1];
        if (connectHandler) {
          mockSocket.connected = true;
          connectHandler();
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Disconnect
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find(
          (call: any) => call[0] === "disconnect"
        )?.[1];
        if (disconnectHandler) {
          mockSocket.connected = false;
          disconnectHandler();
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Bookings should still be in store during disconnect
      expect(useBookingStore.getState().bookings).toEqual(initialBookings);

      // Reconnect
      act(() => {
        const reconnectHandler = mockSocket.io.on.mock.calls.find(
          (call: any) => call[0] === "reconnect"
        )?.[1];
        if (reconnectHandler) {
          mockSocket.connected = true;
          reconnectHandler(1);
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Bookings should still be intact after reconnection
      expect(useBookingStore.getState().bookings).toEqual(initialBookings);
    });

    it("should sync missed updates after reconnection via onReconnect callback", async () => {
      const initialBookings = [createMockBooking("booking-1")];

      useBookingStore.setState({
        bookings: initialBookings,
      });

      const onReconnect = jest.fn(() => {
        // Simulate fetching missed updates
        const newBooking = createMockBooking("booking-2");
        useBookingStore.getState().updateBookingFromSocket(newBooking);
      });

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onReconnect,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Simulate reconnection
      act(() => {
        const reconnectHandler = mockSocket.io.on.mock.calls.find(
          (call: any) => call[0] === "reconnect"
        )?.[1];
        if (reconnectHandler) {
          reconnectHandler(1);
        }
      });

      await waitFor(() => {
        expect(onReconnect).toHaveBeenCalled();
      });

      // Store should now have both bookings (initial + synced)
      const bookings = useBookingStore.getState().bookings;
      expect(bookings.length).toBe(2);
      expect(bookings.find((b) => b.id === "booking-1")).toBeTruthy();
      expect(bookings.find((b) => b.id === "booking-2")).toBeTruthy();
    });

    it("should correctly process events received after reconnection", async () => {
      useBookingStore.setState({
        bookings: [],
      });

      const onBookingCreated = jest.fn((data: BookingCreatedEvent) => {
        useBookingStore.getState().updateBookingFromSocket(data.booking);
      });

      const { result } = renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingCreated,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Simulate disconnect and reconnect
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find(
          (call: any) => call[0] === "disconnect"
        )?.[1];
        if (disconnectHandler) {
          disconnectHandler();
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      act(() => {
        const reconnectHandler = mockSocket.io.on.mock.calls.find(
          (call: any) => call[0] === "reconnect"
        )?.[1];
        if (reconnectHandler) {
          reconnectHandler(1);
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Now emit a booking created event
      const newBooking = createMockBooking("booking-1");
      act(() => {
        emitSocketEvent("bookingCreated", {
          booking: newBooking,
          clubId: "club-1",
          courtId: "court-1",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      // Event should be processed correctly
      await waitFor(() => {
        expect(onBookingCreated).toHaveBeenCalled();
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(1);
        expect(bookings[0].id).toBe("booking-1");
      });
    });
  });

  describe("Disconnect-Reconnect with Concurrent Events", () => {
    it("should handle events during reconnection process", async () => {
      useBookingStore.setState({
        bookings: [],
      });

      const onBookingCreated = jest.fn((data: BookingCreatedEvent) => {
        useBookingStore.getState().updateBookingFromSocket(data.booking);
      });

      const onBookingUpdated = jest.fn((data: BookingUpdatedEvent) => {
        useBookingStore.getState().updateBookingFromSocket(data.booking);
      });

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingCreated,
          onBookingUpdated,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Simulate initial connection
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(
          (call: any) => call[0] === "connect"
        )?.[1];
        if (connectHandler) {
          connectHandler();
        }
      });

      // Emit a booking created event while connected
      const booking1 = createMockBooking("booking-1");
      act(() => {
        emitSocketEvent("bookingCreated", {
          booking: booking1,
          clubId: "club-1",
          courtId: "court-1",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      await waitFor(() => {
        expect(useBookingStore.getState().bookings.length).toBe(1);
      });

      // Disconnect
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find(
          (call: any) => call[0] === "disconnect"
        )?.[1];
        if (disconnectHandler) {
          disconnectHandler();
        }
      });

      // Reconnect
      act(() => {
        const reconnectHandler = mockSocket.io.on.mock.calls.find(
          (call: any) => call[0] === "reconnect"
        )?.[1];
        if (reconnectHandler) {
          reconnectHandler(1);
        }
      });

      // Emit another event after reconnection
      const booking2 = createMockBooking("booking-2");
      act(() => {
        emitSocketEvent("bookingCreated", {
          booking: booking2,
          clubId: "club-1",
          courtId: "court-1",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      // Both events should be processed
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(2);
        expect(bookings.find((b) => b.id === "booking-1")).toBeTruthy();
        expect(bookings.find((b) => b.id === "booking-2")).toBeTruthy();
      });
    });

    it("should maintain event order across reconnections", async () => {
      useBookingStore.setState({
        bookings: [],
      });

      const eventLog: string[] = [];

      const onBookingCreated = jest.fn((data: BookingCreatedEvent) => {
        eventLog.push(`created:${data.booking.id}`);
        useBookingStore.getState().updateBookingFromSocket(data.booking);
      });

      const onBookingUpdated = jest.fn((data: BookingUpdatedEvent) => {
        eventLog.push(`updated:${data.booking.id}`);
        useBookingStore.getState().updateBookingFromSocket(data.booking);
      });

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingCreated,
          onBookingUpdated,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Event 1: Create
      act(() => {
        emitSocketEvent("bookingCreated", {
          booking: createMockBooking("booking-1"),
          clubId: "club-1",
          courtId: "court-1",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      // Event 2: Update
      act(() => {
        emitSocketEvent("bookingUpdated", {
          booking: createMockBooking("booking-1", {
            bookingStatus: "Cancelled",
            updatedAt: "2024-01-15T11:00:00Z",
          }),
          clubId: "club-1",
          courtId: "court-1",
          previousStatus: "Active",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      // Disconnect and reconnect
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find(
          (call: any) => call[0] === "disconnect"
        )?.[1];
        if (disconnectHandler) {
          disconnectHandler();
        }
      });

      act(() => {
        const reconnectHandler = mockSocket.io.on.mock.calls.find(
          (call: any) => call[0] === "reconnect"
        )?.[1];
        if (reconnectHandler) {
          reconnectHandler(1);
        }
      });

      // Event 3: Create another booking
      act(() => {
        emitSocketEvent("bookingCreated", {
          booking: createMockBooking("booking-2"),
          clubId: "club-1",
          courtId: "court-1",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

      // Events should be processed in order
      await waitFor(() => {
        expect(eventLog).toEqual([
          "created:booking-1",
          "updated:booking-1",
          "created:booking-2",
        ]);
      });

      // Final state should have both bookings
      const bookings = useBookingStore.getState().bookings;
      expect(bookings.length).toBe(2);
      expect(bookings.find((b) => b.id === "booking-1")?.bookingStatus).toBe("Cancelled");
      expect(bookings.find((b) => b.id === "booking-2")).toBeTruthy();
    });
  });

  describe("Connection State Edge Cases", () => {
    it("should handle rapid connect/disconnect cycles", async () => {
      const { result } = renderHook(() =>
        useSocketIO({
          autoConnect: true,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // Rapid connect/disconnect cycles
      for (let i = 0; i < 10; i++) {
        act(() => {
          const connectHandler = mockSocket.on.mock.calls.find(
            (call: any) => call[0] === "connect"
          )?.[1];
          if (connectHandler) {
            connectHandler();
          }
        });

        act(() => {
          const disconnectHandler = mockSocket.on.mock.calls.find(
            (call: any) => call[0] === "disconnect"
          )?.[1];
          if (disconnectHandler) {
            disconnectHandler();
          }
        });
      }

      // Hook should remain stable
      expect(result.current.socket).toBeTruthy();
      expect(result.current.connect).toBeDefined();
      expect(result.current.disconnect).toBeDefined();
    });

    it("should recover from reconnect callback errors", async () => {
      let shouldThrow = true;
      const onReconnect = jest.fn(() => {
        if (shouldThrow) {
          shouldThrow = false;
          throw new Error("Sync failed");
        }
      });

      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onReconnect,
        })
      );

      await waitFor(() => {
        expect(mockSocket).toBeTruthy();
      });

      // First reconnection triggers error
      expect(() => {
        act(() => {
          const reconnectHandler = mockSocket.io.on.mock.calls.find(
            (call: any) => call[0] === "reconnect"
          )?.[1];
          if (reconnectHandler) {
            reconnectHandler(1);
          }
        });
      }).toThrow("Sync failed");

      // Second reconnection should work
      expect(() => {
        act(() => {
          const reconnectHandler = mockSocket.io.on.mock.calls.find(
            (call: any) => call[0] === "reconnect"
          )?.[1];
          if (reconnectHandler) {
            reconnectHandler(2);
          }
        });
      }).not.toThrow();

      expect(onReconnect).toHaveBeenCalledTimes(2);
    });
  });
});
