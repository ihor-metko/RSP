import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { IMLink } from "@/components/ui/IMLink";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.index");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PreSalesIndexPage() {
  const t = await getTranslations("docs.preSales.index");
  
  const roles = [
    {
      name: t("roles.rootAdmin.name"),
      description: t("roles.rootAdmin.description"),
      href: "/docs/pre-sales/root-admin/overview",
    },
    {
      name: t("roles.orgOwner.name"),
      description: t("roles.orgOwner.description"),
      href: "/docs/pre-sales/org-owner/create-club",
    },
    {
      name: t("roles.orgAdmin.name"),
      description: t("roles.orgAdmin.description"),
      href: "/docs/pre-sales/org-admin/manage-organization",
    },
    {
      name: t("roles.clubOwner.name"),
      description: t("roles.clubOwner.description"),
      href: "/docs/pre-sales/club-owner/crud-courts",
    },
    {
      name: t("roles.clubAdmin.name"),
      description: t("roles.clubAdmin.description"),
      href: "/docs/pre-sales/club-admin/edit-club",
    },
    {
      name: t("roles.player.name"),
      description: t("roles.player.description"),
      href: "/docs/pre-sales/player/overview",
    },
  ];
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("overview.title")}>
        <p>{t("overview.description")}</p>
      </DocsSection>

      <DocsSection title={t("selectRole.title")}>
        <p>{t("selectRole.description")}</p>
        <div className="im-docs-role-grid">
          {roles.map((role) => (
            <IMLink
              key={role.href}
              href={role.href}
              className="im-docs-role-card"
            >
              <h3 className="im-docs-role-card-title">{role.name}</h3>
              <p className="im-docs-role-card-description">{role.description}</p>
            </IMLink>
          ))}
        </div>
      </DocsSection>
    </DocsPage>
  );
}
