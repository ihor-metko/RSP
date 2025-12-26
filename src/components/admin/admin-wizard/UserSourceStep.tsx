"use client";

import type { UserSourceData, UserSource, AdminWizardErrors } from "@/types/adminWizard";

interface UserSourceStepProps {
  data: UserSourceData;
  onChange: (data: Partial<UserSourceData>) => void;
  errors: AdminWizardErrors;
  disabled: boolean;
}

export function UserSourceStep({
  data,
  onChange,
  errors,
  disabled,
}: UserSourceStepProps) {
  const handleSourceChange = (source: UserSource) => {
    onChange({ userSource: source });
  };

  return (
    <div className="im-wizard-step-content">
      <div className="im-form-field">
        <label className="im-field-label">
          How would you like to add the user? *
        </label>
        <div className="im-radio-group">
          <label className="im-radio-option">
            <input
              type="radio"
              name="userSource"
              value="existing"
              checked={data.userSource === "existing"}
              onChange={() => handleSourceChange("existing")}
              disabled={disabled}
              className="im-radio-input"
            />
            <span className="im-radio-label-content">
              <span className="im-radio-label-title">Existing User</span>
              <span className="im-radio-label-description">
                Assign a role to a user who already exists in the system
              </span>
            </span>
          </label>
          
          <label className="im-radio-option">
            <input
              type="radio"
              name="userSource"
              value="new"
              checked={data.userSource === "new"}
              onChange={() => handleSourceChange("new")}
              disabled={disabled}
              className="im-radio-input"
            />
            <span className="im-radio-label-content">
              <span className="im-radio-label-title">New User</span>
              <span className="im-radio-label-description">
                Create a new user and send them an invitation email
              </span>
            </span>
          </label>
        </div>
        {errors.userSource && (
          <span className="im-field-error" role="alert">
            {errors.userSource}
          </span>
        )}
      </div>
    </div>
  );
}
