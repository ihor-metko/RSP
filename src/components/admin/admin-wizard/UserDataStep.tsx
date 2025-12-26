"use client";

import { Input } from "@/components/ui";
import type { NewUserData, AdminWizardErrors } from "@/types/adminWizard";

interface UserDataStepProps {
  data: Partial<NewUserData>;
  onChange: (data: Partial<NewUserData>) => void;
  errors: AdminWizardErrors;
  disabled: boolean;
}

export function UserDataStep({
  data,
  onChange,
  errors,
  disabled,
}: UserDataStepProps) {
  return (
    <div className="im-wizard-step-content">
      <p className="im-field-hint im-mb-4">
        Enter the new user&apos;s information. They will receive an invitation email to set up their account.
      </p>
      
      <div className="im-form-field">
        <Input
          id="name"
          label="Full Name *"
          type="text"
          value={data.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Enter user's full name"
          disabled={disabled}
          required
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <span id="name-error" className="im-field-error" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      <div className="im-form-field">
        <Input
          id="email"
          label="Email Address *"
          type="email"
          value={data.email || ""}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="user@example.com"
          disabled={disabled}
          required
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <span id="email-error" className="im-field-error" role="alert">
            {errors.email}
          </span>
        )}
        <p className="im-field-hint">
          An invitation will be sent to this email address
        </p>
      </div>

      <div className="im-form-field">
        <Input
          id="phone"
          label="Phone Number *"
          type="tel"
          value={data.phone || ""}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="+380501234567"
          disabled={disabled}
          required
          aria-describedby={errors.phone ? "phone-error" : undefined}
        />
        {errors.phone && (
          <span id="phone-error" className="im-field-error" role="alert">
            {errors.phone}
          </span>
        )}
        <p className="im-field-hint">
          Include country code (e.g., +380 for Ukraine)
        </p>
      </div>
    </div>
  );
}
