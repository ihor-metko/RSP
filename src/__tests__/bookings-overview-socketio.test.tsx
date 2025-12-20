/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import BookingsOverview from "@/components/admin/BookingsOverview";
import * as toastModule from "@/lib/toast";

// Mock socket instance
let mockSocket: any;

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
      };
      return mockSocket;
    }),
  };
});

// Mock showToast
jest.mock("@/lib/toast", () => ({
  showToast: jest.fn(),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "bookingsOverview.title": "Bookings Overview",
      "bookingsOverview.description": "Summary of active and past bookings",
      "bookingsOverview.activeBookings": "Active / Upcoming Bookings",
      "bookingsOverview.pastBookings": "Past Bookings",
      "bookingsOverview.bookingCreatedToast": "New booking created",
      "bookingsOverview.bookingUpdatedToast": "Booking updated",
      "bookingsOverview.bookingDeletedToast": "Booking deleted",
      "common.loading": "Loading...",
    };
    return translations[key] || key;
  },
}));

describe("BookingsOverview with Socket.IO", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = null;
  });

  it("should not connect to socket when enableRealtime is false", async () => {
    render(
      <BookingsOverview
        activeBookings={10}
        pastBookings={20}
        enableRealtime={false}
      />
    );

    await waitFor(() => {
      expect(mockSocket).toBeNull();
    });
  });

  it("should connect to socket when enableRealtime is true", async () => {
    const mockRefresh = jest.fn();
    
    render(
      <BookingsOverview
        activeBookings={10}
        pastBookings={20}
        enableRealtime={true}
        onRefresh={mockRefresh}
      />
    );

    await waitFor(() => {
      expect(mockSocket).toBeTruthy();
      expect(mockSocket.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith("bookingCreated", expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith("bookingUpdated", expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith("bookingDeleted", expect.any(Function));
    });
  });

  it("should call onRefresh when booking events are received", async () => {
    const mockRefresh = jest.fn();
    const showToastSpy = jest.spyOn(toastModule, "showToast");

    render(
      <BookingsOverview
        activeBookings={10}
        pastBookings={20}
        enableRealtime={true}
        onRefresh={mockRefresh}
      />
    );

    await waitFor(() => {
      expect(mockSocket).toBeTruthy();
    });

    // Get the registered handler for bookingCreated
    const bookingCreatedHandler = mockSocket.on.mock.calls.find(
      (call: any) => call[0] === "bookingCreated"
    )?.[1];

    // Simulate a booking created event
    if (bookingCreatedHandler) {
      bookingCreatedHandler({
        booking: { id: "booking-1" },
        clubId: "club-1",
        courtId: "court-1",
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
        expect(showToastSpy).toHaveBeenCalledWith("New booking created", { type: "success" });
      });
    }
  });

  it("should cleanup socket listeners on unmount", async () => {
    const mockRefresh = jest.fn();

    const { unmount } = render(
      <BookingsOverview
        activeBookings={10}
        pastBookings={20}
        enableRealtime={true}
        onRefresh={mockRefresh}
      />
    );

    await waitFor(() => {
      expect(mockSocket).toBeTruthy();
    });

    const socketInstance = mockSocket;
    unmount();

    expect(socketInstance.off).toHaveBeenCalled();
    expect(socketInstance.disconnect).toHaveBeenCalled();
  });
});
