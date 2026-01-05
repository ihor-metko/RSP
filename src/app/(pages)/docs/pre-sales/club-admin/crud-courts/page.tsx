import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsSteps,
  DocsCallout,
  DocsNote,
  DocsScreenshot,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.clubAdmin.crudCourts");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CrudCourtsPage() {
  const t = await getTranslations("docs.preSales.clubAdmin.crudCourts");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title={t("callout.title")}>
          {t("callout.content")}
        </DocsCallout>

        <DocsSubsection title={t("subsection1.title")}>
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
            alt={t("screenshot1.alt")}
            caption={t("screenshot1.caption")}
          />
        </DocsSubsection>

        <DocsSubsection title={t("subsection2.title")}>
          <p>{t("subsection2.content")}</p>
          <DocsNote type="info">
            {t("note1.content")}
          </DocsNote>
        </DocsSubsection>

        <DocsSubsection title={t("subsection3.title")}>
          <p>{t("subsection3.content")}</p>
          <DocsNote type="warning">
            {t("note2.content")}
          </DocsNote>
        </DocsSubsection>

        <DocsCTA href={t("cta.href")}>
          {t("cta.text")}
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
