import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsFeatureList,
  DocsCallout,
  DocsNote,
  DocsScreenshot,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.player.calendar");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CalendarPage() {
  const t = await getTranslations("docs.preSales.player.calendar");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title={t("callout.title")}>
          {t("callout.content")}
        </DocsCallout>

        <DocsSubsection title={t("subsection.title")}>
          <DocsFeatureList
            features={[
              t("subsection.features.0"),
              t("subsection.features.1"),
              t("subsection.features.2"),
              t("subsection.features.3"),
              t("subsection.features.4"),
            ]}
          />
        </DocsSubsection>

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
