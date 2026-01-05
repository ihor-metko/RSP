import "./DocsNote.css";

export interface DocsNoteProps {
  /** Note type: info, warning, or success */
  type?: "info" | "warning" | "success";
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
 *
 * @example
 * <DocsNote type="success">
 *   Your setup is complete and ready to use!
 * </DocsNote>
 */
export function DocsNote({
  type = "info",
  children,
  className = "",
}: DocsNoteProps) {
  const typeClass = `im-docs-note--${type}`;
  const iconMap = {
    info: "ℹ",
    warning: "⚠",
    success: "✓"
  };
  const icon = iconMap[type];

  return (
    <div className={`im-docs-note ${typeClass} ${className}`.trim()}>
      <span className="im-docs-note-icon">{icon}</span>
      <div className="im-docs-note-content">{children}</div>
    </div>
  );
}
