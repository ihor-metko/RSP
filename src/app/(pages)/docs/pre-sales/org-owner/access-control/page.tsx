import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsFeatureList,
  DocsList,
  DocsCallout,
  DocsNote,
  DocsScreenshot,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.orgOwner.accessControl");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AccessControlPage() {
  const t = await getTranslations("docs.preSales.orgOwner.accessControl");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title={t("callout.title")}>
          {t("callout.content")}
        </DocsCallout>

        <DocsSubsection title={t("subsection1.title")}>
          <DocsList
            type="numbered"
            items={[
              t("subsection1.items.0"),
              t("subsection1.items.1"),
              t("subsection1.items.2"),
              t("subsection1.items.3"),
              t("subsection1.items.4"),
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt={t("screenshot.alt")}
          caption={t("screenshot.caption")}
        />

        <DocsSubsection title={t("subsection2.title")}>
          <DocsFeatureList
            features={[
              t("subsection2.features.0"),
              t("subsection2.features.1"),
              t("subsection2.features.2"),
              t("subsection2.features.3"),
              t("subsection2.features.4"),
            ]}
          />
        </DocsSubsection>

        <DocsSubsection title={t("subsection3.title")}>
          <DocsList
            type="bulleted"
            items={[
              t("subsection3.items.0"),
              t("subsection3.items.1"),
              t("subsection3.items.2"),
              t("subsection3.items.3"),
              t("subsection3.items.4"),
            ]}
          />
        </DocsSubsection>

        <DocsNote type="warning">
          {t("note.content")}
        </DocsNote>

        <DocsCTA href={t("cta.href")}>
          {t("cta.text")}
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
