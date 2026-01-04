import "./DocsNote.css";

export interface DocsNoteProps {
  /** Note type: info or warning */
  type?: "info" | "warning";
  /** Note content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsNote Component
 *
 * Highlighted note box with background color, border, and padding.
 * Uses im-docs-note semantic classes.
 *
 * @example
 * <DocsNote type="info">
 *   This is an informational note about the feature.
 * </DocsNote>
 *
 * @example
 * <DocsNote type="warning">
 *   Warning: This action cannot be undone.
 * </DocsNote>
 */
export function DocsNote({
  type = "info",
  children,
  className = "",
}: DocsNoteProps) {
  const typeClass = type === "warning" ? "im-docs-note--warning" : "im-docs-note--info";
  const icon = type === "warning" ? "⚠" : "ℹ";

  return (
    <div className={`im-docs-note ${typeClass} ${className}`.trim()}>
      <span className="im-docs-note-icon">{icon}</span>
      <div className="im-docs-note-content">{children}</div>
    </div>
  );
}
