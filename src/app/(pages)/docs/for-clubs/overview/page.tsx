import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsNote } from "@/components/ui/DocsNote";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.overview");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function OverviewPage() {
  const t = await getTranslations("docs.overview");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("whatIsArenaOne.title")}>
        <p>{t("whatIsArenaOne.p1")}</p>
        <p>{t("whatIsArenaOne.p2")}</p>
      </DocsSection>

      <DocsSection title={t("whoItsFor.title")}>
        <p>{t("whoItsFor.intro")}</p>
        <DocsList type="bulleted">
          <li>{t("whoItsFor.item1")}</li>
          <li>{t("whoItsFor.item2")}</li>
          <li>{t("whoItsFor.item3")}</li>
          <li>{t("whoItsFor.item4")}</li>
          <li>{t("whoItsFor.item5")}</li>
        </DocsList>
        <p>{t("whoItsFor.outro")}</p>
      </DocsSection>

      <DocsSection title={t("whatItIsNot.title")}>
        <DocsNote type="info">
          {t("whatItIsNot.note")}
        </DocsNote>
        <p>{t("whatItIsNot.intro")}</p>
        <DocsList type="bulleted">
          <li>
            <strong>{t("whatItIsNot.notMarketplace.title")}</strong> {t("whatItIsNot.notMarketplace.text")}
          </li>
          <li>
            <strong>{t("whatItIsNot.notReplacing.title")}</strong> {t("whatItIsNot.notReplacing.text")}
          </li>
          <li>
            <strong>{t("whatItIsNot.notAggregator.title")}</strong> {t("whatItIsNot.notAggregator.text")}
          </li>
        </DocsList>
      </DocsSection>

      <DocsSection title={t("coreCapabilities.title")}>
        <p>{t("coreCapabilities.intro")}</p>
        <DocsList type="bulleted">
          <li>{t("coreCapabilities.item1")}</li>
          <li>{t("coreCapabilities.item2")}</li>
          <li>{t("coreCapabilities.item3")}</li>
          <li>{t("coreCapabilities.item4")}</li>
          <li>{t("coreCapabilities.item5")}</li>
          <li>{t("coreCapabilities.item6")}</li>
        </DocsList>
      </DocsSection>
    </DocsPage>
  );
}
