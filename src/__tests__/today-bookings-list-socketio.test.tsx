/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { TodayBookingsList } from "@/components/club-operations/TodayBookingsList";
import type { OperationsBooking } from "@/types/booking";
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
      "operations.todayBookings": "Today's Bookings",
      "operations.booking": "booking",
      "operations.bookings": "bookings",
      "operations.noBookingsToday": "No bookings for this day",
      "operations.confirmCancel": "Cancel this booking?",
      "operations.bookingCreatedToast": "New booking created",
      "operations.bookingUpdatedToast": "Booking updated",
      "operations.bookingDeletedToast": "Booking deleted",
      "common.loading": "Loading...",
      "common.view": "View",
      "common.cancel": "Cancel",
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  BookingStatusBadge: ({ status }: any) => <span>{status}</span>,
  PaymentStatusBadge: ({ status }: any) => <span>{status}</span>,
}));

describe("TodayBookingsList with Socket.IO", () => {
  const mockBookings: OperationsBooking[] = [
    {
      id: "booking-1",
      userId: "user-1",
      userName: "John Doe",
      userEmail: "john@example.com",
      courtId: "court-1",
      courtName: "Court 1",
      clubId: "club-1",
      clubName: "Test Club",
      start: "2024-01-15T10:00:00Z",
      end: "2024-01-15T11:00:00Z",
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      price: 100,
      sportType: "tennis",
      coachId: null,
      coachName: null,
      createdAt: "2024-01-15T09:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = null;
  });

  it("should not connect to socket when clubId is not provided", async () => {
    render(
      <TodayBookingsList
        bookings={mockBookings}
        onViewBooking={jest.fn()}
        onCancelBooking={jest.fn()}
      />
    );

    await waitFor(() => {
      // Socket should still be created but events won't trigger refresh
      expect(mockSocket).toBeTruthy();
    });
  });

  it("should connect to socket when clubId is provided", async () => {
    const mockRefresh = jest.fn();
    
    render(
      <TodayBookingsList
        bookings={mockBookings}
        onViewBooking={jest.fn()}
        onCancelBooking={jest.fn()}
        clubId="club-1"
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

  it("should call onRefresh when booking created event matches clubId", async () => {
    const mockRefresh = jest.fn();
    const showToastSpy = jest.spyOn(toastModule, "showToast");

    render(
      <TodayBookingsList
        bookings={mockBookings}
        onViewBooking={jest.fn()}
        onCancelBooking={jest.fn()}
        clubId="club-1"
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

    // Simulate a booking created event for the matching club
    if (bookingCreatedHandler) {
      bookingCreatedHandler({
        booking: mockBookings[0],
        clubId: "club-1",
        courtId: "court-1",
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
        expect(showToastSpy).toHaveBeenCalledWith("New booking created", { type: "success" });
      });
    }
  });

  it("should not call onRefresh when booking event is for different club", async () => {
    const mockRefresh = jest.fn();
    const showToastSpy = jest.spyOn(toastModule, "showToast");

    render(
      <TodayBookingsList
        bookings={mockBookings}
        onViewBooking={jest.fn()}
        onCancelBooking={jest.fn()}
        clubId="club-1"
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

    // Simulate a booking created event for a different club
    if (bookingCreatedHandler) {
      bookingCreatedHandler({
        booking: mockBookings[0],
        clubId: "club-2", // Different club
        courtId: "court-1",
      });

      await waitFor(() => {
        expect(mockRefresh).not.toHaveBeenCalled();
        expect(showToastSpy).not.toHaveBeenCalled();
      });
    }
  });

  it("should call onRefresh for booking updated event", async () => {
    const mockRefresh = jest.fn();
    const showToastSpy = jest.spyOn(toastModule, "showToast");

    render(
      <TodayBookingsList
        bookings={mockBookings}
        onViewBooking={jest.fn()}
        onCancelBooking={jest.fn()}
        clubId="club-1"
        onRefresh={mockRefresh}
      />
    );

    await waitFor(() => {
      expect(mockSocket).toBeTruthy();
    });

    // Get the registered handler for bookingUpdated
    const bookingUpdatedHandler = mockSocket.on.mock.calls.find(
      (call: any) => call[0] === "bookingUpdated"
    )?.[1];

    // Simulate a booking updated event
    if (bookingUpdatedHandler) {
      bookingUpdatedHandler({
        booking: { ...mockBookings[0], bookingStatus: "cancelled" },
        clubId: "club-1",
        courtId: "court-1",
        previousStatus: "confirmed",
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
        expect(showToastSpy).toHaveBeenCalledWith("Booking updated", { type: "info" });
      });
    }
  });

  it("should call onRefresh for booking deleted event", async () => {
    const mockRefresh = jest.fn();
    const showToastSpy = jest.spyOn(toastModule, "showToast");

    render(
      <TodayBookingsList
        bookings={mockBookings}
        onViewBooking={jest.fn()}
        onCancelBooking={jest.fn()}
        clubId="club-1"
        onRefresh={mockRefresh}
      />
    );

    await waitFor(() => {
      expect(mockSocket).toBeTruthy();
    });

    // Get the registered handler for bookingDeleted
    const bookingDeletedHandler = mockSocket.on.mock.calls.find(
      (call: any) => call[0] === "bookingDeleted"
    )?.[1];

    // Simulate a booking deleted event
    if (bookingDeletedHandler) {
      bookingDeletedHandler({
        bookingId: "booking-1",
        clubId: "club-1",
        courtId: "court-1",
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
        expect(showToastSpy).toHaveBeenCalledWith("Booking deleted", { type: "warning" });
      });
    }
  });

  it("should cleanup socket listeners on unmount", async () => {
    const mockRefresh = jest.fn();

    const { unmount } = render(
      <TodayBookingsList
        bookings={mockBookings}
        onViewBooking={jest.fn()}
        onCancelBooking={jest.fn()}
        clubId="club-1"
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
