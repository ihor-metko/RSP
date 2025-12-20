/**
 * @jest-environment jsdom
 * 
 * Comprehensive WebSocket Real-time Booking Updates Tests
 * 
 * This test suite verifies the WebSocket-based real-time booking updates functionality:
 * - Multiple clients receiving booking events
 * - UI updates in response to booking create/update/delete events
 * - Edge cases: reconnection, rapid events, conflict resolution
 * - No flickering or duplication of bookings
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { useSocketIO } from "@/hooks/useSocketIO";
import { useBookingStore } from "@/stores/useBookingStore";
import type {
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
} from "@/types/socket";
import type { OperationsBooking } from "@/types/booking";

// Mock socket instances for simulating multiple clients
let mockSockets: any[] = [];
let socketIdCounter = 0;

// Mock socket.io-client to support multiple client simulation
jest.mock("socket.io-client", () => {
  return {
    io: jest.fn(() => {
      const socketId = `mock-socket-${socketIdCounter++}`;
      const mockSocket = {
        id: socketId,
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
      mockSockets.push(mockSocket);
      return mockSocket;
    }),
  };
});

// Helper to simulate server emitting event to all connected clients
function emitToAllClients(eventName: string, data: any) {
  mockSockets.forEach((socket) => {
    const handler = socket.on.mock.calls.find(
      (call: any) => call[0] === eventName
    )?.[1];
    if (handler) {
      handler(data);
    }
  });
}

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

describe("WebSocket Real-time Booking Updates - Multi-Client Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSockets = [];
    socketIdCounter = 0;
    
    // Reset booking store
    useBookingStore.setState({
      bookings: [],
      loading: false,
      error: null,
      lastFetchedAt: null,
      lastFetchParams: null,
    });
  });

  describe("Multiple Client Connections", () => {
    it("should allow multiple clients to connect simultaneously", async () => {
      renderHook(() => useSocketIO({ autoConnect: true }));
      renderHook(() => useSocketIO({ autoConnect: true }));
      renderHook(() => useSocketIO({ autoConnect: true }));

      await waitFor(() => {
        expect(mockSockets.length).toBe(3);
      });

      // Verify sockets are created (they will be in the ref, not immediately available in result.current.socket)
      expect(mockSockets.length).toBe(3);
      
      // Each client should have a unique socket ID
      const socketIds = mockSockets.map((s) => s.id);
      expect(new Set(socketIds).size).toBe(3);
    });

    it("should register event handlers for all connected clients", async () => {
      const callbacks1 = {
        onBookingCreated: jest.fn(),
        onBookingUpdated: jest.fn(),
        onBookingDeleted: jest.fn(),
      };

      const callbacks2 = {
        onBookingCreated: jest.fn(),
        onBookingUpdated: jest.fn(),
        onBookingDeleted: jest.fn(),
      };

      renderHook(() => useSocketIO({ autoConnect: true, ...callbacks1 }));
      renderHook(() => useSocketIO({ autoConnect: true, ...callbacks2 }));

      await waitFor(() => {
        expect(mockSockets.length).toBe(2);
      });

      // Verify both clients have registered handlers
      mockSockets.forEach((socket) => {
        expect(socket.on).toHaveBeenCalledWith("connect", expect.any(Function));
        expect(socket.on).toHaveBeenCalledWith("bookingCreated", expect.any(Function));
        expect(socket.on).toHaveBeenCalledWith("bookingUpdated", expect.any(Function));
        expect(socket.on).toHaveBeenCalledWith("bookingDeleted", expect.any(Function));
      });
    });
  });

  describe("Booking Created Events - Multi-Client", () => {
    it("should notify all connected clients when a booking is created", async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingCreated: callback1 })
      );
      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingCreated: callback2 })
      );
      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingCreated: callback3 })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(3);
      });

      const booking = createMockBooking("booking-1");
      const event: BookingCreatedEvent = {
        booking,
        clubId: "club-1",
        courtId: "court-1",
      };

      // Simulate server broadcasting to all clients
      act(() => {
        emitToAllClients("bookingCreated", event);
      });

      // Wait for debounce (300ms default)
      await new Promise((resolve) => setTimeout(resolve, 350));

      // All clients should receive the event
      await waitFor(() => {
        expect(callback1).toHaveBeenCalledWith(event);
        expect(callback2).toHaveBeenCalledWith(event);
        expect(callback3).toHaveBeenCalledWith(event);
      });
    });

    it("should update booking store when booking is created", async () => {
      const booking = createMockBooking("booking-new");

      // Set initial bookings
      useBookingStore.setState({
        bookings: [createMockBooking("booking-1")],
      });

      const callback = jest.fn((data: BookingCreatedEvent) => {
        useBookingStore.getState().updateBookingFromSocket(data.booking);
      });

      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingCreated: callback })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(1);
      });

      const event: BookingCreatedEvent = {
        booking,
        clubId: "club-1",
        courtId: "court-1",
      };

      act(() => {
        emitToAllClients("bookingCreated", event);
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(2);
        expect(bookings.find((b) => b.id === "booking-new")).toBeTruthy();
      });
    });
  });

  describe("Booking Updated Events - Multi-Client", () => {
    it("should notify all clients when a booking is updated", async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingUpdated: callback1 })
      );
      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingUpdated: callback2 })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(2);
      });

      const booking = createMockBooking("booking-1", {
        bookingStatus: "Cancelled",
        updatedAt: "2024-01-15T10:00:00Z",
      });

      const event: BookingUpdatedEvent = {
        booking,
        clubId: "club-1",
        courtId: "court-1",
        previousStatus: "Active",
      };

      act(() => {
        emitToAllClients("bookingUpdated", event);
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      await waitFor(() => {
        expect(callback1).toHaveBeenCalledWith(event);
        expect(callback2).toHaveBeenCalledWith(event);
      });
    });

    it("should update existing booking in store when updated", async () => {
      const originalBooking = createMockBooking("booking-1", {
        bookingStatus: "Active",
        updatedAt: "2024-01-15T09:00:00Z",
      });

      useBookingStore.setState({
        bookings: [originalBooking],
      });

      const callback = jest.fn((data: BookingUpdatedEvent) => {
        useBookingStore.getState().updateBookingFromSocket(data.booking);
      });

      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingUpdated: callback })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(1);
      });

      const updatedBooking = createMockBooking("booking-1", {
        bookingStatus: "Cancelled",
        updatedAt: "2024-01-15T10:00:00Z",
      });

      const event: BookingUpdatedEvent = {
        booking: updatedBooking,
        clubId: "club-1",
        courtId: "court-1",
        previousStatus: "Active",
      };

      act(() => {
        emitToAllClients("bookingUpdated", event);
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(1);
        expect(bookings[0].bookingStatus).toBe("Cancelled");
        expect(bookings[0].updatedAt).toBe("2024-01-15T10:00:00Z");
      });
    });
  });

  describe("Booking Deleted Events - Multi-Client", () => {
    it("should notify all clients when a booking is deleted", async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingDeleted: callback1 })
      );
      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingDeleted: callback2 })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(2);
      });

      const event: BookingDeletedEvent = {
        bookingId: "booking-1",
        clubId: "club-1",
        courtId: "court-1",
      };

      act(() => {
        emitToAllClients("bookingDeleted", event);
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      await waitFor(() => {
        expect(callback1).toHaveBeenCalledWith(event);
        expect(callback2).toHaveBeenCalledWith(event);
      });
    });

    it("should remove booking from store when deleted", async () => {
      useBookingStore.setState({
        bookings: [
          createMockBooking("booking-1"),
          createMockBooking("booking-2"),
        ],
      });

      const callback = jest.fn((data: BookingDeletedEvent) => {
        useBookingStore.getState().removeBookingFromSocket(data.bookingId);
      });

      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingDeleted: callback })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(1);
      });

      const event: BookingDeletedEvent = {
        bookingId: "booking-1",
        clubId: "club-1",
        courtId: "court-1",
      };

      act(() => {
        emitToAllClients("bookingDeleted", event);
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(1);
        expect(bookings.find((b) => b.id === "booking-1")).toBeUndefined();
        expect(bookings.find((b) => b.id === "booking-2")).toBeTruthy();
      });
    });
  });

  describe("Edge Cases - Reconnection", () => {
    it("should handle client disconnect and reconnect", async () => {
      const onReconnect = jest.fn();
      const { result } = renderHook(() =>
        useSocketIO({ autoConnect: true, onReconnect })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(1);
        expect(result.current.isConnected).toBe(false); // Initial state
      });

      const socket = mockSockets[0];

      // Simulate connection
      act(() => {
        const connectHandler = socket.on.mock.calls.find(
          (call: any) => call[0] === "connect"
        )?.[1];
        if (connectHandler) connectHandler();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate disconnection
      act(() => {
        const disconnectHandler = socket.on.mock.calls.find(
          (call: any) => call[0] === "disconnect"
        )?.[1];
        if (disconnectHandler) disconnectHandler();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Simulate reconnection
      act(() => {
        const reconnectHandler = socket.io.on.mock.calls.find(
          (call: any) => call[0] === "reconnect"
        )?.[1];
        if (reconnectHandler) reconnectHandler(2); // 2 attempts
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(onReconnect).toHaveBeenCalled();
      });
    });

    it("should trigger data sync callback on reconnect", async () => {
      const onReconnect = jest.fn();
      renderHook(() =>
        useSocketIO({ autoConnect: true, onReconnect })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(1);
      });

      const socket = mockSockets[0];

      // Simulate reconnection
      act(() => {
        const reconnectHandler = socket.io.on.mock.calls.find(
          (call: any) => call[0] === "reconnect"
        )?.[1];
        if (reconnectHandler) reconnectHandler(1);
      });

      await waitFor(() => {
        expect(onReconnect).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Edge Cases - Rapid Consecutive Events", () => {
    it("should debounce rapid consecutive booking updates", async () => {
      const callback = jest.fn();
      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingUpdated: callback, debounceMs: 300 })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(1);
      });

      const booking1 = createMockBooking("booking-1", {
        bookingStatus: "Active",
        updatedAt: "2024-01-15T10:00:00Z",
      });
      const booking2 = createMockBooking("booking-1", {
        bookingStatus: "Pending",
        updatedAt: "2024-01-15T10:00:01Z",
      });
      const booking3 = createMockBooking("booking-1", {
        bookingStatus: "Cancelled",
        updatedAt: "2024-01-15T10:00:02Z",
      });

      // Emit 3 rapid updates
      act(() => {
        emitToAllClients("bookingUpdated", {
          booking: booking1,
          clubId: "club-1",
          courtId: "court-1",
          previousStatus: "New",
        });
      });

      act(() => {
        emitToAllClients("bookingUpdated", {
          booking: booking2,
          clubId: "club-1",
          courtId: "court-1",
          previousStatus: "Active",
        });
      });

      act(() => {
        emitToAllClients("bookingUpdated", {
          booking: booking3,
          clubId: "club-1",
          courtId: "court-1",
          previousStatus: "Pending",
        });
      });

      // Wait for debounce to complete
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Should only be called once with the latest data due to debouncing
      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith({
          booking: booking3,
          clubId: "club-1",
          courtId: "court-1",
          previousStatus: "Pending",
        });
      });
    });

    it("should prevent UI flickering by using debouncing", async () => {
      useBookingStore.setState({
        bookings: [],
      });
      
      const callback = jest.fn((data: BookingCreatedEvent) => {
        useBookingStore.getState().updateBookingFromSocket(data.booking);
      });

      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingCreated: callback, debounceMs: 300 })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(1);
      });

      // Emit 5 rapid booking created events
      for (let i = 1; i <= 5; i++) {
        act(() => {
          emitToAllClients("bookingCreated", {
            booking: createMockBooking(`booking-${i}`),
            clubId: "club-1",
            courtId: "court-1",
          });
        });
      }

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Should only update once (debounced)
      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        // The last event should be processed
        expect(callback).toHaveBeenLastCalledWith({
          booking: createMockBooking("booking-5"),
          clubId: "club-1",
          courtId: "court-1",
        });
      });
    });
  });

  describe("Edge Cases - No Duplication", () => {
    it("should not duplicate bookings when receiving same event multiple times", async () => {
      const booking = createMockBooking("booking-1");
      
      useBookingStore.setState({
        bookings: [],
      });

      const callback = jest.fn((data: BookingCreatedEvent) => {
        useBookingStore.getState().updateBookingFromSocket(data.booking);
      });

      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingCreated: callback })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(1);
      });

      const event: BookingCreatedEvent = {
        booking,
        clubId: "club-1",
        courtId: "court-1",
      };

      // Emit the same event 3 times
      act(() => {
        emitToAllClients("bookingCreated", event);
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      act(() => {
        emitToAllClients("bookingCreated", event);
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      act(() => {
        emitToAllClients("bookingCreated", event);
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      // Should only have one booking (no duplicates)
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(1);
        expect(bookings[0].id).toBe("booking-1");
      });
    });

    it("should ignore outdated updates based on timestamp", async () => {
      const newerBooking = createMockBooking("booking-1", {
        bookingStatus: "Active",
        updatedAt: "2024-01-15T10:00:00Z",
      });

      useBookingStore.setState({
        bookings: [newerBooking],
      });

      const callback = jest.fn((data: BookingUpdatedEvent) => {
        useBookingStore.getState().updateBookingFromSocket(data.booking);
      });

      renderHook(() =>
        useSocketIO({ autoConnect: true, onBookingUpdated: callback })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(1);
      });

      // Try to apply an older update
      const olderBooking = createMockBooking("booking-1", {
        bookingStatus: "Cancelled",
        updatedAt: "2024-01-15T09:00:00Z", // Older timestamp
      });

      act(() => {
        emitToAllClients("bookingUpdated", {
          booking: olderBooking,
          clubId: "club-1",
          courtId: "court-1",
          previousStatus: "New",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      // Booking should remain unchanged (newer version preserved)
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(1);
        expect(bookings[0].bookingStatus).toBe("Active");
        expect(bookings[0].updatedAt).toBe("2024-01-15T10:00:00Z");
      });
    });
  });

  describe("UI State Verification", () => {
    it("should maintain consistent UI state across all event types", async () => {
      useBookingStore.setState({
        bookings: [
          createMockBooking("booking-1"),
          createMockBooking("booking-2"),
        ],
      });
      
      renderHook(() =>
        useSocketIO({
          autoConnect: true,
          onBookingCreated: (data) => useBookingStore.getState().updateBookingFromSocket(data.booking),
          onBookingUpdated: (data) => useBookingStore.getState().updateBookingFromSocket(data.booking),
          onBookingDeleted: (data) => useBookingStore.getState().removeBookingFromSocket(data.bookingId),
        })
      );

      await waitFor(() => {
        expect(mockSockets.length).toBe(1);
      });

      // Initial state: 2 bookings
      expect(useBookingStore.getState().bookings.length).toBe(2);

      // Create a new booking
      act(() => {
        emitToAllClients("bookingCreated", {
          booking: createMockBooking("booking-3"),
          clubId: "club-1",
          courtId: "court-1",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      // Should have 3 bookings now
      await waitFor(() => {
        expect(useBookingStore.getState().bookings.length).toBe(3);
      });

      // Update booking-2
      act(() => {
        emitToAllClients("bookingUpdated", {
          booking: createMockBooking("booking-2", {
            bookingStatus: "Cancelled",
            updatedAt: "2024-01-15T11:00:00Z",
          }),
          clubId: "club-1",
          courtId: "court-1",
          previousStatus: "Active",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      // Should still have 3 bookings, but booking-2 updated
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(3);
        const booking2 = bookings.find((b) => b.id === "booking-2");
        expect(booking2?.bookingStatus).toBe("Cancelled");
      });

      // Delete booking-1
      act(() => {
        emitToAllClients("bookingDeleted", {
          bookingId: "booking-1",
          clubId: "club-1",
          courtId: "court-1",
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 350));

      // Should have 2 bookings now
      await waitFor(() => {
        const bookings = useBookingStore.getState().bookings;
        expect(bookings.length).toBe(2);
        expect(bookings.find((b) => b.id === "booking-1")).toBeUndefined();
        expect(bookings.find((b) => b.id === "booking-2")).toBeTruthy();
        expect(bookings.find((b) => b.id === "booking-3")).toBeTruthy();
      });
    });
  });
});
