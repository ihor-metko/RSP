"use client";

import type { CourtDetail, ClubBusinessHour } from "./types";
import "./CourtScheduleBlock.css";

interface CourtScheduleBlockProps {
  court: CourtDetail;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(time: string | null): string {
  if (!time) return "-";
  return time;
}

export function CourtScheduleBlock({ court }: CourtScheduleBlockProps) {
  const businessHours = court.club?.businessHours || [];
  const hasHours = businessHours.length > 0;

  // Create a map for quick lookup
  const hoursMap = new Map<number, ClubBusinessHour>();
  businessHours.forEach(hour => {
    hoursMap.set(hour.dayOfWeek, hour);
  });

  return (
    <div className="im-block im-court-schedule-block">
      <div className="im-block-header">
        <h2 className="im-block-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          Schedule
        </h2>
        <span className="im-schedule-info">Club hours apply</span>
      </div>

      <div className="im-block-content">
        {hasHours ? (
          <div className="im-schedule-grid">
            {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
              const hours = hoursMap.get(dayOfWeek);
              const isClosed = hours?.isClosed ?? true;
              const openTime = hours?.openTime;
              const closeTime = hours?.closeTime;

              return (
                <div
                  key={dayOfWeek}
                  className={`im-schedule-row ${isClosed ? "im-schedule-row--closed" : ""}`}
                >
                  <span className="im-schedule-day">
                    <span className="im-schedule-day-full">{DAY_NAMES[dayOfWeek]}</span>
                    <span className="im-schedule-day-short">{DAY_SHORT_NAMES[dayOfWeek]}</span>
                  </span>
                  <span className="im-schedule-hours">
                    {isClosed ? (
                      <span className="im-schedule-closed">Closed</span>
                    ) : (
                      <span className="im-schedule-open">
                        {formatTime(openTime ?? null)} - {formatTime(closeTime ?? null)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="im-schedule-empty">
            <p className="im-schedule-empty-text">
              No business hours configured for the club.
            </p>
          </div>
        )}

        <div className="im-block-meta">
          Schedule follows club business hours. Courts available during open hours.
        </div>
      </div>
    </div>
  );
}
