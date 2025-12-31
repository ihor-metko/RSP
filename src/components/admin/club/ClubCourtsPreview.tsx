"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import type { ClubDetail } from "@/types/club";

interface ClubCourtsPreviewProps {
  club: ClubDetail;
  disabled?: boolean;
  disabledTooltip?: string;
}

export function ClubCourtsPreview({ club, disabled = false }: ClubCourtsPreviewProps) {
  const router = useRouter();
  const t = useTranslations();

  const handleAddCourt = () => {
    router.push(`/admin/courts/new?clubId=${club.id}`);
  };

  const handleViewCourt = (courtId: string) => {
    router.push(`/admin/courts/${courtId}`);
  };

  return (
    <div className="im-section-card">
      <div className="im-section-header">
        <div className="im-section-icon im-section-icon--courts">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="im-section-title">{t("clubDetail.courts")}</h2>
        {!disabled && (
          <div className="im-section-actions">
            <Button
              variant="primary"
              onClick={handleAddCourt}
            >
              {t("clubDetail.addCourt")}
            </Button>
          </div>
        )}
      </div>
      {!club.courts || club.courts.length === 0 ? (
        <div className="im-preview-empty-state">
          <p className="im-preview-empty">{t("clubDetail.noCourts")}</p>
          {!disabled && (
            <Button
              variant="primary"
              size="small"
              onClick={handleAddCourt}
            >
              {t("clubDetail.addFirstCourt")}
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="im-clubs-preview-list">
            {club.courts.map((court) => {
              // Format court details
              const courtDetails = [
                court.type,
                court.surface,
                court.indoor ? t("clubs.indoor") : t("clubs.outdoor"),
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <div
                  key={court.id}
                  className="im-club-preview-item im-club-preview-item--clickable"
                  onClick={() => handleViewCourt(court.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleViewCourt(court.id);
                    }
                  }}
                >
                  <div className="im-club-preview-info">
                    <span className="im-club-preview-name">{court.name}</span>
                    <span className="im-club-preview-meta">
                      {courtDetails}
                    </span>
                  </div>

                  <div className="im-club-preview-status">
                    <span
                      className={`im-status-badge ${court.isActive ? "im-status-badge--active" : "im-status-badge--draft"}`}
                    >
                      {court.isActive ? t("common.active") : t("common.inactive")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {club.courts.length > 0 && (
            <Button
              variant="outline"
              size="small"
              onClick={() => router.push(`/admin/courts?clubId=${club.id}`)}
              className="im-view-all-btn"
            >
              {t("clubDetail.viewAllCourts")} ({club.courts.length})
            </Button>
          )}
        </>
      )}
    </div>
  );
}
