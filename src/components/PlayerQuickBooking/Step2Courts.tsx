"use client";

import { useTranslations } from "next-intl";
import { formatPrice } from "@/utils/price";
import { BookingCourt } from "./types";
import type { AlternativeTimeSlot, AlternativeDuration } from "./types";

interface Step2CourtsProps {
  courts: BookingCourt[];
  selectedCourtId: string | null;
  onSelectCourt: (court: BookingCourt) => void;
  isLoading: boolean;
  error: string | null;
  alternativeDurations?: AlternativeDuration[];
  onSelectAlternativeDuration?: (duration: number) => void;
  alternativeTimeSlots?: AlternativeTimeSlot[];
  onSelectAlternativeTime?: (startTime: string) => void;
  readOnlyMode?: boolean; // Indicates step is locked (resume payment flow)
}

export function Step2Courts({
  courts,
  selectedCourtId,
  onSelectCourt,
  isLoading,
  error,
  alternativeDurations = [],
  onSelectAlternativeDuration,
  alternativeTimeSlots = [],
  onSelectAlternativeTime,
  readOnlyMode = false,
}: Step2CourtsProps) {
  const t = useTranslations();

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

  // Compute selected court and court lists outside conditional blocks
  const selectedCourt = courts.find(c => c.id === selectedCourtId);
  const availableCourts = courts.filter((c) => c.available !== false);
  const unavailableCourts = courts.filter((c) => c.available === false);

  return (
    <div className="rsp-wizard-step-content" role="group" aria-labelledby="step2-title">
      <h2 className="rsp-wizard-step-title" id="step2-title">
        {t("wizard.step2Title")}
      </h2>

      {/* Read-only mode indicator */}
      {readOnlyMode && (
        <div className="rsp-wizard-alert rsp-wizard-alert--info" role="status">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginRight: "8px" }}
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {t("wizard.stepLockedInfo")}
        </div>
      )}

      {readOnlyMode && selectedCourt ? (
        // Read-only display
        <div className="rsp-wizard-summary-card">
          <div className="rsp-wizard-summary-row">
            <span className="rsp-wizard-summary-label">{t("wizard.court")}</span>
            <span className="rsp-wizard-summary-value">{selectedCourt.name}</span>
          </div>
          {selectedCourt.type && (
            <div className="rsp-wizard-summary-row">
              <span className="rsp-wizard-summary-label">{t("court.type")}</span>
              <span className="rsp-wizard-summary-value">{selectedCourt.type}</span>
            </div>
          )}
          {selectedCourt.surface && (
            <div className="rsp-wizard-summary-row">
              <span className="rsp-wizard-summary-label">{t("court.surface")}</span>
              <span className="rsp-wizard-summary-value">{selectedCourt.surface}</span>
            </div>
          )}
          {selectedCourt.indoor && (
            <div className="rsp-wizard-summary-row">
              <span className="rsp-wizard-summary-label">{t("court.location")}</span>
              <span className="rsp-wizard-summary-value">{t("common.indoor")}</span>
            </div>
          )}
          <div className="rsp-wizard-summary-row">
            <span className="rsp-wizard-summary-label">{t("wizard.price")}</span>
            <span className="rsp-wizard-summary-value">
              {selectedCourt.priceCents !== undefined
                ? formatPrice(selectedCourt.priceCents)
                : `${formatPrice(selectedCourt.defaultPriceCents)} ${t("common.perHour")}`}
            </span>
          </div>
        </div>
      ) : courts.length === 0 ? (
        <div>
          <div className="rsp-wizard-alert rsp-wizard-alert--info" role="alert">
            {t("booking.quickBooking.noCourtsAvailable")}
          </div>

          {/* Show alternative durations first (shorter durations for same start time) */}
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
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.75rem"
              }}>
                {alternativeDurations.map((alt) => {
                  const hours = alt.duration / 60;
                  const label = hours >= 1 && alt.duration % 60 === 0
                    ? `${hours} ${hours === 1 ? t("common.hour") : t("common.hours")}`
                    : `${alt.duration} ${t("common.minutes")}`;

                  return (
                    <button
                      key={alt.duration}
                      type="button"
                      className="rsp-wizard-alternative-btn"
                      onClick={() => onSelectAlternativeDuration(alt.duration)}
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
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.25rem",
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
                      <span style={{ fontSize: "1rem" }}>{label}</span>
                      <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                        {alt.availableCourtCount} {alt.availableCourtCount === 1 ? t("common.court") : t("common.courts")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Show alternative time slots if no alternative durations */}
          {alternativeDurations.length === 0 && alternativeTimeSlots.length > 0 && onSelectAlternativeTime && (
            <div className="rsp-wizard-alternatives" style={{ marginTop: "1.5rem" }}>
              <p className="rsp-wizard-alternatives-title" style={{
                fontSize: "0.875rem",
                fontWeight: 500,
                marginBottom: "0.75rem",
                opacity: 0.9
              }}>
                {t("booking.quickBooking.alternativeTimeSlotsAvailable")}
              </p>
              <div className="rsp-wizard-alternatives-grid" style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.75rem"
              }}>
                {alternativeTimeSlots.map((slot) => (
                  <button
                    key={slot.startTime}
                    type="button"
                    className="rsp-wizard-alternative-btn"
                    onClick={() => onSelectAlternativeTime(slot.startTime)}
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
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem",
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
                    <span style={{ fontSize: "1rem" }}>{slot.startTime}</span>
                    <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                      {slot.availableCourtCount} {slot.availableCourtCount === 1 ? t("common.court") : t("common.courts")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {alternativeDurations.length === 0 && alternativeTimeSlots.length === 0 && (
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
                onSelect={() => { }}
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
      className={`rsp-wizard-court-card ${isSelected ? "rsp-wizard-court-card--selected" : ""
        } ${disabled ? "rsp-wizard-court-card--disabled" : ""}`}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="rsp-wizard-court-card-header">
        <span className="rsp-wizard-court-card-name">{court.name}</span>
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
