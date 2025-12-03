"use client";

import type { CourtDetail } from "./types";
import "./CourtMetaBlock.css";

interface CourtMetaBlockProps {
  court: CourtDetail;
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CourtMetaBlock({ court }: CourtMetaBlockProps) {
  return (
    <div className="im-block im-court-meta-block">
      <div className="im-block-header">
        <h2 className="im-block-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Metadata
        </h2>
      </div>

      <div className="im-block-content">
        <div className="im-block-row">
          <span className="im-block-label">Court ID</span>
          <span className="im-block-value im-block-value--mono">
            {court.id}
          </span>
        </div>

        <div className="im-block-row">
          <span className="im-block-label">Club</span>
          <span className="im-block-value">
            {court.club?.name || "Unknown"}
          </span>
        </div>

        <div className="im-block-row">
          <span className="im-block-label">Created</span>
          <span className="im-block-value">
            {formatDate(court.createdAt)}
          </span>
        </div>

        <div className="im-block-row">
          <span className="im-block-label">Last Updated</span>
          <span className="im-block-value">
            {formatDate(court.updatedAt)}
          </span>
        </div>

        {court.slug && (
          <div className="im-block-row">
            <span className="im-block-label">Public URL</span>
            <span className="im-block-value im-block-value--mono">
              /courts/{court.slug}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
