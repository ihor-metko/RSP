"use client";

import { useTranslations } from "next-intl";
import { BookingClub } from "./types";

interface Step0SelectClubProps {
  clubs: BookingClub[];
  selectedClubId: string | null;
  onSelectClub: (club: BookingClub) => void;
  isLoading: boolean;
  error: string | null;
}

export function Step0SelectClub({
  clubs,
  selectedClubId,
  onSelectClub,
  isLoading,
  error,
}: Step0SelectClubProps) {
  const t = useTranslations();

  if (isLoading) {
    return (
      <div className="rsp-wizard-step-content">
        <h2 className="rsp-wizard-step-title">{t("wizard.step0Title")}</h2>
        <div className="rsp-wizard-loading">
          <div className="rsp-wizard-spinner" aria-hidden="true" />
          <p>{t("wizard.loadingClubs")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rsp-wizard-step-content">
        <h2 className="rsp-wizard-step-title">{t("wizard.step0Title")}</h2>
        <div className="rsp-wizard-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="rsp-wizard-step-content">
        <h2 className="rsp-wizard-step-title">{t("wizard.step0Title")}</h2>
        <div className="rsp-wizard-empty">
          <p>{t("wizard.noClubsAvailable")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rsp-wizard-step-content">
      <h2 className="rsp-wizard-step-title">{t("wizard.step0Title")}</h2>
      <p className="rsp-wizard-step-description">{t("wizard.selectClubDescription")}</p>
      
      <div className="rsp-club-selection-grid">
        {clubs.map((club) => (
          <button
            key={club.id}
            type="button"
            className={`rsp-club-card ${
              selectedClubId === club.id ? "rsp-club-card--selected" : ""
            }`}
            onClick={() => onSelectClub(club)}
            aria-pressed={selectedClubId === club.id}
          >
            <div className="rsp-club-card-content">
              <h3 className="rsp-club-card-name">{club.name}</h3>
              <p className="rsp-club-card-location">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {club.city || club.location}
              </p>
            </div>
            {selectedClubId === club.id && (
              <div className="rsp-club-card-checkmark" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
