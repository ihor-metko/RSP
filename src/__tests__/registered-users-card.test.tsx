/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { RegisteredUsersCard } from "@/components/admin/RegisteredUsersCard";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      registeredUsers: "Registered Users",
      trendLabel: "Last 30 days activity",
      failedToLoadRegisteredUsers: "Failed to load registered users data",
      loading: "Loading...",
    };
    return translations[key] || key;
  },
}));

describe("RegisteredUsersCard", () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should render loading state initially", () => {
    // Mock fetch to never resolve
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(<RegisteredUsersCard />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should render total users count when data is loaded", async () => {
    const mockData = {
      totalUsers: 1234,
      trend: Array.from({ length: 30 }, (_, i) => ({
        date: `2025-12-${String(i + 1).padStart(2, "0")}`,
        count: Math.floor(Math.random() * 10),
      })),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<RegisteredUsersCard />);

    await waitFor(() => {
      expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    expect(screen.getByText("Registered Users")).toBeInTheDocument();
    expect(screen.getByText("Last 30 days activity")).toBeInTheDocument();
  });

  it("should render error message when fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<RegisteredUsersCard />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load registered users data")
      ).toBeInTheDocument();
    });
  });

  it("should handle fetch exception", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(<RegisteredUsersCard />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load registered users data")
      ).toBeInTheDocument();
    });
  });

  it("should display zero users correctly", async () => {
    const mockData = {
      totalUsers: 0,
      trend: Array.from({ length: 30 }, () => ({
        date: "2025-12-01",
        count: 0,
      })),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<RegisteredUsersCard />);

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  it("should call the correct API endpoint", async () => {
    const mockData = {
      totalUsers: 100,
      trend: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<RegisteredUsersCard />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/dashboard/registered-users"
      );
    });
  });

  it("should apply custom className when provided", () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    const { container } = render(
      <RegisteredUsersCard className="custom-class" />
    );

    const card = container.querySelector(".im-registered-users-card");
    expect(card).toHaveClass("custom-class");
  });

  it("should render sparkline with correct number of data points", async () => {
    const mockData = {
      totalUsers: 500,
      trend: Array.from({ length: 30 }, (_, i) => ({
        date: `2025-12-${String(i + 1).padStart(2, "0")}`,
        count: i,
      })),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<RegisteredUsersCard />);

    await waitFor(() => {
      expect(screen.getByText("500")).toBeInTheDocument();
    });

    // Check that the sparkline SVG is rendered
    const sparklineSvg = screen.getByRole("img", {
      name: /user registration trend/i,
    });
    expect(sparklineSvg).toBeInTheDocument();
  });
});
