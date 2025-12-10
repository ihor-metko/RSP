/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import MetricCardSkeleton from "@/components/ui/skeletons/MetricCardSkeleton";
import StatListSkeleton from "@/components/ui/skeletons/StatListSkeleton";
import GraphSkeleton, { GraphEmptyState } from "@/components/ui/skeletons/GraphSkeleton";
import DashboardPlaceholder from "@/components/ui/skeletons/DashboardPlaceholder";

describe("Skeleton Components", () => {
  describe("MetricCardSkeleton", () => {
    it("should render with default props", () => {
      render(<MetricCardSkeleton />);
      
      const skeleton = screen.getByRole("status");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute("aria-busy", "true");
      expect(skeleton).toHaveAttribute("aria-live", "polite");
    });

    it("should render with size variants", () => {
      const { rerender } = render(<MetricCardSkeleton size="sm" />);
      let skeleton = screen.getByRole("status");
      expect(skeleton).toHaveClass("im-metric-card-skeleton--sm");

      rerender(<MetricCardSkeleton size="md" />);
      skeleton = screen.getByRole("status");
      expect(skeleton).toHaveClass("im-metric-card-skeleton--md");

      rerender(<MetricCardSkeleton size="lg" />);
      skeleton = screen.getByRole("status");
      expect(skeleton).toHaveClass("im-metric-card-skeleton--lg");
    });

    it("should render with variant types", () => {
      const { rerender } = render(<MetricCardSkeleton variant="stat" />);
      expect(screen.getByRole("status")).toBeInTheDocument();

      rerender(<MetricCardSkeleton variant="money" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should include screen reader text", () => {
      render(<MetricCardSkeleton />);
      expect(screen.getByText("Loading metric data...")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<MetricCardSkeleton className="custom-class" />);
      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveClass("custom-class");
    });
  });

  describe("StatListSkeleton", () => {
    it("should render with default count", () => {
      render(<StatListSkeleton />);
      
      const skeleton = screen.getByRole("status");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute("aria-busy", "true");
    });

    it("should render specified number of rows", () => {
      const { container } = render(<StatListSkeleton count={5} />);
      const items = container.querySelectorAll(".im-stat-list-skeleton-item");
      expect(items).toHaveLength(5);
    });

    it("should render with custom count", () => {
      const { container } = render(<StatListSkeleton count={3} />);
      const items = container.querySelectorAll(".im-stat-list-skeleton-item");
      expect(items).toHaveLength(3);
    });

    it("should include screen reader text", () => {
      render(<StatListSkeleton />);
      expect(screen.getByText("Loading statistics...")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<StatListSkeleton className="custom-class" />);
      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveClass("custom-class");
    });
  });

  describe("GraphSkeleton", () => {
    it("should render with default props", () => {
      render(<GraphSkeleton />);
      
      const skeleton = screen.getByRole("status");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute("aria-busy", "true");
      expect(skeleton).toHaveAttribute("aria-live", "polite");
    });

    it("should show header when showHeader is true", () => {
      const { container } = render(<GraphSkeleton showHeader={true} />);
      const header = container.querySelector(".im-graph-skeleton-header");
      expect(header).toBeInTheDocument();
    });

    it("should hide header when showHeader is false", () => {
      const { container } = render(<GraphSkeleton showHeader={false} />);
      const header = container.querySelector(".im-graph-skeleton-header");
      expect(header).not.toBeInTheDocument();
    });

    it("should include screen reader text", () => {
      render(<GraphSkeleton />);
      expect(screen.getByText("Loading chart data...")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<GraphSkeleton className="custom-class" />);
      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveClass("custom-class");
    });

    it("should render grid lines", () => {
      const { container } = render(<GraphSkeleton />);
      const gridLines = container.querySelectorAll(".im-graph-skeleton-grid-line");
      expect(gridLines.length).toBeGreaterThan(0);
    });

    it("should render x-axis ticks", () => {
      const { container } = render(<GraphSkeleton />);
      const ticks = container.querySelectorAll(".im-graph-skeleton-x-tick");
      expect(ticks.length).toBeGreaterThan(0);
    });
  });

  describe("GraphEmptyState", () => {
    it("should render with default message", () => {
      render(<GraphEmptyState />);
      
      const emptyState = screen.getByRole("status");
      expect(emptyState).toBeInTheDocument();
      expect(screen.getByText("Not enough data yet")).toBeInTheDocument();
    });

    it("should render with custom message", () => {
      render(<GraphEmptyState message="Custom message" />);
      expect(screen.getByText("Custom message")).toBeInTheDocument();
    });

    it("should render with custom description", () => {
      render(<GraphEmptyState description="Custom description text" />);
      expect(screen.getByText("Custom description text")).toBeInTheDocument();
    });

    it("should render icon", () => {
      const { container } = render(<GraphEmptyState />);
      const icon = container.querySelector(".im-graph-empty-icon svg");
      expect(icon).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<GraphEmptyState className="custom-class" />);
      const emptyState = screen.getByRole("status");
      expect(emptyState).toHaveClass("custom-class");
    });
  });

  describe("DashboardPlaceholder", () => {
    it("should render with default props", () => {
      const { container } = render(<DashboardPlaceholder />);
      
      const placeholder = container.querySelector('.im-dashboard-placeholder[role="status"]');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveAttribute("aria-busy", "true");
      expect(placeholder).toHaveAttribute("aria-live", "polite");
    });

    it("should render specified number of metric cards", () => {
      const { container } = render(<DashboardPlaceholder metricCount={6} />);
      const metrics = container.querySelectorAll(".im-metric-card-skeleton");
      expect(metrics).toHaveLength(6);
    });

    it("should render graphs when showGraphs is true", () => {
      const { container } = render(<DashboardPlaceholder showGraphs={true} />);
      const graphs = container.querySelectorAll(".im-graph-skeleton");
      expect(graphs.length).toBeGreaterThan(0);
    });

    it("should not render graphs when showGraphs is false", () => {
      const { container } = render(<DashboardPlaceholder showGraphs={false} />);
      const graphs = container.querySelectorAll(".im-graph-skeleton");
      expect(graphs).toHaveLength(0);
    });

    it("should render specified number of graphs", () => {
      const { container } = render(<DashboardPlaceholder graphCount={3} />);
      const graphs = container.querySelectorAll(".im-graph-skeleton");
      expect(graphs).toHaveLength(3);
    });

    it("should show header when showHeader is true", () => {
      const { container } = render(<DashboardPlaceholder showHeader={true} />);
      const header = container.querySelector(".im-dashboard-placeholder-header");
      expect(header).toBeInTheDocument();
    });

    it("should hide header when showHeader is false", () => {
      const { container } = render(<DashboardPlaceholder showHeader={false} />);
      const header = container.querySelector(".im-dashboard-placeholder-header");
      expect(header).not.toBeInTheDocument();
    });

    it("should include screen reader text", () => {
      const { container } = render(<DashboardPlaceholder />);
      const srText = container.querySelector('.im-dashboard-placeholder .sr-only');
      expect(srText).toHaveTextContent("Loading dashboard...");
    });

    it("should apply custom className", () => {
      const { container } = render(<DashboardPlaceholder className="custom-class" />);
      const placeholder = container.querySelector('.im-dashboard-placeholder');
      expect(placeholder).toHaveClass("custom-class");
    });
  });

  describe("Accessibility", () => {
    it("MetricCardSkeleton should have proper ARIA attributes", () => {
      const { container } = render(<MetricCardSkeleton />);
      const skeleton = container.querySelector('[role="status"]');
      expect(skeleton).toHaveAttribute("aria-busy", "true");
      expect(skeleton).toHaveAttribute("aria-live", "polite");
    });

    it("StatListSkeleton should have proper ARIA attributes", () => {
      const { container } = render(<StatListSkeleton />);
      const skeleton = container.querySelector('[role="status"]');
      expect(skeleton).toHaveAttribute("aria-busy", "true");
      expect(skeleton).toHaveAttribute("aria-live", "polite");
    });

    it("GraphSkeleton should have proper ARIA attributes", () => {
      const { container } = render(<GraphSkeleton />);
      const skeleton = container.querySelector('[role="status"]');
      expect(skeleton).toHaveAttribute("aria-busy", "true");
      expect(skeleton).toHaveAttribute("aria-live", "polite");
    });

    it("DashboardPlaceholder should have proper ARIA attributes", () => {
      const { container } = render(<DashboardPlaceholder />);
      const placeholder = container.querySelector('.im-dashboard-placeholder[role="status"]');
      expect(placeholder).toHaveAttribute("aria-busy", "true");
      expect(placeholder).toHaveAttribute("aria-live", "polite");
    });

    it("All skeletons should have screen reader only text", () => {
      const { container: metricContainer } = render(<MetricCardSkeleton />);
      const { container: statContainer } = render(<StatListSkeleton />);
      const { container: graphContainer } = render(<GraphSkeleton />);
      const { container: dashContainer } = render(<DashboardPlaceholder />);

      expect(metricContainer.querySelector(".sr-only")).toBeInTheDocument();
      expect(statContainer.querySelector(".sr-only")).toBeInTheDocument();
      expect(graphContainer.querySelector(".sr-only")).toBeInTheDocument();
      expect(dashContainer.querySelector(".sr-only")).toBeInTheDocument();
    });
  });
});
