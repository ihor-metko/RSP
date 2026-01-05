import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsRoleGrid,
} from "@/components/ui/docs";

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
      icon: "👑",
    },
    {
      name: t("roles.orgOwner.name"),
      description: t("roles.orgOwner.description"),
      href: "/docs/pre-sales/org-owner/create-club",
      icon: "🏢",
    },
    {
      name: t("roles.orgAdmin.name"),
      description: t("roles.orgAdmin.description"),
      href: "/docs/pre-sales/org-admin/manage-organization",
      icon: "⚙️",
    },
    {
      name: t("roles.clubOwner.name"),
      description: t("roles.clubOwner.description"),
      href: "/docs/pre-sales/club-owner/crud-courts",
      icon: "🎾",
    },
    {
      name: t("roles.clubAdmin.name"),
      description: t("roles.clubAdmin.description"),
      href: "/docs/pre-sales/club-admin/edit-club",
      icon: "🏟️",
    },
    {
      name: t("roles.player.name"),
      description: t("roles.player.description"),
      href: "/docs/pre-sales/player/overview",
      icon: "🎮",
    },
  ];
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("overview.title")}>
        <p>{t("overview.description")}</p>
      </DocsSection>

      <DocsSection title={t("selectRole.title")}>
        <p>{t("selectRole.description")}</p>
        <DocsRoleGrid roles={roles} />
      </DocsSection>
    </DocsPage>
  );
}
