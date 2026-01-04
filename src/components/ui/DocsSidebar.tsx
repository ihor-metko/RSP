"use client";

import { useTranslations } from "next-intl";
import { IMLink } from "./IMLink";
import "./DocsSidebar.css";

export interface DocsSidebarItem {
  title: string;
  href: string;
}

export interface DocsSidebarProps {
  items: DocsSidebarItem[];
  currentPath: string;
}

export function DocsSidebar({ items, currentPath }: DocsSidebarProps) {
  const t = useTranslations("docs.sidebar");
  
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
