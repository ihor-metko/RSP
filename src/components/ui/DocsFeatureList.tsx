import { DocsList } from "./DocsList";
import "./DocsFeatureList.css";

export interface DocsFeatureListProps {
  /** Title for the feature list section */
  title?: string;
  /** Array of feature descriptions */
  features: string[];
  /** Icon to use for each feature (defaults to checkmark) */
  icon?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsFeatureList Component
 *
 * A specialized list component for displaying product features
 * in the pre-sales documentation. Shows features with visual icons.
 * Uses im-docs-feature-list semantic classes.
 *
 * @example
 * <DocsFeatureList
 *   title="Key Features"
 *   features={[
 *     "Real-time court availability",
 *     "Automated booking confirmations",
 *     "Multi-club management"
 *   ]}
 *   icon="✓"
 * />
 */
export function DocsFeatureList({
  title,
  features,
  icon = "✓",
  className = "",
}: DocsFeatureListProps) {
  return (
    <div className={`im-docs-feature-list ${className}`.trim()}>
      {title && <h4 className="im-docs-feature-list-title">{title}</h4>}
      <DocsList type="bulleted" className="im-docs-feature-list-items">
        {features.map((feature, index) => (
          <li key={index} className="im-docs-feature-list-item">
            <span className="im-docs-feature-list-icon">{icon}</span>
            <span className="im-docs-feature-list-text">{feature}</span>
          </li>
        ))}
      </DocsList>
    </div>
  );
}
