import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsList,
  DocsCallout,
  DocsNote,
  DocsScreenshot,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.clubAdmin.editClub");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function EditClubPage() {
  const t = await getTranslations("docs.preSales.clubAdmin.editClub");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title={t("callout.title")}>
          {t("callout.content")}
        </DocsCallout>

        <DocsSubsection title={t("subsection1.title")}>
          <DocsList
            type="bulleted"
            items={[
              t("subsection1.items.0"),
              t("subsection1.items.1"),
              t("subsection1.items.2"),
              t("subsection1.items.3"),
              t("subsection1.items.4"),
              t("subsection1.items.5"),
              t("subsection1.items.6"),
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt={t("screenshot.alt")}
          caption={t("screenshot.caption")}
        />

        <DocsSubsection title={t("subsection2.title")}>
          <p>{t("subsection2.content")}</p>
          <DocsList
            type="bulleted"
            items={[
              t("subsection2.items.0"),
              t("subsection2.items.1"),
              t("subsection2.items.2"),
              t("subsection2.items.3"),
            ]}
          />
        </DocsSubsection>

        <DocsNote type="info">
          {t("note1.content")}
        </DocsNote>

        <DocsNote type="success">
          {t("note2.content")}
        </DocsNote>

        <DocsCTA href={t("cta.href")}>
          {t("cta.text")}
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
