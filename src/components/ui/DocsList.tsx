import "./DocsList.css";

export interface DocsListProps {
  /** List type: bulleted or numbered */
  type?: "bulleted" | "numbered";
  /** List items */
  items?: string[];
  /** Alternative: use children for complex list items */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsList Component
 *
 * Bulleted or numbered lists styled with im-docs-list classes.
 *
 * @example
 * // Simple list with items array
 * <DocsList type="bulleted" items={["Feature 1", "Feature 2", "Feature 3"]} />
 *
 * @example
 * // Complex list with children
 * <DocsList type="numbered">
 *   <li>First step with <strong>emphasis</strong></li>
 *   <li>Second step</li>
 * </DocsList>
 */
export function DocsList({
  type = "bulleted",
  items,
  children,
  className = "",
}: DocsListProps) {
  const ListTag = type === "numbered" ? "ol" : "ul";
  const listTypeClass = type === "numbered" ? "im-docs-list--numbered" : "im-docs-list--bulleted";

  return (
    <ListTag className={`im-docs-list ${listTypeClass} ${className}`.trim()}>
      {items
        ? items.map((item, index) => (
            <li key={index} className="im-docs-list-item">
              {item}
            </li>
          ))
        : children}
    </ListTag>
  );
}
