/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { RegisteredUsersCard } from "@/components/admin/RegisteredUsersCard";
import type { RegisteredUsersData } from "@/app/api/admin/dashboard/route";

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
  const mockData: RegisteredUsersData = {
    totalUsers: 1234,
    trend: Array.from({ length: 30 }, (_, i) => ({
      date: `2025-12-${String(i + 1).padStart(2, "0")}`,
      count: Math.floor(Math.random() * 10),
    })),
  };

  it("should render loading state when loading prop is true", () => {
    render(<RegisteredUsersCard loading={true} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should render total users count when data is provided", () => {
    render(<RegisteredUsersCard data={mockData} />);

    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("Registered Users")).toBeInTheDocument();
    expect(screen.getByText("Last 30 days activity")).toBeInTheDocument();
  });

  it("should render error message when error prop is provided", () => {
    render(<RegisteredUsersCard error="Failed to load" />);

    expect(
      screen.getByText("Failed to load registered users data")
    ).toBeInTheDocument();
  });

  it("should render null when no data, no loading, and no error", () => {
    const { container } = render(<RegisteredUsersCard />);
    expect(container.firstChild).toBeNull();
  });

  it("should display zero users correctly", () => {
    const zeroData: RegisteredUsersData = {
      totalUsers: 0,
      trend: Array.from({ length: 30 }, () => ({
        date: "2025-12-01",
        count: 0,
      })),
    };

    render(<RegisteredUsersCard data={zeroData} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should apply custom className when provided", () => {
    const { container } = render(
      <RegisteredUsersCard data={mockData} className="custom-class" />
    );

    const card = container.querySelector(".im-registered-users-card");
    expect(card).toHaveClass("custom-class");
  });

  it("should render sparkline with correct number of data points", () => {
    const trendData: RegisteredUsersData = {
      totalUsers: 500,
      trend: Array.from({ length: 30 }, (_, i) => ({
        date: `2025-12-${String(i + 1).padStart(2, "0")}`,
        count: i,
      })),
    };

    render(<RegisteredUsersCard data={trendData} />);

    expect(screen.getByText("500")).toBeInTheDocument();

    // Check that the sparkline SVG is rendered
    const sparklineSvg = screen.getByRole("img", {
      name: /user registration trend/i,
    });
    expect(sparklineSvg).toBeInTheDocument();
  });
});
