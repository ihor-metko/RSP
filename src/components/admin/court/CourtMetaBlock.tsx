"use client";

import { useTranslations } from "next-intl";
import { useCurrentLocale } from "@/hooks/useCurrentLocale";
import { formatDateTime } from "@/utils/date";
import type { CourtDetail } from "./types";
import "./CourtMetaBlock.css";

interface CourtMetaBlockProps {
  court: CourtDetail;
}

export function CourtMetaBlock({ court }: CourtMetaBlockProps) {
  const t = useTranslations();
  const locale = useCurrentLocale();
  
  return (
    <div className="im-block im-court-meta-block">
      <div className="im-block-header">
        <h2 className="im-block-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          {t("courtDetail.blocks.metadata.title")}
        </h2>
      </div>

      <div className="im-block-content">
        <div className="im-block-row">
          <span className="im-block-label">{t("courtDetail.blocks.metadata.courtId")}</span>
          <span className="im-block-value im-block-value--mono">
            {court.id}
          </span>
        </div>

        <div className="im-block-row">
          <span className="im-block-label">{t("courtDetail.blocks.metadata.club")}</span>
          <span className="im-block-value">
            {court.club?.name || t("courtDetail.blocks.metadata.unknown")}
          </span>
        </div>

        <div className="im-block-row">
          <span className="im-block-label">{t("courtDetail.blocks.metadata.created")}</span>
          <span className="im-block-value">
            {court.createdAt ? formatDateTime(court.createdAt, locale) : t("courtDetail.blocks.metadata.unknown")}
          </span>
        </div>

        <div className="im-block-row">
          <span className="im-block-label">{t("courtDetail.blocks.metadata.lastUpdated")}</span>
          <span className="im-block-value">
            {court.updatedAt ? formatDateTime(court.updatedAt, locale) : t("courtDetail.blocks.metadata.unknown")}
          </span>
        </div>

        {court.slug && (
          <div className="im-block-row">
            <span className="im-block-label">{t("courtDetail.blocks.metadata.publicUrl")}</span>
            <span className="im-block-value im-block-value--mono">
              /courts/{court.slug}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
