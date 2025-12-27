/**
 * ClubStatisticsCard Component
 * 
 * Displays occupancy statistics for a single club with visual indicators
 * Follows im-* CSS class pattern for dark theme consistency
 */

import { useTranslations } from "next-intl";
import "./ClubStatisticsCard.css";

export interface ClubStatisticsCardProps {
  clubId: string;
  clubName: string;
  currentOccupancy: number; // Average % for current month
  changePercent: number | null; // Change compared to previous month
  onClick?: () => void;
}

/**
 * Get color class based on occupancy percentage
 */
function getOccupancyColorClass(occupancy: number): string {
  if (occupancy >= 80) return "im-stat-high";
  if (occupancy >= 50) return "im-stat-medium";
  return "im-stat-low";
}

/**
 * Get change indicator class and symbol
 */
function getChangeIndicator(changePercent: number | null): { symbol: string; className: string } {
  if (changePercent === null) {
    return { symbol: "—", className: "im-stat-change-neutral" };
  }
  if (changePercent > 0) {
    return { symbol: "↑", className: "im-stat-change-positive" };
  }
  if (changePercent < 0) {
    return { symbol: "↓", className: "im-stat-change-negative" };
  }
  return { symbol: "→", className: "im-stat-change-neutral" };
}

export function ClubStatisticsCard({
  clubName,
  currentOccupancy,
  changePercent,
  onClick,
}: ClubStatisticsCardProps) {
  const t = useTranslations("orgDetail");
  const occupancyColorClass = getOccupancyColorClass(currentOccupancy);
  const changeIndicator = getChangeIndicator(changePercent);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`im-club-stat-card ${onClick ? "im-club-stat-card--clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-label={`${clubName} statistics`}
    >
      <div className="im-club-stat-header">
        <h3 className="im-club-stat-name">{clubName}</h3>
      </div>

      <div className="im-club-stat-content">
        {/* Current Occupancy */}
        <div className="im-club-stat-main">
          <div className={`im-club-stat-value ${occupancyColorClass}`}>
            {currentOccupancy.toFixed(1)}%
          </div>
          <div className="im-club-stat-label">{t("currentOccupancy")}</div>
        </div>

        {/* Visual Progress Bar */}
        <div className="im-club-stat-progress">
          <div
            className={`im-club-stat-progress-bar ${occupancyColorClass}`}
            style={{ width: `${Math.min(currentOccupancy, 100)}%` }}
            role="progressbar"
            aria-valuenow={currentOccupancy}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Occupancy percentage"
          />
        </div>

        {/* Change Indicator */}
        <div className="im-club-stat-change">
          <span className={`im-club-stat-change-badge ${changeIndicator.className}`}>
            <span className="im-club-stat-change-symbol" aria-hidden="true">
              {changeIndicator.symbol}
            </span>
            <span className="im-club-stat-change-value">
              {changePercent !== null ? `${Math.abs(changePercent).toFixed(1)}%` : "N/A"}
            </span>
          </span>
          <span className="im-club-stat-change-label">{t("vsLastMonth")}</span>
        </div>
      </div>
    </div>
  );
}
