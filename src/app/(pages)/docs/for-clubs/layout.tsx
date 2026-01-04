"use client";

import { usePathname } from "next/navigation";
import { IMLink } from "@/components/ui/IMLink";
import Header from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout";
import "./layout.css";

const docLinks = [
  { href: "/docs/for-clubs/overview", label: "Overview" },
  { href: "/docs/for-clubs/getting-started", label: "Getting Started" },
  { href: "/docs/for-clubs/how-it-works", label: "How It Works" },
  { href: "/docs/for-clubs/multi-club", label: "Multi-Club Management" },
  { href: "/docs/for-clubs/booking-flow", label: "Booking Flow" },
  { href: "/docs/for-clubs/roles-and-control", label: "Roles & Access Control" },
  { href: "/docs/for-clubs/problems-we-solve", label: "Problems We Solve" },
  { href: "/docs/for-clubs/components-example", label: "Components Example" },
];

export default function DocsForClubsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="im-docs-layout">
      <Header />
      <div className="im-docs-container">
        <aside className="im-docs-sidebar">
          <nav className="im-docs-sidebar-nav" aria-label="Documentation navigation">
            <div className="im-docs-sidebar-section">
              <h3 className="im-docs-sidebar-title">Documentation</h3>
              <ul className="im-docs-sidebar-list">
                {docLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <li key={link.href} className="im-docs-sidebar-item">
                      <IMLink
                        href={link.href}
                        className={`im-docs-sidebar-link ${
                          isActive ? "im-docs-sidebar-link--active" : ""
                        }`}
                      >
                        {link.label}
                      </IMLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </aside>
        <main className="im-docs-content">
          {children}
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}
