"use client";

import { useTranslations } from "next-intl";
import { formatPrice } from "@/utils/price";
import type { CourtDetail } from "./types";
import "./CourtPreview.css";

interface CourtPreviewProps {
  court: CourtDetail;
  clubId: string;
}

export function CourtPreview({ court, clubId }: CourtPreviewProps) {
  const t = useTranslations();
  
  return (
    <div className="im-preview">
      <div className="im-preview-header">
        <h3 className="im-preview-title">{t("courtDetail.blocks.preview.title")}</h3>
        <span className="im-preview-badge">
          {court.indoor ? t("courtDetail.blocks.preview.indoor") : t("courtDetail.blocks.preview.outdoor")}
        </span>
      </div>

      <div className="im-preview-content">
        {/* Court image placeholder */}
        <div className="im-preview-image">
          <div className="im-preview-image-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21,15 16,10 5,21" />
            </svg>
            <span>{t("courtDetail.blocks.preview.courtImage")}</span>
          </div>
        </div>

        {/* Court info */}
        <div className="im-preview-info">
          <h4 className="im-preview-name">{court.name}</h4>
          
          {court.slug && (
            <p className="im-preview-slug">/courts/{court.slug}</p>
          )}

          <div className="im-preview-badges">
            <span className={`im-preview-type-badge ${court.indoor ? "im-preview-type-badge--indoor" : "im-preview-type-badge--outdoor"}`}>
              {court.indoor ? t("courtDetail.blocks.preview.indoor") : t("courtDetail.blocks.preview.outdoor")}
            </span>
            {court.type && (
              <span className="im-preview-type-badge im-preview-type-badge--type">
                {court.type}
              </span>
            )}
            {court.surface && (
              <span className="im-preview-type-badge im-preview-type-badge--surface">
                {court.surface}
              </span>
            )}
          </div>

          <div className="im-preview-price">
            <span className="im-preview-price-value">
              {formatPrice(court.defaultPriceCents)}
            </span>
            <span className="im-preview-price-unit">/hour</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="im-preview-actions">
          <a
            href={`/clubs/${clubId}/courts/${court.id}/availability`}
            className="im-preview-action"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {t("courtDetail.blocks.preview.viewAvailability")}
          </a>
        </div>
      </div>
    </div>
  );
}
