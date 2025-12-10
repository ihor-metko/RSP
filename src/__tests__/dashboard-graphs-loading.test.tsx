/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import DashboardGraphs from "@/components/admin/DashboardGraphs";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "common.loading": "Loading...",
      "dashboardGraphs.title": "Analytics",
      "dashboardGraphs.week": "Week",
      "dashboardGraphs.month": "Month",
      "dashboardGraphs.bookingTrends": "Booking Trends",
      "dashboardGraphs.bookingTrendsDesc": "Number of bookings created over time",
      "dashboardGraphs.activeUsers": "Active Users",
      "dashboardGraphs.activeUsersDesc": "Number of users who logged in",
      "dashboardGraphs.bookings": "Bookings",
      "dashboardGraphs.users": "Users",
      "dashboardGraphs.notEnoughData": "Not enough data yet",
      "dashboardGraphs.notEnoughDataDesc": "We need at least 3 data points to display a meaningful chart.",
      "dashboardGraphs.errorLoading": "Failed to load graph data",
    };
    return translations[key] || key;
  },
}));

// Mock skeleton and empty state components
jest.mock("@/components/ui/skeletons", () => ({
  GraphSkeleton: ({ showHeader }: { showHeader: boolean }) => (
    <div data-testid="graph-skeleton" data-show-header={showHeader}>
      Graph Skeleton
    </div>
  ),
  GraphEmptyState: ({ message, description }: { message: string; description: string }) => (
    <div data-testid="graph-empty-state">
      <p>{message}</p>
      <p>{description}</p>
    </div>
  ),
}));

// Mock recharts components
jest.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div>Line</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div>Bar</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>CartesianGrid</div>,
  Tooltip: () => <div>Tooltip</div>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Legend: () => <div>Legend</div>,
}));

describe("DashboardGraphs Loading and Empty States", () => {
  it("should render graph skeletons when loading prop is true", () => {
    render(<DashboardGraphs loading={true} />);
    
    const skeletons = screen.getAllByTestId("graph-skeleton");
    expect(skeletons).toHaveLength(2);
    
    // Verify both skeletons show headers
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveAttribute("data-show-header", "true");
    });
  });

  it("should show error message when error prop is provided", () => {
    render(<DashboardGraphs error="Failed to load" />);
    
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("should accept minPointsToRender prop", () => {
    // Test that component renders with custom minPointsToRender
    // The actual behavior is tested in integration tests
    const { container } = render(<DashboardGraphs loading={true} minPointsToRender={5} />);
    expect(container).toBeInTheDocument();
  });
});
