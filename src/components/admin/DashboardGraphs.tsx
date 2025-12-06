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
import "./DashboardGraphs.css";

export interface DashboardGraphsProps {
  /** Whether the component is in loading state */
  loading?: boolean;
  /** Error message if any */
  error?: string;
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
 * - Fetches data from /api/admin/dashboard/graphs
 * - Adapts data scope based on admin role (Root, Organization, Club)
 * - Supports week and month time ranges
 * - Uses dark theme with im-* classes
 * - Responsive and accessible
 */
export default function DashboardGraphs({ loading: externalLoading, error: externalError }: DashboardGraphsProps) {
  const t = useTranslations();
  const [data, setData] = useState<DashboardGraphsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

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

  useEffect(() => {
    fetchGraphData(timeRange);
  }, [timeRange, fetchGraphData]);

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  // Use external loading/error states if provided
  const isLoading = externalLoading || loading;
  const errorMessage = externalError || error;

  if (isLoading) {
    return (
      <div className="im-dashboard-graphs-section">
        <div className="im-dashboard-graphs-header">
          <h2 className="im-dashboard-graphs-title">{t("dashboardGraphs.title")}</h2>
        </div>
        <div className="im-dashboard-graphs-loading">
          <div className="im-dashboard-graphs-loading-spinner" />
          <span className="im-dashboard-graphs-loading-text">{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="im-dashboard-graphs-section">
        <div className="im-dashboard-graphs-header">
          <h2 className="im-dashboard-graphs-title">{t("dashboardGraphs.title")}</h2>
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

  return (
    <div className="im-dashboard-graphs-section">
      <div className="im-dashboard-graphs-header">
        <h2 className="im-dashboard-graphs-title">{t("dashboardGraphs.title")}</h2>
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
          <div className="im-graph-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.bookingTrends}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--im-border-color)" />
                <XAxis
                  dataKey="label"
                  stroke="var(--im-text-secondary)"
                  tick={{ fill: "var(--im-text-secondary)" }}
                />
                <YAxis
                  stroke="var(--im-text-secondary)"
                  tick={{ fill: "var(--im-text-secondary)" }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="bookings"
                  name={t("dashboardGraphs.bookings")}
                  fill="var(--im-primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Users Graph */}
        <div className="im-graph-card">
          <h3 className="im-graph-card-title">{t("dashboardGraphs.activeUsers")}</h3>
          <p className="im-graph-card-description">{t("dashboardGraphs.activeUsersDesc")}</p>
          <div className="im-graph-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={data.activeUsers}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--im-border-color)" />
                <XAxis
                  dataKey="label"
                  stroke="var(--im-text-secondary)"
                  tick={{ fill: "var(--im-text-secondary)" }}
                />
                <YAxis
                  stroke="var(--im-text-secondary)"
                  tick={{ fill: "var(--im-text-secondary)" }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  name={t("dashboardGraphs.users")}
                  stroke="var(--im-success)"
                  strokeWidth={2}
                  dot={{ fill: "var(--im-success)", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
