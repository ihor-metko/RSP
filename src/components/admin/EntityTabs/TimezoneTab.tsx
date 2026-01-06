"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, Button, Select } from "@/components/ui";
import type { SelectOption } from "@/components/ui/Select";
import { COMMON_TIMEZONES, DEFAULT_CLUB_TIMEZONE } from "@/constants/timezone";

export interface TimezoneData {
  timezone: string | null;
}

interface TimezoneTabProps {
  initialData: TimezoneData;
  onSave: (data: TimezoneData) => Promise<void>;
  disabled?: boolean;
  translationNamespace?: string;
}

export function TimezoneTab({ 
  initialData, 
  onSave, 
  disabled = false, 
  translationNamespace = "clubDetail.tabs" 
}: TimezoneTabProps) {
  const t = useTranslations(translationNamespace);
  const tCommon = useTranslations("common");
  const [timezone, setTimezone] = useState<string>(initialData.timezone || DEFAULT_CLUB_TIMEZONE);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Convert COMMON_TIMEZONES to SelectOption format
  const timezoneOptions: SelectOption[] = useMemo(() => {
    return COMMON_TIMEZONES.map(tz => ({
      value: tz.value,
      label: tz.label,
    }));
  }, []);

  const handleTimezoneChange = useCallback((value: string) => {
    setTimezone(value);
    setHasChanges(true);
    // Show warning if timezone is being changed
    if (value !== (initialData.timezone || DEFAULT_CLUB_TIMEZONE)) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [initialData.timezone]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onSave({ timezone });
      setHasChanges(false);
      setShowWarning(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("timezone.saveFailed");
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTimezone(initialData.timezone || DEFAULT_CLUB_TIMEZONE);
    setHasChanges(false);
    setShowWarning(false);
    setError(null);
  };

  return (
    <Card className="im-entity-tab-card">
      <div className="im-entity-tab-header">
        <div>
          <h3 className="im-entity-tab-title">{t("timezone.title")}</h3>
          <p className="im-entity-tab-description">{t("timezone.description")}</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isSaving || disabled}
            >
              {tCommon("cancel")}
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || disabled}
            variant="primary"
          >
            {isSaving ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="im-entity-tab-error" role="alert">
          {error}
        </div>
      )}

      {showWarning && (
        <div id="timezone-warning" className="im-entity-tab-warning" role="alert">
          <svg 
            className="im-entity-tab-warning-icon" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <strong>{t("timezone.warningTitle")}</strong>
            <p>{t("timezone.warningMessage")}</p>
          </div>
        </div>
      )}

      <div className="im-entity-tab-content">
        <div className="im-entity-tab-field">
          <Select
            id="club-timezone"
            label={t("timezone.selectLabel")}
            options={timezoneOptions}
            value={timezone}
            onChange={handleTimezoneChange}
            disabled={disabled || isSaving}
            aria-describedby={showWarning ? "timezone-warning" : undefined}
          />
          <p className="im-entity-tab-field-hint">
            {t("timezone.hint")}
          </p>
        </div>

        <div className="im-entity-tab-info">
          <h4 className="im-entity-tab-info-title">{t("timezone.infoTitle")}</h4>
          <ul className="im-entity-tab-info-list">
            <li>{t("timezone.info1")}</li>
            <li>{t("timezone.info2")}</li>
            <li>{t("timezone.info3")}</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
