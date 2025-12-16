"use client";

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
}: SelectContextStepProps) {
  const orgOptions: SelectOption[] = organizations.map(org => ({
    value: org.id,
    label: org.name,
  }));

  const clubOptions: SelectOption[] = clubs.map(club => ({
    value: club.id,
    label: club.name,
  }));

  const roleOptions: SelectOption[] = allowedRoles.map(role => ({
    value: role,
    label: role === "ORGANIZATION_ADMIN" ? "Organization Admin" : "Club Admin",
  }));

  // Filter clubs by selected organization
  const filteredClubOptions = data.organizationId
    ? clubOptions.filter(club => {
        const clubData = clubs.find(c => c.id === club.value);
        return clubData?.organizationId === data.organizationId;
      })
    : clubOptions;

  return (
    <div className="im-wizard-step-content">
      <div className="im-form-field">
        <Select
          id="organization"
          label="Organization *"
          options={orgOptions}
          value={data.organizationId}
          onChange={(value) => {
            onChange({ 
              organizationId: value,
              // Clear club selection when org changes
              clubId: undefined,
            });
          }}
          placeholder="Select an organization"
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
            Organization is pre-selected based on your access level
          </p>
        )}
      </div>

      <div className="im-form-field">
        <Select
          id="role"
          label="Admin Role *"
          options={roleOptions}
          value={data.role}
          onChange={(value) => {
            onChange({ 
              role: value as AdminRole,
              // Clear club if role is org admin
              clubId: value === "ORGANIZATION_ADMIN" ? undefined : data.clubId,
            });
          }}
          placeholder="Select a role"
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

      {showClubSelector && data.role === "CLUB_ADMIN" && (
        <div className="im-form-field">
          <Select
            id="club"
            label="Club *"
            options={filteredClubOptions}
            value={data.clubId}
            onChange={(value) => onChange({ clubId: value })}
            placeholder="Select a club"
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
              Please select an organization first
            </p>
          )}
          {!isClubEditable && (
            <p className="im-field-hint">
              Club is pre-selected based on your access level
            </p>
          )}
        </div>
      )}
    </div>
  );
}
