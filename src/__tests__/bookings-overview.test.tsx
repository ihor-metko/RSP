/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import BookingsOverview from "@/components/admin/BookingsOverview";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "bookingsOverview.title": "Bookings Overview",
      "bookingsOverview.description": "Summary of active and past bookings",
      "bookingsOverview.activeBookings": "Active / Upcoming Bookings",
      "bookingsOverview.pastBookings": "Past Bookings",
      "common.loading": "Loading...",
    };
    return translations[key] || key;
  },
}));

describe("BookingsOverview", () => {
  it("should render loading state", () => {
    render(
      <BookingsOverview
        activeBookings={0}
        pastBookings={0}
        loading={true}
      />
    );

    expect(screen.getByText("Bookings Overview")).toBeInTheDocument();
  });

  it("should render booking counts", () => {
    render(
      <BookingsOverview
        activeBookings={25}
        pastBookings={100}
      />
    );

    expect(screen.getByText("Bookings Overview")).toBeInTheDocument();
    expect(screen.getByText("Summary of active and past bookings")).toBeInTheDocument();
    expect(screen.getByText("Active / Upcoming Bookings")).toBeInTheDocument();
    expect(screen.getByText("Past Bookings")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("should render breakdown when provided", () => {
    const activeBreakdown = [
      { label: "Across clubs", count: 5 },
    ];
    const pastBreakdown = [
      { label: "Across courts", count: 10 },
    ];

    render(
      <BookingsOverview
        activeBookings={25}
        pastBookings={100}
        activeBreakdown={activeBreakdown}
        pastBreakdown={pastBreakdown}
      />
    );

    expect(screen.getByText("Across clubs")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Across courts")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("should format large numbers with locale", () => {
    render(
      <BookingsOverview
        activeBookings={1234567}
        pastBookings={7654321}
      />
    );

    // Check if numbers are formatted (e.g., with commas)
    expect(screen.getByText(/1,234,567|1 234 567/)).toBeInTheDocument();
    expect(screen.getByText(/7,654,321|7 654 321/)).toBeInTheDocument();
  });

  it("should render with zero bookings", () => {
    render(
      <BookingsOverview
        activeBookings={0}
        pastBookings={0}
      />
    );

    expect(screen.getByText("Bookings Overview")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
  });
});
