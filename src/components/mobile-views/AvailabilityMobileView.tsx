"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import "./MobileViews.css";

interface AvailabilityMobileViewProps {
  clubName?: string;
  currentStep: 1 | 2 | 3;
  onStepChange?: (step: 1 | 2 | 3) => void;
}

/**
 * AvailabilityMobileView
 * 
 * Mobile-first availability selection skeleton with step-based flow.
 * Step 1: Date picker
 * Step 2: Time slot list
 * Step 3: Court selection
 * 
 * This is a placeholder skeleton - no actual booking logic implemented.
 */
export function AvailabilityMobileView({
  clubName,
  currentStep,
  onStepChange,
}: AvailabilityMobileViewProps) {
  const t = useTranslations();

  return (
    <div className="im-mobile-availability">
      {/* Header */}
      <div className="im-mobile-availability-header">
        <h1 className="im-mobile-availability-title">
          {t("availability.title")}
        </h1>
        {clubName && (
          <p className="im-mobile-availability-subtitle">{clubName}</p>
        )}
      </div>

      {/* Step Indicator */}
      <div className="im-mobile-availability-steps">
        <div
          className={`im-mobile-availability-step ${
            currentStep === 1 ? "im-mobile-availability-step-active" : ""
          } ${currentStep > 1 ? "im-mobile-availability-step-completed" : ""}`}
        >
          <div className="im-mobile-availability-step-number">1</div>
          <div className="im-mobile-availability-step-label">
            {t("availability.selectDate")}
          </div>
        </div>

        <div className="im-mobile-availability-step-divider" />

        <div
          className={`im-mobile-availability-step ${
            currentStep === 2 ? "im-mobile-availability-step-active" : ""
          } ${currentStep > 2 ? "im-mobile-availability-step-completed" : ""}`}
        >
          <div className="im-mobile-availability-step-number">2</div>
          <div className="im-mobile-availability-step-label">
            {t("availability.selectTime")}
          </div>
        </div>

        <div className="im-mobile-availability-step-divider" />

        <div
          className={`im-mobile-availability-step ${
            currentStep === 3 ? "im-mobile-availability-step-active" : ""
          }`}
        >
          <div className="im-mobile-availability-step-number">3</div>
          <div className="im-mobile-availability-step-label">
            {t("availability.selectCourt")}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="im-mobile-availability-content">
        {currentStep === 1 && (
          <div className="im-mobile-availability-step-content">
            <h2 className="im-mobile-availability-step-title">
              {t("availability.selectDate")}
            </h2>
            <div className="im-mobile-availability-placeholder">
              {/* Placeholder for date picker */}
              <div className="im-mobile-availability-placeholder-item">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{t("availability.datePickerPlaceholder")}</span>
              </div>
            </div>
            {onStepChange && (
              <div className="im-mobile-availability-actions">
                <Button
                  onClick={() => onStepChange(2)}
                  className="im-mobile-availability-next-btn"
                >
                  {t("common.next")}
                </Button>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="im-mobile-availability-step-content">
            <h2 className="im-mobile-availability-step-title">
              {t("availability.selectTime")}
            </h2>
            {/* Placeholder for time slot list */}
            <div className="im-mobile-availability-list">
              {[1, 2, 3, 4, 5].map((slot) => (
                <div key={slot} className="im-mobile-availability-list-item">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  <span>{`${t("availability.timeSlotPlaceholder")} ${slot}`}</span>
                </div>
              ))}
            </div>
            {onStepChange && (
              <div className="im-mobile-availability-actions">
                <Button
                  onClick={() => onStepChange(1)}
                  variant="outline"
                  className="im-mobile-availability-back-btn"
                >
                  {t("common.back")}
                </Button>
                <Button
                  onClick={() => onStepChange(3)}
                  className="im-mobile-availability-next-btn"
                >
                  {t("common.next")}
                </Button>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="im-mobile-availability-step-content">
            <h2 className="im-mobile-availability-step-title">
              {t("availability.selectCourt")}
            </h2>
            {/* Placeholder for court list */}
            <div className="im-mobile-availability-list">
              {[1, 2, 3].map((court) => (
                <div key={court} className="im-mobile-availability-list-item">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                  <div>
                    <div className="im-mobile-availability-list-item-title">
                      {`${t("availability.courtPlaceholder")} ${court}`}
                    </div>
                    <div className="im-mobile-availability-list-item-subtitle">
                      {t("availability.courtDetailsPlaceholder")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {onStepChange && (
              <div className="im-mobile-availability-actions">
                <Button
                  onClick={() => onStepChange(2)}
                  variant="outline"
                  className="im-mobile-availability-back-btn"
                >
                  {t("common.back")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
