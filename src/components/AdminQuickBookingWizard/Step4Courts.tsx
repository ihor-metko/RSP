"use client";

import { useTranslations } from "next-intl";
import { Card, Button } from "@/components/ui";
import { formatPrice } from "@/utils/price";
import type { WizardCourt } from "./types";

interface Step4CourtsProps {
  courts: WizardCourt[];
  selectedCourtId: string | null;
  onSelectCourt: (court: WizardCourt) => void;
  isLoading: boolean;
  error: string | null;
}

export function Step4Courts({
  courts,
  selectedCourtId,
  onSelectCourt,
  isLoading,
  error,
}: Step4CourtsProps) {
  const t = useTranslations();

  return (
    <div className="rsp-admin-wizard-step">
      <div className="rsp-admin-wizard-step-header">
        <h3 className="rsp-admin-wizard-step-title">
          {t("wizard.step2Title")}
        </h3>
        <p className="rsp-admin-wizard-step-description">
          {t("adminWizard.selectCourtDescription")}
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
            <span>{t("wizard.loadingCourts")}</span>
          </div>
        ) : courts.length === 0 ? (
          <div className="rsp-admin-wizard-empty">
            <p>{t("booking.quickBooking.noCourtsAvailable")}</p>
            <p className="rsp-admin-wizard-empty-hint">
              {t("booking.quickBooking.tryAnotherTime")}
            </p>
          </div>
        ) : (
          <div className="rsp-wizard-courts">
            <p className="rsp-wizard-courts-count">
              {t("wizard.availableCount", { count: courts.length })}
            </p>
            <div className="rsp-wizard-court-list" role="list">
              {courts.map((court) => {
                const isSelected = court.id === selectedCourtId;
                return (
                  <div
                    key={court.id}
                    className="rsp-wizard-court-card-wrapper"
                  >
                    <Card
                      className={`rsp-wizard-court-card ${
                        isSelected ? "rsp-wizard-court-card--selected" : ""
                      }`}
                    >
                      <div className="rsp-wizard-court-info" role="listitem">
                        <div className="rsp-wizard-court-name">{court.name}</div>
                        <div className="rsp-wizard-court-details">
                          {court.type && (
                            <span className="rsp-badge rsp-badge-type">
                              {court.type}
                            </span>
                          )}
                          {court.surface && (
                            <span className="rsp-badge rsp-badge-surface">
                              {court.surface}
                            </span>
                          )}
                          {court.indoor && (
                            <span className="rsp-badge rsp-badge-indoor">
                              {t("common.indoor")}
                            </span>
                          )}
                        </div>
                        <div className="rsp-wizard-court-price">
                          {court.priceCents !== undefined ? (
                            <span className="font-semibold">
                              {formatPrice(court.priceCents)}
                            </span>
                          ) : (
                            <span>
                              {formatPrice(court.defaultPriceCents)}{" "}
                              {t("common.perHour")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => onSelectCourt(court)}
                        className={`rsp-wizard-select-btn ${
                          isSelected ? "rsp-wizard-select-btn--selected" : ""
                        }`}
                        variant={isSelected ? "primary" : "outline"}
                        aria-label={`${t("wizard.selectCourt")} ${court.name}${
                          court.priceCents !== undefined
                            ? ` - ${formatPrice(court.priceCents)}`
                            : ""
                        }`}
                      >
                        {isSelected
                          ? t("adminWizard.selected")
                          : t("wizard.selectCourt")}
                      </Button>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
