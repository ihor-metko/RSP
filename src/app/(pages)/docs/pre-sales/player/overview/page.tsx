import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { IMLink } from "@/components/ui/IMLink";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.player.overview");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PlayerOverviewPage() {
  const t = await getTranslations("docs.preSales.player.overview");
  
  const flows = [
    {
      name: t("flows.quickBooking.name"),
      description: t("flows.quickBooking.description"),
      href: "/docs/pre-sales/player/quick-booking",
    },
    {
      name: t("flows.calendar.name"),
      description: t("flows.calendar.description"),
      href: "/docs/pre-sales/player/calendar",
    },
    {
      name: t("flows.confirmation.name"),
      description: t("flows.confirmation.description"),
      href: "/docs/pre-sales/player/confirmation",
    },
  ];
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>
      </DocsSection>

      <DocsSection title={t("flows.title")}>
        <p>{t("flows.description")}</p>
        <div className="im-docs-role-grid">
          {flows.map((flow) => (
            <IMLink
              key={flow.href}
              href={flow.href}
              className="im-docs-role-card"
            >
              <h3 className="im-docs-role-card-title">{flow.name}</h3>
              <p className="im-docs-role-card-description">{flow.description}</p>
            </IMLink>
          ))}
        </div>
      </DocsSection>
    </DocsPage>
  );
}
