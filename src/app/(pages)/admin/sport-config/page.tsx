"use client";

import { useTranslations } from "next-intl";
import { PageHeader, Card } from "@/components/ui";
import { getAllSports, getSportName, SportType } from "@/constants/sports";
import type { SportConfig } from "@/constants/sports";

/**
 * Sport Configuration Admin Page
 * 
 * Displays all sport configurations in a read-only format.
 * Shows slot durations, player limits, booking rules, and other sport-specific settings.
 */
export default function SportConfigPage() {
  const t = useTranslations();
  const sports = getAllSports();

  return (
    <main className="im-admin-sport-config-page">
      <PageHeader
        title={t("admin.sportConfig.title")}
        description={t("admin.sportConfig.description")}
      />

      <section className="rsp-content">
        <div className="im-sport-config-grid">
          {sports.map((sport) => (
            <SportConfigCard key={sport.type} sport={sport} />
          ))}
        </div>
      </section>

      <style jsx>{`
        .im-sport-config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        @media (max-width: 640px) {
          .im-sport-config-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

/**
 * Individual Sport Configuration Card
 */
function SportConfigCard({ sport }: { sport: SportConfig }) {
  const t = useTranslations();

  return (
    <Card className="im-sport-config-card">
      <div className="im-sport-config-header">
        <h3 className="im-sport-config-name">{getSportName(sport.type as SportType)}</h3>
        <span className="im-sport-config-badge">{sport.type}</span>
      </div>

      <div className="im-sport-config-content">
        {/* Slot Duration */}
        <div className="im-sport-config-section">
          <h4 className="im-sport-config-label">{t("admin.sportConfig.slotDuration")}</h4>
          <p className="im-sport-config-value">{sport.defaultSlotDuration} {t("common.minutes")}</p>
          <p className="im-sport-config-sublabel">
            {t("admin.sportConfig.availableSlots")}: {sport.availableSlotDurations.join(", ")} {t("common.minutes")}
          </p>
        </div>

        {/* Player Limits */}
        <div className="im-sport-config-section">
          <h4 className="im-sport-config-label">{t("admin.sportConfig.players")}</h4>
          <p className="im-sport-config-value">
            {sport.minPlayers} - {sport.maxPlayers} {t("admin.sportConfig.playersLabel")}
          </p>
          <p className="im-sport-config-sublabel">
            {t("admin.sportConfig.typical")}: {sport.typicalPlayers}
          </p>
        </div>

        {/* Booking Duration */}
        <div className="im-sport-config-section">
          <h4 className="im-sport-config-label">{t("admin.sportConfig.bookingDuration")}</h4>
          <p className="im-sport-config-value">
            {sport.minBookingDuration} - {sport.maxBookingDuration} {t("common.minutes")}
          </p>
        </div>

        {/* Advance Booking */}
        <div className="im-sport-config-section">
          <h4 className="im-sport-config-label">{t("admin.sportConfig.advanceBooking")}</h4>
          <p className="im-sport-config-value">
            {sport.maxAdvanceBookingDays} {t("common.days")}
          </p>
          <p className="im-sport-config-sublabel">
            {sport.requiresAdvanceBooking 
              ? t("admin.sportConfig.advanceRequired") 
              : t("admin.sportConfig.advanceOptional")}
          </p>
        </div>

        {/* Surface Types */}
        <div className="im-sport-config-section">
          <h4 className="im-sport-config-label">{t("admin.sportConfig.surfaces")}</h4>
          <div className="im-sport-config-badges">
            {sport.defaultSurfaceTypes.map((surface) => (
              <span key={surface} className="im-surface-badge">
                {surface}
              </span>
            ))}
          </div>
        </div>

        {/* Coaching */}
        <div className="im-sport-config-section">
          <h4 className="im-sport-config-label">{t("admin.sportConfig.coaching")}</h4>
          <p className="im-sport-config-value">
            {sport.coachingAvailable 
              ? t("admin.sportConfig.available") 
              : t("admin.sportConfig.notAvailable")}
          </p>
        </div>
      </div>

      <style jsx>{`
        .im-sport-config-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .im-sport-config-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--rsp-border);
        }

        .im-sport-config-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--rsp-foreground);
        }

        .im-sport-config-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: 9999px;
          background-color: var(--rsp-primary);
          color: #ffffff;
        }

        .im-sport-config-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .im-sport-config-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .im-sport-config-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--rsp-foreground);
          opacity: 0.7;
        }

        .im-sport-config-value {
          font-size: 1rem;
          font-weight: 500;
          color: var(--rsp-foreground);
        }

        .im-sport-config-sublabel {
          font-size: 0.75rem;
          color: var(--rsp-foreground);
          opacity: 0.6;
        }

        .im-sport-config-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .im-surface-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: 0.25rem;
          background-color: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        :global(.dark) .im-surface-badge {
          background-color: rgba(59, 130, 246, 0.25);
          color: #93c5fd;
        }
      `}</style>
    </Card>
  );
}
