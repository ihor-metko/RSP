import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsNote } from "@/components/ui/DocsNote";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.multiClub");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function MultiClubPage() {
  const t = await getTranslations("docs.multiClub");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("why.title")}>
        <p>{t("why.intro")}</p>
        <p>{t("why.outro")}</p>
      </DocsSection>

      <DocsSection title={t("howWorks.title")}>
        <p>{t("howWorks.intro")}</p>
        <DocsList type="bulleted">
          <li>{t("howWorks.item1")}</li>
          <li>{t("howWorks.item2")}</li>
          <li>{t("howWorks.item3")}</li>
          <li>{t("howWorks.item4")}</li>
        </DocsList>
        <DocsNote type="info">
          {t("howWorks.note")}
        </DocsNote>
      </DocsSection>

      <DocsSection title={t("centralized.title")}>
        <p>{t("centralized.intro")}</p>
        <DocsList type="bulleted">
          <li>{t("centralized.item1")}</li>
          <li>{t("centralized.item2")}</li>
          <li>{t("centralized.item3")}</li>
          <li>{t("centralized.item4")}</li>
          <li>{t("centralized.item5")}</li>
        </DocsList>
        <p>{t("centralized.outro")}</p>
      </DocsSection>

      <DocsSection title={t("individual.title")}>
        <p>{t("individual.intro")}</p>
        <DocsList type="bulleted">
          <li>{t("individual.item1")}</li>
          <li>{t("individual.item2")}</li>
          <li>{t("individual.item3")}</li>
          <li>{t("individual.item4")}</li>
        </DocsList>
        <DocsNote type="info">
          {t("individual.note")}
        </DocsNote>
      </DocsSection>

      <DocsSection title={t("whoBenefits.title")}>
        <p>{t("whoBenefits.intro")}</p>
        <DocsList type="bulleted">
          <li><strong>{t("whoBenefits.type1.title")}</strong> {t("whoBenefits.type1.text")}</li>
          <li><strong>{t("whoBenefits.type2.title")}</strong> {t("whoBenefits.type2.text")}</li>
          <li><strong>{t("whoBenefits.type3.title")}</strong> {t("whoBenefits.type3.text")}</li>
        </DocsList>
      </DocsSection>

      <DocsSection title={t("player.title")}>
        <p>{t("player.intro")}</p>
        <DocsList type="bulleted">
          <li>{t("player.item1")}</li>
          <li>{t("player.item2")}</li>
          <li>{t("player.item3")}</li>
        </DocsList>
        <p>{t("player.outro")}</p>
      </DocsSection>

      <DocsSection title={t("gettingStarted.title")}>
        <p>{t("gettingStarted.intro")}</p>
        <DocsList type="numbered">
          <li>{t("gettingStarted.step1")}</li>
          <li>{t("gettingStarted.step2")}</li>
          <li>{t("gettingStarted.step3")}</li>
          <li>{t("gettingStarted.step4")}</li>
          <li>{t("gettingStarted.step5")}</li>
        </DocsList>
        <DocsNote type="info">
          {t("gettingStarted.note")}
        </DocsNote>
      </DocsSection>
    </DocsPage>
  );
}
