"use client";

import { useTranslations } from "next-intl";
import { formatPrice } from "@/utils/price";
import { BookingCourt } from "./types";

interface Step2CourtsProps {
  courts: BookingCourt[];
  selectedCourtId: string | null;
  onSelectCourt: (court: BookingCourt) => void;
  isLoading: boolean;
  error: string | null;
  currentDuration?: number; // Optional - may be used for displaying context in the future
  alternativeDurations?: number[];
  onSelectAlternativeDuration?: (duration: number) => void;
}

export function Step2Courts({
  courts,
  selectedCourtId,
  onSelectCourt,
  isLoading,
  error,
  alternativeDurations = [],
  onSelectAlternativeDuration,
}: Step2CourtsProps) {
  const t = useTranslations();

  // Helper function to format duration for display
  const formatDuration = (minutes: number): string => {
    const hours = minutes / 60;
    if (hours >= 1 && minutes % 60 === 0) {
      return `${hours} ${hours === 1 ? t("common.hour") : t("common.hours")}`;
    }
    return `${minutes} ${t("common.minutes")}`;
  };

  if (isLoading) {
    return (
      <div className="rsp-wizard-step-content">
        <h2 className="rsp-wizard-step-title">{t("wizard.step2Title")}</h2>
        <div className="rsp-wizard-loading" aria-busy="true" aria-live="polite">
          <div className="rsp-wizard-spinner" role="progressbar" />
          <span className="rsp-wizard-loading-text">{t("wizard.loadingCourts")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rsp-wizard-step-content">
        <h2 className="rsp-wizard-step-title">{t("wizard.step2Title")}</h2>
        <div className="rsp-wizard-alert rsp-wizard-alert--error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  const availableCourts = courts.filter((c) => c.available !== false);
  const unavailableCourts = courts.filter((c) => c.available === false);

  return (
    <div className="rsp-wizard-step-content" role="group" aria-labelledby="step2-title">
      <h2 className="rsp-wizard-step-title" id="step2-title">
        {t("wizard.step2Title")}
      </h2>

      {courts.length === 0 ? (
        <div>
          <div className="rsp-wizard-alert rsp-wizard-alert--info" role="alert">
            {t("booking.quickBooking.noCourtsForDuration")}
          </div>
          
          {alternativeDurations.length > 0 && onSelectAlternativeDuration && (
            <div className="rsp-wizard-alternatives" style={{ marginTop: "1.5rem" }}>
              <p className="rsp-wizard-alternatives-title" style={{ 
                fontSize: "0.875rem", 
                fontWeight: 500, 
                marginBottom: "0.75rem",
                opacity: 0.9
              }}>
                {t("booking.quickBooking.alternativeDurationsAvailable")}
              </p>
              <div className="rsp-wizard-alternatives-grid" style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "0.75rem"
              }}>
                {alternativeDurations.map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    className="rsp-wizard-alternative-btn"
                    onClick={() => onSelectAlternativeDuration(duration)}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "inherit",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    }}
                  >
                    {formatDuration(duration)}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {alternativeDurations.length === 0 && (
            <p className="mt-2 text-xs opacity-70">
              {t("booking.quickBooking.tryAnotherTime")}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="rsp-wizard-courts-header">
            <span className="rsp-wizard-courts-title">
              {t("wizard.selectCourt")}
            </span>
            <span className="rsp-wizard-courts-count" aria-live="polite">
              {t("wizard.availableCount", { count: availableCourts.length })}
            </span>
          </div>

          <div
            className="rsp-wizard-courts-grid"
            role="listbox"
            aria-label={t("wizard.selectCourt")}
            aria-multiselectable="false"
          >
            {/* Available courts first */}
            {availableCourts.map((court) => (
              <CourtCard
                key={court.id}
                court={court}
                isSelected={selectedCourtId === court.id}
                onSelect={() => onSelectCourt(court)}
              />
            ))}

            {/* Unavailable courts */}
            {unavailableCourts.map((court) => (
              <CourtCard
                key={court.id}
                court={court}
                isSelected={false}
                onSelect={() => {}}
                disabled
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface CourtCardProps {
  court: BookingCourt;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function CourtCard({ court, isSelected, onSelect, disabled = false }: CourtCardProps) {
  const t = useTranslations();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={`rsp-wizard-court-card ${
        isSelected ? "rsp-wizard-court-card--selected" : ""
      } ${disabled ? "rsp-wizard-court-card--disabled" : ""}`}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="rsp-wizard-court-card-header">
        <span className="rsp-wizard-court-card-name">{court.name}</span>
        <span className="rsp-wizard-court-card-check" aria-hidden="true">
          {isSelected && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <polyline points="20,6 9,17 4,12" />
            </svg>
          )}
        </span>
      </div>

      <div className="rsp-wizard-court-badges">
        {court.type && (
          <span className="rsp-wizard-court-badge">{court.type}</span>
        )}
        {court.surface && (
          <span className="rsp-wizard-court-badge">{court.surface}</span>
        )}
        {court.indoor && (
          <span className="rsp-wizard-court-badge rsp-wizard-court-badge--indoor">
            {t("common.indoor")}
          </span>
        )}
      </div>

      {disabled ? (
        <span className="rsp-wizard-court-card-unavailable">
          {court.unavailableReason || t("wizard.courtUnavailable")}
        </span>
      ) : (
        <span className="rsp-wizard-court-card-price">
          {court.priceCents !== undefined
            ? formatPrice(court.priceCents)
            : `${formatPrice(court.defaultPriceCents)} ${t("common.perHour")}`}
        </span>
      )}
    </div>
  );
}
