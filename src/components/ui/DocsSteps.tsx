import "./DocsSteps.css";

export interface DocsStep {
  /** Step number (auto-generated if not provided) */
  number?: number;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
}

export interface DocsStepsProps {
  /** Array of steps to display */
  steps: DocsStep[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsSteps Component
 *
 * A visually enhanced component for displaying step-by-step instructions.
 * Shows numbered steps with titles and descriptions.
 * Uses im-docs-steps semantic classes.
 *
 * @example
 * <DocsSteps
 *   steps={[
 *     {
 *       title: "Sign Up",
 *       description: "Create your account with email and password"
 *     },
 *     {
 *       title: "Configure Settings",
 *       description: "Set up your club preferences and working hours"
 *     },
 *     {
 *       title: "Go Live",
 *       description: "Publish your club and start accepting bookings"
 *     }
 *   ]}
 * />
 */
export function DocsSteps({ steps, className = "" }: DocsStepsProps) {
  return (
    <div className={`im-docs-steps ${className}`.trim()}>
      {steps.map((step, index) => {
        const stepNumber = step.number ?? index + 1;
        return (
          <div key={index} className="im-docs-step">
            <div className="im-docs-step-number">{stepNumber}</div>
            <div className="im-docs-step-content">
              <h4 className="im-docs-step-title">{step.title}</h4>
              <p className="im-docs-step-description">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
