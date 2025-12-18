/**
 * Wizard navigation buttons component
 * Handles back/cancel and next/submit buttons
 */
"use client";

import { useTranslations } from "next-intl";

interface WizardNavigationButtonsProps {
  canProceed: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
}

export function WizardNavigationButtons({
  canProceed,
  isFirstStep,
  isLastStep,
  isSubmitting,
  onBack,
  onNext,
  onCancel,
}: WizardNavigationButtonsProps) {
  const t = useTranslations();

  return (
    <div className="rsp-admin-wizard-nav">
      <button
        type="button"
        className="rsp-admin-wizard-nav-btn rsp-admin-wizard-nav-btn--back"
        onClick={isFirstStep ? onCancel : onBack}
        disabled={isSubmitting}
      >
        {isFirstStep ? (
          t("common.cancel")
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="15,18 9,12 15,6" />
            </svg>
            {t("common.back")}
          </>
        )}
      </button>

      <button
        type="button"
        className="rsp-admin-wizard-nav-btn rsp-admin-wizard-nav-btn--next"
        onClick={onNext}
        disabled={!canProceed}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="rsp-admin-wizard-spinner" aria-hidden="true" />
            {t("common.processing")}
          </>
        ) : isLastStep ? (
          t("wizard.confirmBooking")
        ) : (
          <>
            {t("wizard.continue")}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="9,18 15,12 9,6" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
