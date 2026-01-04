"use client";

/**
 * FlowStep Component
 * Represents a single step in an interactive documentation flow.
 * Used to guide users through club admin role functionality demonstrations.
 */
interface FlowStepProps {
  stepNumber?: number;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export default function FlowStep({
  stepNumber,
  title,
  description,
  children,
}: FlowStepProps) {
  return (
    <div className="im-flow-step">
      {stepNumber && (
        <div className="im-step-number">
          {stepNumber}
        </div>
      )}
      {title && <h4 className="im-step-title">{title}</h4>}
      {description && <p className="im-text-muted">{description}</p>}
      {children}
    </div>
  );
}
