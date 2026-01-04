"use client";

import { usePathname } from "next/navigation";
import { DocsSidebar } from "@/components/ui/DocsSidebar";
import Header from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout";
import "./layout.css";

const docLinks = [
  { title: "Overview", href: "/docs/for-clubs/overview" },
  { title: "Problems We Solve", href: "/docs/for-clubs/problems-we-solve" },
  { title: "How It Works", href: "/docs/for-clubs/how-it-works" },
  { title: "Booking Flow", href: "/docs/for-clubs/booking-flow" },
  { title: "Multi-Club", href: "/docs/for-clubs/multi-club" },
  { title: "Roles & Control", href: "/docs/for-clubs/roles-and-control" },
  { title: "Getting Started", href: "/docs/for-clubs/getting-started" },
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
        <DocsSidebar items={docLinks} currentPath={pathname} />
        <main className="im-docs-content">
          {children}
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}
