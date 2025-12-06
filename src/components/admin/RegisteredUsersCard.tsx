"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { RegisteredUsersResponse } from "@/app/api/admin/dashboard/registered-users/route";
import "./RegisteredUsersCard.css";

interface RegisteredUsersCardProps {
  className?: string;
}

/**
 * Registered Users Card Component
 * 
 * Displays the total number of real, active platform users (players)
 * excluding system/admin accounts, with a trend visualization for the last 30 days.
 * 
 * Access: Root Admin only (enforced server-side)
 */
export function RegisteredUsersCard({ className = "" }: RegisteredUsersCardProps) {
  const t = useTranslations("rootAdmin.dashboard");
  const [data, setData] = useState<RegisteredUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/dashboard/registered-users");
        
        if (!response.ok) {
          throw new Error("Failed to fetch registered users data");
        }
        
        const result: RegisteredUsersResponse = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={`im-registered-users-card ${className}`.trim()}>
        <div className="im-registered-users-loading">
          <div className="im-registered-users-spinner" />
          <span className="im-registered-users-loading-text">{t("loading", { ns: "common" })}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`im-registered-users-card ${className}`.trim()}>
        <div className="im-registered-users-error">
          <p>{t("failedToLoadRegisteredUsers")}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Calculate max value for scaling the sparkline
  const maxCount = Math.max(...data.trend.map((d) => d.count), 1);

  return (
    <div className={`im-registered-users-card ${className}`.trim()}>
      <div className="im-registered-users-header">
        <div className="im-registered-users-icon-container">
          <svg
            className="im-registered-users-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="im-registered-users-content">
          <h3 className="im-registered-users-value">{data.totalUsers.toLocaleString()}</h3>
          <p className="im-registered-users-title">{t("registeredUsers")}</p>
        </div>
      </div>

      {/* Sparkline Trend Visualization */}
      <div className="im-registered-users-trend">
        <div className="im-registered-users-sparkline" role="img" aria-label="User registration trend for the last 30 days">
          <svg
            viewBox={`0 0 ${data.trend.length} 40`}
            preserveAspectRatio="none"
            className="im-registered-users-sparkline-svg"
          >
            {/* Background bars */}
            {data.trend.map((point, index) => {
              const height = maxCount > 0 ? (point.count / maxCount) * 35 : 0;
              const y = 40 - height;

              return (
                <rect
                  key={`bar-${index}`}
                  x={index}
                  y={y}
                  width="0.8"
                  height={height}
                  className="im-sparkline-bar"
                />
              );
            })}

            {/* Line path */}
            <polyline
              points={data.trend
                .map((point, index) => {
                  const x = index + 0.4; // Center of bar
                  const height = maxCount > 0 ? (point.count / maxCount) * 35 : 0;
                  const y = 40 - height;
                  return `${x},${y}`;
                })
                .join(" ")}
              className="im-sparkline-line"
            />
          </svg>
        </div>
        <p className="im-registered-users-trend-label">{t("trendLabel")}</p>
      </div>
    </div>
  );
}
