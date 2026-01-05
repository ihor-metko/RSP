import Image from "next/image";
import "./DocsScreenshot.css";

export interface DocsScreenshotProps {
  /** Alt text for the screenshot */
  alt: string;
  /** Optional src for the screenshot image */
  src?: string;
  /** Optional caption below the screenshot */
  caption?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsScreenshot Component
 *
 * Displays a screenshot or visual placeholder in documentation.
 * Uses im-docs-screenshot semantic classes.
 *
 * @example
 * <DocsScreenshot 
 *   src="/images/screenshots/dashboard.png" 
 *   alt="Dashboard overview"
 *   caption="The main dashboard showing key metrics"
 * />
 *
 * @example
 * // Placeholder mode (no src provided)
 * <DocsScreenshot 
 *   alt="Feature screenshot coming soon"
 *   caption="Screenshot will be added in the next update"
 * />
 */
export function DocsScreenshot({
  alt,
  src,
  caption,
  className = "",
}: DocsScreenshotProps) {
  return (
    <figure className={`im-docs-screenshot ${className}`.trim()}>
      <div className="im-docs-screenshot-container">
        {src ? (
          <Image 
            src={src} 
            alt={alt} 
            className="im-docs-screenshot-image"
            width={800}
            height={600}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <div className="im-docs-screenshot-placeholder">
            <span className="im-docs-screenshot-placeholder-icon">🖼️</span>
            <span className="im-docs-screenshot-placeholder-text">{alt}</span>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="im-docs-screenshot-caption">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
