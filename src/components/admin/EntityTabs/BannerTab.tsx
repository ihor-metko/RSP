"use client";

import { Card } from "@/components/ui";
import { useTranslations } from "next-intl";

export type BannerAlignment = 'top' | 'center' | 'bottom';

export interface BannerData {
  heroImage: { url: string; key: string; file?: File; preview?: string } | null;
  bannerAlignment?: BannerAlignment;
}

interface BannerTabProps {
  initialData?: BannerData;
  onSave?: () => Promise<void>;
  disabled?: boolean;
  translationNamespace?: string;
}

export function BannerTab({ translationNamespace = "organizations.tabs" }: BannerTabProps) {
  const t = useTranslations(translationNamespace);

  return (
    <Card className="im-entity-tab-card">
      <div className="im-entity-tab-header">
        <div>
          <h3 className="im-entity-tab-title">{t("banner.title")}</h3>
          <p className="im-entity-tab-description">{t("banner.description")}</p>
        </div>
      </div>

      <div className="im-entity-tab-content">
        <div className="im-entity-tab-field">
          <p className="im-field-hint">
            Banner upload and management will be available in a future update.
          </p>
        </div>
      </div>
    </Card>
  );
}
