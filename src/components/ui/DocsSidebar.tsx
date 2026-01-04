"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IMLink } from "./IMLink";
import "./DocsSidebar.css";

export interface DocsSidebarItem {
  title: string;
  href: string;
}

export interface DocsSidebarGroup {
  title: string;
  items: DocsSidebarItem[];
  defaultOpen?: boolean;
}

export interface DocsSidebarProps {
  items?: DocsSidebarItem[];
  groups?: DocsSidebarGroup[];
  currentPath: string;
}

export function DocsSidebar({ items, groups, currentPath }: DocsSidebarProps) {
  const t = useTranslations("docs.sidebar");
  
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (!groups) return new Set();
    
    // Initially expand groups that contain the current path
    const initialExpanded = new Set<string>();
    groups.forEach((group) => {
      const hasActivePath = group.items.some((item) => currentPath.startsWith(item.href));
      if (hasActivePath || group.defaultOpen) {
        initialExpanded.add(group.title);
      }
    });
    return initialExpanded;
  });

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupTitle)) {
        next.delete(groupTitle);
      } else {
        next.add(groupTitle);
      }
      return next;
    });
  };

  // Simple sidebar with flat items (backwards compatible)
  if (items && !groups) {
    return (
      <aside className="im-docs-sidebar">
        <nav className="im-docs-sidebar-nav" aria-label="Documentation navigation">
          <div className="im-docs-sidebar-section">
            <h3 className="im-docs-sidebar-title">{t("title")}</h3>
            <ul className="im-docs-sidebar-list">
              {items.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <li key={item.href} className="im-docs-sidebar-item">
                    <IMLink
                      href={item.href}
                      className={`im-docs-sidebar-link ${
                        isActive ? "im-docs-sidebar-link--active" : ""
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.title}
                    </IMLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </aside>
    );
  }

  // Enhanced sidebar with grouped items
  return (
    <aside className="im-docs-sidebar">
      <nav className="im-docs-sidebar-nav" aria-label="Documentation navigation">
        <div className="im-docs-sidebar-section">
          <h3 className="im-docs-sidebar-title">{t("title")}</h3>
          {groups?.map((group) => {
            const isExpanded = expandedGroups.has(group.title);
            const hasActivePath = group.items.some((item) => currentPath.startsWith(item.href));
            
            return (
              <div key={group.title} className="im-docs-sidebar-group">
                <button
                  className={`im-docs-sidebar-group-header ${
                    hasActivePath ? "im-docs-sidebar-group-header--active" : ""
                  }`}
                  onClick={() => toggleGroup(group.title)}
                  aria-expanded={isExpanded}
                  aria-controls={`group-${group.title}`}
                >
                  <span className="im-docs-sidebar-group-title">{group.title}</span>
                  <svg
                    className={`im-docs-sidebar-group-icon ${
                      isExpanded ? "im-docs-sidebar-group-icon--expanded" : ""
                    }`}
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {isExpanded && (
                  <ul
                    id={`group-${group.title}`}
                    className="im-docs-sidebar-list im-docs-sidebar-group-list"
                  >
                    {group.items.map((item) => {
                      const isActive = currentPath === item.href;
                      return (
                        <li key={item.href} className="im-docs-sidebar-item">
                          <IMLink
                            href={item.href}
                            className={`im-docs-sidebar-link ${
                              isActive ? "im-docs-sidebar-link--active" : ""
                            }`}
                            aria-current={isActive ? "page" : undefined}
                          >
                            {item.title}
                          </IMLink>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
