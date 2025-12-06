"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui";
import type { WizardOrganization, WizardStepOrganization } from "./types";

interface Step1OrganizationProps {
  data: WizardStepOrganization;
  organizations: WizardOrganization[];
  isLoading: boolean;
  error: string | null;
  onSelect: (organization: WizardOrganization) => void;
}

export function Step1Organization({
  data,
  organizations,
  isLoading,
  error,
  onSelect,
}: Step1OrganizationProps) {
  const t = useTranslations();

  const handleChange = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      onSelect(org);
    }
  };

  return (
    <div className="rsp-admin-wizard-step">
      <div className="rsp-admin-wizard-step-header">
        <h3 className="rsp-admin-wizard-step-title">
          {t("adminWizard.selectOrganization")}
        </h3>
        <p className="rsp-admin-wizard-step-description">
          {t("adminWizard.selectOrganizationDescription")}
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
        ) : organizations.length === 0 ? (
          <div className="rsp-admin-wizard-empty">
            <p>{t("adminWizard.noOrganizationsAvailable")}</p>
          </div>
        ) : (
          <Select
            id="organization-select"
            label={t("adminBookings.organization")}
            options={organizations.map((org) => ({
              value: org.id,
              label: org.name,
            }))}
            value={data.selectedOrganizationId || ""}
            onChange={handleChange}
            placeholder={t("adminWizard.selectOrganizationPlaceholder")}
          />
        )}
      </div>
    </div>
  );
}
