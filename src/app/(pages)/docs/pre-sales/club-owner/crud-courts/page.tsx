import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsList,
  DocsNote,
  DocsCTA,
  DocsScreenshot,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.clubOwner.crudCourts");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CrudCourtsPage() {
  const t = await getTranslations("docs.preSales.clubOwner.crudCourts");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

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
          <DocsScreenshot
            alt={t("screenshot1.alt")}
            caption={t("screenshot1.caption")}
          />
        </DocsSubsection>

        <DocsSubsection title={t("subsection2.title")}>
          <p>{t("subsection2.content")}</p>
          <DocsNote type="warning">
            {t("note1.content")}
          </DocsNote>
        </DocsSubsection>

        <DocsSubsection title={t("subsection3.title")}>
          <p>{t("subsection3.content")}</p>
          <DocsNote type="info">
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
