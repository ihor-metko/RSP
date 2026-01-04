import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsList,
  DocsCallout,
  DocsNote,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.orgOwner.createClub");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CreateClubPage() {
  const t = await getTranslations("docs.preSales.orgOwner.createClub");
  
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
              t("subsection1.items.5"),
            ]}
          />
        </DocsSubsection>

        <DocsSubsection title={t("subsection2.title")}>
          <p>{t("subsection2.content")}</p>
          <DocsList
            type="bulleted"
            items={[
              t("subsection2.items.0"),
              t("subsection2.items.1"),
              t("subsection2.items.2"),
              t("subsection2.items.3"),
              t("subsection2.items.4"),
            ]}
          />
        </DocsSubsection>

        <DocsNote type="success">
          {t("note.content")}
        </DocsNote>

        <DocsCTA href={t("cta.href")}>
          {t("cta.text")}
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
