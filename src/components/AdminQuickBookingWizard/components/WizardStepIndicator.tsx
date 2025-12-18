/**
 * Wizard step indicator component
 * Shows progress through the wizard steps with visual feedback
 */
"use client";

import { useTranslations } from "next-intl";
import type { WizardStepConfig } from "../types";

interface WizardStepIndicatorProps {
  steps: WizardStepConfig[];
  currentStep: number;
}

export function WizardStepIndicator({
  steps,
  currentStep,
}: WizardStepIndicatorProps) {
  const t = useTranslations();

  return (
    <nav
      className="rsp-admin-wizard-steps"
      aria-label={t("wizard.progress")}
    >
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = steps.findIndex((s) => s.id === currentStep) > index;

        return (
          <div
            key={step.id}
            className={`rsp-admin-wizard-step-indicator ${
              isActive ? "rsp-admin-wizard-step-indicator--active" : ""
            } ${isCompleted ? "rsp-admin-wizard-step-indicator--completed" : ""}`}
            aria-current={isActive ? "step" : undefined}
          >
            <div
              className="rsp-admin-wizard-step-circle"
              aria-hidden="true"
            >
              {isCompleted ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span className="rsp-admin-wizard-step-label">
              {t(`adminWizard.steps.${step.label}`)}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
