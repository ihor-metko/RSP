import { IMLink } from "./IMLink";
import "./DocsCTA.css";

export interface DocsCTAProps {
  /** URL to navigate to */
  href: string;
  /** Button content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsCTA Component
 *
 * Call-to-action button component styled with im-docs-cta classes.
 * Uses the existing IMLink component for navigation.
 *
 * @example
 * <DocsCTA href="/docs/getting-started">
 *   Get Started Now
 * </DocsCTA>
 *
 * @example
 * <DocsCTA href="/signup">
 *   Sign Up for Free Trial
 * </DocsCTA>
 */
export function DocsCTA({
  href,
  children,
  className = "",
}: DocsCTAProps) {
  return (
    <IMLink
      href={href}
      className={`im-docs-cta ${className}`.trim()}
    >
      {children}
    </IMLink>
  );
}
