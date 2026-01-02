"use client";

import { IMLink } from "@/components/ui/IMLink";
import "./Breadcrumbs.css";

export interface BreadcrumbItem {
  /** Display label for the breadcrumb */
  label: string;
  /** URL to navigate to (optional for the last/current item) */
  href?: string;
}

export interface BreadcrumbsProps {
  /** Array of breadcrumb items to display */
  items: BreadcrumbItem[];
  /** Separator character between items (default: ">") */
  separator?: string;
  /** Show home icon for the first item if it links to "/" */
  showHomeIcon?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
  /** Accessible label for the navigation element */
  ariaLabel?: string;
}

/**
 * Breadcrumbs Component
 *
 * A reusable navigation component that displays the current path hierarchy.
 * Each breadcrumb item (except the last) is clickable and navigates to the
 * corresponding page. The last item is styled as current/active and not clickable.
 *
 * Features:
 * - Dynamically generate breadcrumbs based on provided items
 * - Semantic HTML with proper accessibility attributes
 * - Light and dark theme support via CSS variables
 * - Customizable separator between items
 * - Optional home icon for root navigation
 *
 * @example
 * // Basic usage
 * <Breadcrumbs
 *   items={[
 *     { label: "Home", href: "/" },
 *     { label: "Clubs", href: "/clubs" },
 *     { label: "Club Name" }
 *   ]}
 * />
 *
 * @example
 * // With custom separator
 * <Breadcrumbs
 *   items={[
 *     { label: "Admin", href: "/admin" },
 *     { label: "Clubs", href: "/admin/clubs" },
 *     { label: "Edit Club" }
 *   ]}
 *   separator="/"
 * />
 */
export function Breadcrumbs({
  items,
  separator = ">",
  showHomeIcon = false,
  className = "",
  ariaLabel = "Breadcrumb navigation",
}: BreadcrumbsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={`im-breadcrumbs ${className}`.trim()}
    >
      <ol className="im-breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;
          const isHome = isFirst && item.href === "/" && showHomeIcon;

          return (
            <li key={index} className="im-breadcrumb-item">
              {/* Separator (not before first item) */}
              {index > 0 && (
                <span className="im-breadcrumb-separator" aria-hidden="true">
                  {separator}
                </span>
              )}

              {/* Breadcrumb content */}
              {isLast || !item.href ? (
                // Current/last item - not clickable
                <span
                  className="im-breadcrumb-current"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                // Clickable link
                <IMLink
                  href={item.href}
                  className="im-breadcrumb-link"
                >
                  {isHome ? (
                    <span className="im-breadcrumb-home-icon" aria-label={item.label}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </span>
                  ) : (
                    item.label
                  )}
                </IMLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
