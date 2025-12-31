"use client";

import { Card } from "@/components/ui";
import { useTranslations } from "next-intl";

export interface LogoData {
  logoCount: 'one' | 'two';
  logo: { url: string; key: string; file?: File; preview?: string } | null;
  logoTheme: 'light' | 'dark';
  secondLogo: { url: string; key: string; file?: File; preview?: string } | null;
  secondLogoTheme: 'light' | 'dark';
}

interface LogoTabProps {
  initialData?: LogoData;
  onSave?: () => Promise<void>;
  disabled?: boolean;
  translationNamespace?: string;
}

export function LogoTab({ translationNamespace = "organizations.tabs" }: LogoTabProps) {
  const t = useTranslations(translationNamespace);

  return (
    <Card className="im-entity-tab-card">
      <div className="im-entity-tab-header">
        <div>
          <h3 className="im-entity-tab-title">{t("logo.title")}</h3>
          <p className="im-entity-tab-description">{t("logo.description")}</p>
        </div>
      </div>

      <div className="im-entity-tab-content">
        <div className="im-entity-tab-field">
          <p className="im-field-hint">
            Logo upload and management will be available in a future update.
          </p>
        </div>
      </div>
    </Card>
  );
}
