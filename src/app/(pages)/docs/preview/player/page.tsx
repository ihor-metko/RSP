"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import DocsSimulationCard from "./components/DocsSimulationCard";
import FlowStep from "./components/FlowStep";
import { Button } from "@/components/ui/Button";

/**
 * Player Preview Documentation Page
 * Entry point for interactive player role documentation and demo flows.
 * 
 * Features:
 * - Interactive booking flow demonstration
 * - Multi-step wizard with visual previews
 * - Clickable buttons to simulate actions
 * - EN/UA localization
 * - No real data modifications (demo only)
 */
export default function PlayerPreviewPage() {
  const t = useTranslations();
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: t("docs.preview.player.step1.title"),
      description: t("docs.preview.player.step1.description"),
    },
    {
      title: t("docs.preview.player.step2.title"),
      description: t("docs.preview.player.step2.description"),
    },
    {
      title: t("docs.preview.player.step3.title"),
      description: t("docs.preview.player.step3.description"),
    },
  ];

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
  };

  const getStepState = (index: number) => {
    if (index === currentStep) return "active";
    if (index < currentStep) return "completed";
    return "default";
  };

  return (
    <div className="im-page-container">
      <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--im-text-primary)" }}>
        {t("docs.preview.player.title")}
      </h1>
      <p className="text-lg mb-8" style={{ color: "var(--im-text-secondary)" }}>
        {t("docs.preview.player.subtitle")}
      </p>

      <DocsSimulationCard
        badge={t("docs.preview.common.demoMode")}
        title={t("docs.preview.player.stepTitle")}
        description={t("docs.preview.player.stepDescription")}
        note={t("docs.preview.common.simulationNote")}
        preview={
          <div className="text-center" style={{ color: "var(--im-text-secondary)" }}>
            <div className="mb-4">
              <svg
                width="120"
                height="120"
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto"
              >
                <rect
                  x="10"
                  y="10"
                  width="100"
                  height="100"
                  rx="8"
                  stroke="var(--im-primary)"
                  strokeWidth="2"
                  fill="var(--im-bg-secondary)"
                />
                <circle
                  cx="60"
                  cy="40"
                  r="15"
                  stroke="var(--im-primary)"
                  strokeWidth="2"
                  fill="transparent"
                />
                <path
                  d="M35 70 L60 85 L85 70"
                  stroke="var(--im-primary)"
                  strokeWidth="2"
                  fill="transparent"
                />
                <line
                  x1="60"
                  y1="55"
                  x2="60"
                  y2="85"
                  stroke="var(--im-primary)"
                  strokeWidth="2"
                />
                <line
                  x1="45"
                  y1="65"
                  x2="75"
                  y2="65"
                  stroke="var(--im-primary)"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <p className="text-sm font-medium">
              {t("docs.preview.common.interactiveFlow")}
            </p>
          </div>
        }
        actions={
          <>
            <Button
              variant="primary"
              onClick={handleNextStep}
              disabled={currentStep === steps.length - 1}
            >
              {currentStep === 0
                ? t("docs.preview.player.actionButton")
                : t("docs.preview.player.nextStep")}
            </Button>
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevStep}>
                {t("docs.preview.player.previousStep")}
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button variant="outline" onClick={handleReset}>
                Reset Demo
              </Button>
            )}
          </>
        }
      >
        <div className="mt-6">
          {steps.map((step, index) => (
            <FlowStep
              key={index}
              stepNumber={index + 1}
              title={step.title}
              description={step.description}
              state={getStepState(index)}
              preview={
                index === currentStep ? (
                  <div className="p-4">
                    <div
                      className="h-32 flex items-center justify-center rounded"
                      style={{
                        backgroundColor: "var(--im-bg-tertiary)",
                        border: "1px dashed var(--im-border)",
                      }}
                    >
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--im-text-secondary)" }}
                      >
                        Step {index + 1} Preview - Interactive UI would appear here
                      </p>
                    </div>
                  </div>
                ) : null
              }
            />
          ))}
        </div>
      </DocsSimulationCard>

      <div className="mt-8 p-6 rounded" style={{ backgroundColor: "var(--im-bg-secondary)", border: "1px solid var(--im-border)" }}>
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--im-text-primary)" }}>
          About This Demo
        </h2>
        <p className="mb-3" style={{ color: "var(--im-text-secondary)" }}>
          This interactive showcase demonstrates how players experience the booking flow on ArenaOne.
          Each step represents a key action in the booking process.
        </p>
        <ul className="list-disc list-inside space-y-2" style={{ color: "var(--im-text-secondary)" }}>
          <li>Click &quot;Start Booking Flow&quot; to begin the demonstration</li>
          <li>Use &quot;Next Step&quot; and &quot;Previous Step&quot; to navigate</li>
          <li>Visual previews show what the actual UI would look like</li>
          <li>No real data is created or modified in this demo</li>
        </ul>
      </div>
    </div>
  );
}
