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
  const t = await getTranslations("docs.preSales.rootAdmin.viewOrgAdmins");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ViewOrgAdminsPage() {
  const t = await getTranslations("docs.preSales.rootAdmin.viewOrgAdmins");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title={t("callout.title")}>
          {t("callout.content")}
        </DocsCallout>

        <DocsSubsection title={t("subsection1.title")}>
          <DocsFeatureList
            features={[
              t("subsection1.features.0"),
              t("subsection1.features.1"),
              t("subsection1.features.2"),
              t("subsection1.features.3"),
              t("subsection1.features.4"),
              t("subsection1.features.5"),
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

        <DocsNote type="info">
          {t("note1.content")}
        </DocsNote>

        <DocsNote type="warning">
          {t("note2.content")}
        </DocsNote>

        <DocsCTA href={t("cta.href")}>
          {t("cta.text")}
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
