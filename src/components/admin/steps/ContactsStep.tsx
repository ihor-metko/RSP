"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui";

export interface ContactsData {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  latitude?: string;
  longitude?: string;
}

interface ContactsStepProps {
  data: ContactsData;
  onChange: (data: Partial<ContactsData>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  showCoordinates?: boolean;
}

export function ContactsStep({
  data,
  onChange,
  errors = {},
  disabled = false,
  showCoordinates = false,
}: ContactsStepProps) {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      onChange({ [name]: value });
    },
    [onChange]
  );

  return (
    <div className="im-step-content">
      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <Input
            label="Address"
            name="address"
            value={data.address}
            onChange={handleInputChange}
            placeholder="Street address"
            disabled={disabled}
          />
          {errors.address && (
            <span className="im-stepper-field-error">{errors.address}</span>
          )}
        </div>
      </div>

      <div className="im-stepper-row im-stepper-row--two">
        <div className="im-stepper-field">
          <Input
            label="City"
            name="city"
            value={data.city}
            onChange={handleInputChange}
            placeholder="City"
            disabled={disabled}
          />
        </div>
        <div className="im-stepper-field">
          <Input
            label="Postal Code"
            name="postalCode"
            value={data.postalCode}
            onChange={handleInputChange}
            placeholder="Postal code"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <Input
            label="Country"
            name="country"
            value={data.country}
            onChange={handleInputChange}
            placeholder="Country"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="im-stepper-row im-stepper-row--two">
        <div className="im-stepper-field">
          <Input
            label="Phone"
            name="phone"
            value={data.phone}
            onChange={handleInputChange}
            placeholder="+1 (555) 123-4567"
            disabled={disabled}
          />
        </div>
        <div className="im-stepper-field">
          <Input
            label="Email"
            name="email"
            type="email"
            value={data.email}
            onChange={handleInputChange}
            placeholder="contact@club.com"
            disabled={disabled}
          />
          {errors.email && (
            <span className="im-stepper-field-error">{errors.email}</span>
          )}
        </div>
      </div>

      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <Input
            label="Website"
            name="website"
            value={data.website}
            onChange={handleInputChange}
            placeholder="https://www.club.com"
            disabled={disabled}
          />
        </div>
      </div>

      {showCoordinates && (
        <div className="im-stepper-row im-stepper-row--two">
          <div className="im-stepper-field">
            <Input
              label="Latitude"
              name="latitude"
              value={data.latitude || ""}
              onChange={handleInputChange}
              placeholder="e.g., 40.7128"
              disabled={disabled}
            />
            {errors.latitude && (
              <span className="im-stepper-field-error">{errors.latitude}</span>
            )}
          </div>
          <div className="im-stepper-field">
            <Input
              label="Longitude"
              name="longitude"
              value={data.longitude || ""}
              onChange={handleInputChange}
              placeholder="e.g., -74.0060"
              disabled={disabled}
            />
            {errors.longitude && (
              <span className="im-stepper-field-error">{errors.longitude}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
