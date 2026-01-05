"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { DocsSidebar } from "@/components/ui/DocsSidebar";
import Header from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout";
import "./layout.css";

export default function DocsForClubsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations("docs.sidebar");

  const docLinks = [
    { title: t("overview"), href: "/docs/for-clubs/overview" },
    { title: t("problemsWeSolve"), href: "/docs/for-clubs/problems-we-solve" },
    { title: t("howItWorks"), href: "/docs/for-clubs/how-it-works" },
    { title: t("bookingFlow"), href: "/docs/for-clubs/booking-flow" },
    { title: t("multiClub"), href: "/docs/for-clubs/multi-club" },
    { title: t("rolesAndControl"), href: "/docs/for-clubs/roles-and-control" },
    { title: t("gettingStarted"), href: "/docs/for-clubs/getting-started" },
  ];

  return (
    <div className="im-docs-layout">
      <Header />
      <div className="im-docs-container">
        <div className="im-docs-sidebar-wrapper">
          <DocsSidebar items={docLinks} currentPath={pathname} />
        </div>

        <main className="im-docs-content">
          {children}
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}
