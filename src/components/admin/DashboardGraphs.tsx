"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DashboardGraphsResponse, TimeRange } from "@/types/graphs";
import { GraphSkeleton, GraphEmptyState, DEFAULT_MIN_POINTS_TO_RENDER } from "@/components/ui/skeletons";
import "./DashboardGraphs.css";

export interface DashboardGraphsProps {
  /**
   * Initial graph data (passed from parent to avoid redundant API call on mount).
   * This should contain the default week view data.
   */
  initialData?: DashboardGraphsResponse;
  /**
   * External loading state (optional).
   * Use this when you want to control loading from a parent component.
   * If not provided, the component manages its own loading state.
   */
  loading?: boolean;
  /**
   * External error message (optional).
   * Use this when you want to display errors from a parent component.
   * If not provided, the component manages its own error state.
   */
  error?: string;
  /**
   * Minimum data points required to render graphs.
   * If data has fewer points, shows empty state instead.
   * Default: 3
   */
  minPointsToRender?: number;
}

/**
 * Custom tooltip for the graphs
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="im-graph-tooltip">
      <p className="im-graph-tooltip-label">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="im-graph-tooltip-value" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

/**
 * DashboardGraphs Component
 *
 * Displays booking trends and active users graphs for admin dashboards.
 * - Receives initial data from parent component (week view by default)
 * - Only fetches from API when user switches time range
 * - Adapts data scope based on admin role (Root, Organization, Club)
 * - Supports week and month time ranges
 * - Uses dark theme with im-* classes
 * - Responsive and accessible
 */
export default function DashboardGraphs({
  initialData,
  loading: externalLoading,
  error: externalError,
  minPointsToRender = DEFAULT_MIN_POINTS_TO_RENDER,
}: DashboardGraphsProps) {
  const t = useTranslations();
  const [data, setData] = useState<DashboardGraphsResponse | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  // Set initial data when it becomes available (only runs once when initialData is provided)
  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
    }
  }, [initialData]);

  const fetchGraphData = useCallback(async (range: TimeRange) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/admin/dashboard/graphs?timeRange=${range}`);

      if (!response.ok) {
        throw new Error("Failed to fetch graph data");
      }

      const graphData: DashboardGraphsResponse = await response.json();
      setData(graphData);
    } catch (err) {
      setError(t("dashboardGraphs.errorLoading"));
      console.error("Error fetching graph data:", err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleTimeRangeChange = (range: TimeRange) => {
    // Only fetch if switching to a different range
    if (range !== timeRange) {
      setTimeRange(range);
      fetchGraphData(range);
    }
  };

  // Use external loading/error states if provided, otherwise use internal state
  const isLoading = externalLoading !== undefined ? externalLoading : loading;
  const errorMessage = externalError || error;

  if (isLoading && !errorMessage) {
    return (
      <div className="im-dashboard-graphs-section">
        <div className="im-dashboard-graphs-header">
          <h2 className="im-dashboard-graphs-title">{t("dashboardGraphs.title")}</h2>
          <p className="im-booking-overview-section-description">{t("dashboardGraphs.description")}</p>
        </div>
        <div className="im-dashboard-graphs-grid">
          <GraphSkeleton showHeader={true} />
          <GraphSkeleton showHeader={true} />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="im-dashboard-graphs-section">
        <div className="im-dashboard-graphs-header">
          <h2 className="im-dashboard-graphs-title">{t("dashboardGraphs.title")}</h2>
          <p className="im-booking-overview-section-description">{t("dashboardGraphs.description")}</p>
        </div>
        <div className="im-dashboard-graphs-error">
          <p>{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Check if we have enough data points to render meaningful graphs
  const hasEnoughBookingData = data.bookingTrends.length >= minPointsToRender;
  const hasEnoughUserData = data.activeUsers.length >= minPointsToRender;

  return (
    <div className="im-dashboard-graphs-section">
      <div className="im-dashboard-graphs-header">
        <div className="flex flex-col">
          <h2 className="im-dashboard-graphs-title">{t("dashboardGraphs.title")}</h2>
          <p className="im-booking-overview-section-description">{t("dashboardGraphs.description")}</p>
        </div>

        <div className="im-dashboard-graphs-controls">
          <button
            onClick={() => handleTimeRangeChange("week")}
            className={`im-graph-time-button ${timeRange === "week" ? "im-graph-time-button--active" : ""}`}
            aria-pressed={timeRange === "week"}
          >
            {t("dashboardGraphs.week")}
          </button>
          <button
            onClick={() => handleTimeRangeChange("month")}
            className={`im-graph-time-button ${timeRange === "month" ? "im-graph-time-button--active" : ""}`}
            aria-pressed={timeRange === "month"}
          >
            {t("dashboardGraphs.month")}
          </button>
        </div>
      </div>

      <div className="im-dashboard-graphs-grid">
        {/* Booking Trends Graph */}
        <div className="im-graph-card">
          <h3 className="im-graph-card-title">{t("dashboardGraphs.bookingTrends")}</h3>
          <p className="im-graph-card-description">{t("dashboardGraphs.bookingTrendsDesc")}</p>
          {hasEnoughBookingData ? (
            <div className="im-graph-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.bookingTrends}
                  margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--im-border-color)"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="var(--im-text-secondary)"
                    tick={{ fill: "var(--im-text-secondary)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--im-border-color)" }}
                  />
                  <YAxis
                    stroke="var(--im-text-secondary)"
                    tick={{ fill: "var(--im-text-secondary)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--im-border-color)" }}
                    allowDecimals={false}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{
                      paddingTop: '10px',
                      color: 'var(--im-text-primary)'
                    }}
                  />
                  <Bar
                    dataKey="bookings"
                    name={t("dashboardGraphs.bookings")}
                    fill="var(--im-primary)"
                    radius={[4, 4, 0, 0]}
                    minPointSize={2}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <GraphEmptyState
              message={t("dashboardGraphs.notEnoughData")}
              description={t("dashboardGraphs.notEnoughDataDesc")}
            />
          )}
        </div>

        {/* Active Users Graph */}
        <div className="im-graph-card">
          <h3 className="im-graph-card-title">{t("dashboardGraphs.activeUsers")}</h3>
          <p className="im-graph-card-description">{t("dashboardGraphs.activeUsersDesc")}</p>
          {hasEnoughUserData ? (
            <div className="im-graph-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={data.activeUsers}
                  margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--im-border-color)"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="var(--im-text-secondary)"
                    tick={{ fill: "var(--im-text-secondary)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--im-border-color)" }}
                  />
                  <YAxis
                    stroke="var(--im-text-secondary)"
                    tick={{ fill: "var(--im-text-secondary)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--im-border-color)" }}
                    allowDecimals={false}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{
                      paddingTop: '10px',
                      color: 'var(--im-text-primary)'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    name={t("dashboardGraphs.users")}
                    stroke="var(--im-success)"
                    strokeWidth={3}
                    dot={{ fill: "var(--im-success)", r: 5, strokeWidth: 2, stroke: "var(--im-success)" }}
                    activeDot={{ r: 8, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <GraphEmptyState
              message={t("dashboardGraphs.notEnoughData")}
              description={t("dashboardGraphs.notEnoughDataDesc")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
