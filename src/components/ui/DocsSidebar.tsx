"use client";

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
}

// Make props mutually exclusive using union types
type DocsSidebarProps = {
  currentPath: string;
} & (
  | {
      items: DocsSidebarItem[];
      groups?: never;
    }
  | {
      items?: never;
      groups: DocsSidebarGroup[];
    }
);

export function DocsSidebar({ items, groups, currentPath }: DocsSidebarProps) {
  const t = useTranslations("docs.sidebar");
  
  return (
    <aside className="im-docs-sidebar">
      <nav className="im-docs-sidebar-nav" aria-label="Documentation navigation">
        {/* Flat list */}
        {items && (
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
        )}

        {/* Grouped/hierarchical list */}
        {groups && groups.map((group) => (
          <div key={group.title} className="im-docs-sidebar-section">
            <h3 className="im-docs-sidebar-title">{group.title}</h3>
            <ul className="im-docs-sidebar-list">
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
          </div>
        ))}
      </nav>
    </aside>
  );
}
