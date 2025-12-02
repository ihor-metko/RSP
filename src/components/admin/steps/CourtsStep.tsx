"use client";

import { useCallback } from "react";
import { Button, Input } from "@/components/ui";
import type { InlineCourt } from "@/types/admin";

export type { InlineCourt };

export interface CourtsData {
  courts: InlineCourt[];
}

interface CourtsStepProps {
  data: CourtsData;
  onChange: (data: Partial<CourtsData>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function CourtsStep({
  data,
  onChange,
  errors = {},
  disabled = false,
}: CourtsStepProps) {
  const handleAddCourt = useCallback(() => {
    const newCourt: InlineCourt = {
      id: generateTempId(),
      name: "",
      type: "",
      surface: "",
      indoor: false,
      defaultPriceCents: 0,
    };
    onChange({ courts: [...data.courts, newCourt] });
  }, [data.courts, onChange]);

  const handleRemoveCourt = useCallback(
    (id: string) => {
      onChange({ courts: data.courts.filter((c) => c.id !== id) });
    },
    [data.courts, onChange]
  );

  const handleCourtChange = useCallback(
    (id: string, field: keyof InlineCourt, value: string | boolean | number) => {
      onChange({
        courts: data.courts.map((court) =>
          court.id === id ? { ...court, [field]: value } : court
        ),
      });
    },
    [data.courts, onChange]
  );

  return (
    <div className="im-step-content">
      {errors.courts && (
        <div className="im-stepper-field-error im-stepper-error-block">
          {errors.courts}
        </div>
      )}

      {data.courts.length > 0 && (
        <div className="im-inline-courts-list">
          {data.courts.map((court, index) => (
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
                    onChange={(e) =>
                      handleCourtChange(court.id, "name", e.target.value)
                    }
                    placeholder="Court name"
                    disabled={disabled}
                  />
                </div>

                <div className="im-inline-courts-field">
                  <Input
                    label="Type"
                    value={court.type}
                    onChange={(e) =>
                      handleCourtChange(court.id, "type", e.target.value)
                    }
                    placeholder="e.g., padel, tennis"
                    disabled={disabled}
                  />
                </div>

                <div className="im-inline-courts-field">
                  <Input
                    label="Surface"
                    value={court.surface}
                    onChange={(e) =>
                      handleCourtChange(court.id, "surface", e.target.value)
                    }
                    placeholder="e.g., artificial, clay"
                    disabled={disabled}
                  />
                </div>

                <div className="im-inline-courts-field">
                  <Input
                    label="Default Price (cents)"
                    type="number"
                    min="0"
                    value={court.defaultPriceCents.toString()}
                    onChange={(e) =>
                      handleCourtChange(
                        court.id,
                        "defaultPriceCents",
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                    disabled={disabled}
                  />
                </div>

                <div className="im-inline-courts-field im-inline-courts-checkbox-field">
                  <label className="im-inline-courts-checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={court.indoor}
                      onChange={(e) =>
                        handleCourtChange(court.id, "indoor", e.target.checked)
                      }
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
