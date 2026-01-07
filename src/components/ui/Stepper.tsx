import "./Stepper.css";

export interface Step {
  id: number;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  allowNavigation?: boolean;
}

export function Stepper({ steps, currentStep, onStepClick, allowNavigation = false }: StepperProps) {
  return (
    <div className="im-stepper-indicator">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        const isClickable = allowNavigation && (isCompleted || isActive);

        return (
          <div key={step.id} className="im-stepper-indicator-step-wrapper">
            {index > 0 && (
              <div
                className={`im-stepper-indicator-line ${
                  isCompleted ? "im-stepper-indicator-line--completed" : ""
                }`}
              />
            )}
            <button
              className={`im-stepper-indicator-step ${
                isActive ? "im-stepper-indicator-step--active" : ""
              } ${isCompleted ? "im-stepper-indicator-step--completed" : ""}`}
              onClick={() => isClickable && onStepClick?.(step.id)}
              disabled={!isClickable}
              type="button"
            >
              <div className="im-stepper-indicator-number">
                {isCompleted ? "✓" : step.id}
              </div>
              <div className="im-stepper-indicator-text">
                <div className="im-stepper-indicator-label">{step.label}</div>
                {step.description && (
                  <div className="im-stepper-indicator-description">{step.description}</div>
                )}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
