import "./DocsPage.css";

export interface DocsPageProps {
  /** The title of the documentation page */
  title: string;
  /** Optional sidebar content */
  sidebar?: React.ReactNode;
  /** Page content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsPage Component
 *
 * Main wrapper for a documentation page. Provides dark theme layout
 * with im-docs-* semantic classes.
 *
 * @example
 * <DocsPage title="Getting Started">
 *   <DocsSection title="Introduction">
 *     <p>Welcome to our documentation...</p>
 *   </DocsSection>
 * </DocsPage>
 */
export function DocsPage({
  title,
  sidebar,
  children,
  className = "",
}: DocsPageProps) {
  return (
    <div className={`im-docs-page ${className}`.trim()}>
      <h1 className="im-docs-page-title">{title}</h1>
      {sidebar && <aside className="im-docs-page-sidebar">{sidebar}</aside>}
      <div className="im-docs-page-content">{children}</div>
    </div>
  );
}
