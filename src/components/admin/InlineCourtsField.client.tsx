"use client";

import { useCallback } from "react";
import { Button, Input } from "@/components/ui";
import { centsToDollars, dollarsToCents } from "@/utils/price";
import "./InlineCourtsField.css";

interface InlineCourt {
  id: string;
  name: string;
  type: string;
  surface: string;
  indoor: boolean;
  defaultPriceCents: number;
}

interface InlineCourtsFieldProps {
  value: InlineCourt[];
  onChange: (courts: InlineCourt[]) => void;
  disabled?: boolean;
}

function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function InlineCourtsField({ value, onChange, disabled }: InlineCourtsFieldProps) {
  const handleAddCourt = useCallback(() => {
    const newCourt: InlineCourt = {
      id: generateTempId(),
      name: "",
      type: "",
      surface: "",
      indoor: false,
      defaultPriceCents: 0,
    };
    onChange([...value, newCourt]);
  }, [value, onChange]);

  const handleRemoveCourt = useCallback((id: string) => {
    onChange(value.filter((court) => court.id !== id));
  }, [value, onChange]);

  const handleCourtChange = useCallback((id: string, field: keyof InlineCourt, fieldValue: string | boolean | number) => {
    const newCourts = value.map((court) => {
      if (court.id === id) {
        return { ...court, [field]: fieldValue };
      }
      return court;
    });
    onChange(newCourts);
  }, [value, onChange]);

  const handlePriceChange = useCallback((id: string, dollarValue: string) => {
    const cents = dollarsToCents(parseFloat(dollarValue) || 0);
    handleCourtChange(id, "defaultPriceCents", cents);
  }, [handleCourtChange]);

  return (
    <div className="im-inline-courts">
      {value.length > 0 && (
        <div className="im-inline-courts-list">
          {value.map((court, index) => (
            <div key={court.id} className="im-inline-courts-item">
              <div className="im-inline-courts-header">
                <span className="im-inline-courts-number">Court {index + 1}</span>
                <button
                  type="button"
                  className="im-inline-courts-remove"
                  onClick={() => handleRemoveCourt(court.id)}
                  disabled={disabled}
                  aria-label={`Remove court ${index + 1}`}
                >
                  ✕
                </button>
              </div>
              
              <div className="im-inline-courts-fields">
                <div className="im-inline-courts-field">
                  <Input
                    label="Name"
                    value={court.name}
                    onChange={(e) => handleCourtChange(court.id, "name", e.target.value)}
                    placeholder="Court name"
                    required
                    disabled={disabled}
                  />
                </div>
                
                <div className="im-inline-courts-field">
                  <Input
                    label="Type"
                    value={court.type}
                    onChange={(e) => handleCourtChange(court.id, "type", e.target.value)}
                    placeholder="e.g., padel, tennis"
                    disabled={disabled}
                  />
                </div>
                
                <div className="im-inline-courts-field">
                  <Input
                    label="Surface"
                    value={court.surface}
                    onChange={(e) => handleCourtChange(court.id, "surface", e.target.value)}
                    placeholder="e.g., artificial, clay"
                    disabled={disabled}
                  />
                </div>
                
                <div className="im-inline-courts-field">
                  <Input
                    label="Default Price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={centsToDollars(court.defaultPriceCents).toFixed(2)}
                    onChange={(e) => handlePriceChange(court.id, e.target.value)}
                    placeholder="0.00"
                    disabled={disabled}
                  />
                </div>
                
                <div className="im-inline-courts-field im-inline-courts-checkbox-field">
                  <label className="im-inline-courts-checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={court.indoor}
                      onChange={(e) => handleCourtChange(court.id, "indoor", e.target.checked)}
                      disabled={disabled}
                      className="im-inline-courts-checkbox"
                    />
                    <span className="im-inline-courts-checkbox-label">Indoor</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <Button
        type="button"
        variant="outline"
        onClick={handleAddCourt}
        disabled={disabled}
        className="im-inline-courts-add"
      >
        + Add Court
      </Button>
    </div>
  );
}
