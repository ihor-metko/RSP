"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { DocsSidebar } from "@/components/ui/DocsSidebar";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import Header from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout";
import "./layout.css";

export default function PreSalesDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations("docs.preSales.sidebar");

  // Determine which role section we're in
  const roleMatch = pathname.match(/\/docs\/pre-sales\/([^/]+)/);
  const currentRole = roleMatch ? roleMatch[1] : null;

  // Build breadcrumbs
  const breadcrumbs = [];
  breadcrumbs.push({ label: t("breadcrumbs.docs"), href: "/docs/for-clubs" });
  breadcrumbs.push({ label: t("breadcrumbs.preSales"), href: "/docs/pre-sales" });
  
  if (currentRole) {
    const roleKey = currentRole.replace(/-/g, '');
    breadcrumbs.push({
      label: t(`breadcrumbs.${roleKey}`),
      href: `/docs/pre-sales/${currentRole}`,
    });
    
    // Add page-specific breadcrumb if we're on a specific page
    const pageMatch = pathname.match(/\/docs\/pre-sales\/[^/]+\/([^/]+)/);
    if (pageMatch) {
      breadcrumbs.push({ label: t(`${roleKey}.${pageMatch[1]}`) });
    }
  }

  // Define sidebar links based on current role
  const getSidebarLinks = () => {
    if (!currentRole) {
      return [
        { title: t("overview"), href: "/docs/pre-sales" },
      ];
    }

    const links: { [key: string]: Array<{ title: string; href: string }> } = {
      "root-admin": [
        { title: t("rootadmin.overview"), href: "/docs/pre-sales/root-admin/overview" },
        { title: t("rootadmin.create-organization"), href: "/docs/pre-sales/root-admin/create-organization" },
        { title: t("rootadmin.view-org-admins"), href: "/docs/pre-sales/root-admin/view-org-admins" },
      ],
      "org-owner": [
        { title: t("orgowner.create-club"), href: "/docs/pre-sales/org-owner/create-club" },
        { title: t("orgowner.add-org-admin"), href: "/docs/pre-sales/org-owner/add-org-admin" },
        { title: t("orgowner.access-control"), href: "/docs/pre-sales/org-owner/access-control" },
      ],
      "org-admin": [
        { title: t("orgadmin.manage-organization"), href: "/docs/pre-sales/org-admin/manage-organization" },
        { title: t("orgadmin.edit-settings"), href: "/docs/pre-sales/org-admin/edit-settings" },
        { title: t("orgadmin.view-clubs"), href: "/docs/pre-sales/org-admin/view-clubs" },
      ],
      "club-owner": [
        { title: t("clubowner.crud-courts"), href: "/docs/pre-sales/club-owner/crud-courts" },
        { title: t("clubowner.working-hours"), href: "/docs/pre-sales/club-owner/working-hours" },
        { title: t("clubowner.bookings-overview"), href: "/docs/pre-sales/club-owner/bookings-overview" },
      ],
      "club-admin": [
        { title: t("clubadmin.edit-club"), href: "/docs/pre-sales/club-admin/edit-club" },
        { title: t("clubadmin.crud-courts"), href: "/docs/pre-sales/club-admin/crud-courts" },
        { title: t("clubadmin.working-hours"), href: "/docs/pre-sales/club-admin/working-hours" },
        { title: t("clubadmin.bookings-overview"), href: "/docs/pre-sales/club-admin/bookings-overview" },
      ],
    };

    return links[currentRole] || [];
  };

  const docLinks = getSidebarLinks();

  return (
    <div className="im-docs-layout">
      <Header />
      <div className="im-docs-container">
        <div className="im-docs-sidebar-wrapper">
          <DocsSidebar items={docLinks} currentPath={pathname} />
        </div>

        <main className="im-docs-content">
          {breadcrumbs.length > 1 && (
            <div className="im-docs-breadcrumbs-wrapper">
              <Breadcrumbs items={breadcrumbs} separator="/" />
            </div>
          )}
          {children}
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}
