"use client";

import { Input } from "@/components/ui";
import type { UserData, AdminWizardErrors } from "@/types/adminWizard";

interface UserDataStepProps {
  data: UserData;
  onChange: (data: Partial<UserData>) => void;
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
      <div className="im-form-field">
        <Input
          id="name"
          label="Full Name *"
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Enter admin's full name"
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
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="admin@example.com"
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
          We&apos;ll check if this email is already registered
        </p>
      </div>

      <div className="im-form-field">
        <Input
          id="phone"
          label="Phone Number *"
          type="tel"
          value={data.phone}
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
