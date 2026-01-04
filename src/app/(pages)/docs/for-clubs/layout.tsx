import { Metadata } from "next";
import Header from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout";
import "./layout.css";

export const metadata: Metadata = {
  title: "ArenaOne for Clubs – Documentation",
  description: "Documentation for club owners and organizations",
};

export default function DocsForClubsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="im-docs-layout">
      <Header />
      <div className="im-docs-container">
        <aside className="im-docs-sidebar">
          <nav className="im-docs-sidebar-nav">
            <div className="im-docs-sidebar-section">
              <h3 className="im-docs-sidebar-title">Documentation</h3>
              <ul className="im-docs-sidebar-list">
                <li className="im-docs-sidebar-item">
                  <a href="/docs/for-clubs/overview" className="im-docs-sidebar-link">
                    Overview
                  </a>
                </li>
                <li className="im-docs-sidebar-item">
                  <a href="/docs/for-clubs/getting-started" className="im-docs-sidebar-link">
                    Getting Started
                  </a>
                </li>
                <li className="im-docs-sidebar-item">
                  <a href="/docs/for-clubs/how-it-works" className="im-docs-sidebar-link">
                    How It Works
                  </a>
                </li>
                <li className="im-docs-sidebar-item">
                  <a href="/docs/for-clubs/multi-club" className="im-docs-sidebar-link">
                    Multi-Club Management
                  </a>
                </li>
                <li className="im-docs-sidebar-item">
                  <a href="/docs/for-clubs/booking-flow" className="im-docs-sidebar-link">
                    Booking Flow
                  </a>
                </li>
                <li className="im-docs-sidebar-item">
                  <a href="/docs/for-clubs/roles-and-control" className="im-docs-sidebar-link">
                    Roles & Access Control
                  </a>
                </li>
                <li className="im-docs-sidebar-item">
                  <a href="/docs/for-clubs/problems-we-solve" className="im-docs-sidebar-link">
                    Problems We Solve
                  </a>
                </li>
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
