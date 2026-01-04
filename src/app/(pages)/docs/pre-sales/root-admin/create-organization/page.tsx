import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSteps,
  DocsNote,
  DocsCallout,
  DocsCTA,
  DocsScreenshot,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.rootAdmin.createOrganization");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CreateOrganizationPage() {
  const t = await getTranslations("docs.preSales.rootAdmin.createOrganization");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title={t("callout.title")}>
          {t("callout.content")}
        </DocsCallout>

        <DocsSteps
          steps={[
            {
              title: t("subsection1.steps.0.title"),
              description: t("subsection1.steps.0.description"),
            },
            {
              title: t("subsection1.steps.1.title"),
              description: t("subsection1.steps.1.description"),
            },
            {
              title: t("subsection1.steps.2.title"),
              description: t("subsection1.steps.2.description"),
            },
            {
              title: t("subsection1.steps.3.title"),
              description: t("subsection1.steps.3.description"),
            },
            {
              title: t("subsection1.steps.4.title"),
              description: t("subsection1.steps.4.description"),
            },
            {
              title: t("subsection1.steps.5.title"),
              description: t("subsection1.steps.5.description"),
            },
          ]}
        />

        <DocsScreenshot
          alt={t("screenshot.alt")}
          caption={t("screenshot.caption")}
        />

        <DocsNote type="info">
          {t("note.content")}
        </DocsNote>

        <DocsCTA href={t("cta.href")}>
          {t("cta.text")}
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
