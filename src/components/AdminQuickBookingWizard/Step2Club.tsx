"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui";
import type { WizardClub, WizardStepClub } from "./types";

interface Step2ClubProps {
  data: WizardStepClub;
  clubs: WizardClub[];
  isLoading: boolean;
  error: string | null;
  onSelect: (club: WizardClub) => void;
}

export function Step2Club({
  data,
  clubs,
  isLoading,
  error,
  onSelect,
}: Step2ClubProps) {
  const t = useTranslations();

  const handleChange = (clubId: string) => {
    const club = clubs.find((c) => c.id === clubId);
    if (club) {
      onSelect(club);
    }
  };

  return (
    <div className="rsp-admin-wizard-step">
      <div className="rsp-admin-wizard-step-header">
        <h3 className="rsp-admin-wizard-step-title">
          {t("adminWizard.selectClub")}
        </h3>
        <p className="rsp-admin-wizard-step-description">
          {t("adminWizard.selectClubDescription")}
        </p>
      </div>

      <div className="rsp-admin-wizard-step-content">
        {error ? (
          <div className="rsp-admin-wizard-error" role="alert">
            {error}
          </div>
        ) : isLoading ? (
          <div className="rsp-admin-wizard-loading">
            <div className="rsp-admin-wizard-loading-spinner" />
            <span>{t("common.loading")}</span>
          </div>
        ) : clubs.length === 0 ? (
          <div className="rsp-admin-wizard-empty">
            <p>{t("adminWizard.noClubsAvailable")}</p>
          </div>
        ) : (
          <Select
            id="club-select"
            label={t("adminBookings.club")}
            options={clubs.map((club) => ({
              value: club.id,
              label: club.name,
            }))}
            value={data.selectedClubId || ""}
            onChange={handleChange}
            placeholder={t("adminWizard.selectClubPlaceholder")}
          />
        )}
      </div>
    </div>
  );
}
