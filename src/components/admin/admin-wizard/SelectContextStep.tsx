"use client";

import { useTranslations } from "next-intl";
import { Select, type SelectOption } from "@/components/ui";
import type { ContextSelectionData, OrganizationOption, ClubOption, AdminRole, AdminWizardErrors } from "@/types/adminWizard";

interface SelectContextStepProps {
  data: ContextSelectionData;
  onChange: (data: Partial<ContextSelectionData>) => void;
  errors: AdminWizardErrors;
  disabled: boolean;
  organizations: OrganizationOption[];
  clubs: ClubOption[];
  allowedRoles: AdminRole[];
  isOrgEditable: boolean;
  isClubEditable: boolean;
  isRoleEditable: boolean;
  showClubSelector: boolean;
  showOrganizationSelector: boolean;
}

export function SelectContextStep({
  data,
  onChange,
  errors,
  disabled,
  organizations,
  clubs,
  allowedRoles,
  isOrgEditable,
  isClubEditable,
  isRoleEditable,
  showClubSelector,
  showOrganizationSelector,
}: SelectContextStepProps) {
  const t = useTranslations("createAdminWizard.contextStep");
  
  const orgOptions: SelectOption[] = organizations.map(org => ({
    value: org.id,
    label: org.name,
  }));

  const clubOptions: SelectOption[] = clubs.map(club => ({
    value: club.id,
    label: club.name,
  }));

  const roleOptions: SelectOption[] = allowedRoles.map(role => {
    let label = "";
    switch (role) {
      case "ORGANIZATION_OWNER":
        label = t("roles.organizationOwner");
        break;
      case "ORGANIZATION_ADMIN":
        label = t("roles.organizationAdmin");
        break;
      case "CLUB_OWNER":
        label = t("roles.clubOwner");
        break;
      case "CLUB_ADMIN":
        label = t("roles.clubAdmin");
        break;
      default:
        label = role;
    }
    return {
      value: role,
      label,
    };
  });

  // Filter clubs by selected organization
  // When an organization is selected, only show clubs belonging to that organization
  // This ensures the Club Admin can only be assigned to clubs within the selected organization
  const filteredClubOptions = data.organizationId
    ? clubOptions.filter(club => {
        const clubData = clubs.find(c => c.id === club.value);
        return clubData?.organizationId === data.organizationId;
      })
    : clubOptions;

  return (
    <div className="im-wizard-step-content">
      {showOrganizationSelector && (
        <div className="im-form-field">
          <Select
            id="organization"
            label={t("organization")}
            options={orgOptions}
            value={data.organizationId}
            onChange={(value) => {
              onChange({ 
                organizationId: value,
                // Clear club selection when org changes
                clubId: undefined,
              });
            }}
            placeholder={t("organizationPlaceholder")}
            disabled={disabled || !isOrgEditable}
            required
            aria-describedby={errors.organizationId ? "org-error" : undefined}
          />
          {errors.organizationId && (
            <span id="org-error" className="im-field-error" role="alert">
              {errors.organizationId}
            </span>
          )}
          {!isOrgEditable && (
            <p className="im-field-hint">
              {t("organizationHint")}
            </p>
          )}
        </div>
      )}

      <div className="im-form-field">
        <Select
          id="role"
          label={t("role")}
          options={roleOptions}
          value={data.role}
          onChange={(value) => {
            onChange({ 
              role: value as AdminRole,
              // Clear club if role is org admin
              clubId: value === "ORGANIZATION_ADMIN" ? undefined : data.clubId,
            });
          }}
          placeholder={t("rolePlaceholder")}
          disabled={disabled || !isRoleEditable || allowedRoles.length === 1}
          required
          aria-describedby={errors.role ? "role-error" : undefined}
        />
        {errors.role && (
          <span id="role-error" className="im-field-error" role="alert">
            {errors.role}
          </span>
        )}
      </div>

      {/* In club context: always show club selector (disabled)
          In other contexts: only show when role is CLUB_ADMIN or CLUB_OWNER */}
      {(!showClubSelector || (showClubSelector && (data.role === "CLUB_ADMIN" || data.role === "CLUB_OWNER"))) && (
        <div className="im-form-field">
          <Select
            id="club"
            label={t("club")}
            options={filteredClubOptions}
            value={data.clubId}
            onChange={(value) => onChange({ clubId: value })}
            placeholder={t("clubPlaceholder")}
            disabled={disabled || !isClubEditable || !data.organizationId}
            required
            aria-describedby={errors.clubId ? "club-error" : undefined}
          />
          {errors.clubId && (
            <span id="club-error" className="im-field-error" role="alert">
              {errors.clubId}
            </span>
          )}
          {!data.organizationId && (
            <p className="im-field-hint">
              {t("clubHint")}
            </p>
          )}
          {!isClubEditable && (
            <p className="im-field-hint">
              {t("clubPreselectedHint")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
