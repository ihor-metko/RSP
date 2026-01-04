import { IMLink } from "./IMLink";
import "./DocsCTA.css";

export interface DocsCTAProps {
  /** URL to navigate to */
  href: string;
  /** Button content */
  children: React.ReactNode;
  /** Button variant: primary or secondary */
  variant?: "primary" | "secondary";
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
 *
 * @example
 * <DocsCTA href="/docs/overview" variant="secondary">
 *   Learn More
 * </DocsCTA>
 */
export function DocsCTA({
  href,
  children,
  variant = "primary",
  className = "",
}: DocsCTAProps) {
  const variantClass = variant === "secondary" ? "im-docs-cta--secondary" : "im-docs-cta--primary";
  
  return (
    <IMLink
      href={href}
      className={`im-docs-cta ${variantClass} ${className}`.trim()}
    >
      {children}
    </IMLink>
  );
}
