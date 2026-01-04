import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.problemsWeSolve");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ProblemsWeSolvePage() {
  const t = await getTranslations("docs.problemsWeSolve");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("manualBookings.title")}>
        <p>{t("manualBookings.intro1")}</p>
        <p>{t("manualBookings.intro2")}</p>
        <DocsList type="bulleted">
          <li>{t("manualBookings.issue1")}</li>
          <li>{t("manualBookings.issue2")}</li>
          <li>{t("manualBookings.issue3")}</li>
          <li>{t("manualBookings.issue4")}</li>
          <li>{t("manualBookings.issue5")}</li>
        </DocsList>
        <p>{t("manualBookings.solution")}</p>
      </DocsSection>

      <DocsSection title={t("fragmented.title")}>
        <p>{t("fragmented.intro1")}</p>
        <p>{t("fragmented.intro2")}</p>
        <DocsList type="bulleted">
          <li>{t("fragmented.issue1")}</li>
          <li>{t("fragmented.issue2")}</li>
          <li>{t("fragmented.issue3")}</li>
          <li>{t("fragmented.issue4")}</li>
          <li>{t("fragmented.issue5")}</li>
        </DocsList>
        <p>{t("fragmented.solution")}</p>
      </DocsSection>

      <DocsSection title={t("visibility.title")}>
        <p>{t("visibility.intro1")}</p>
        <p>{t("visibility.intro2")}</p>
        <DocsList type="bulleted">
          <li>{t("visibility.issue1")}</li>
          <li>{t("visibility.issue2")}</li>
          <li>{t("visibility.issue3")}</li>
          <li>{t("visibility.issue4")}</li>
          <li>{t("visibility.issue5")}</li>
        </DocsList>
        <p>{t("visibility.solution")}</p>
      </DocsSection>

      <DocsSection title={t("multiClub.title")}>
        <p>{t("multiClub.intro1")}</p>
        <p>{t("multiClub.intro2")}</p>
        <DocsList type="bulleted">
          <li>{t("multiClub.issue1")}</li>
          <li>{t("multiClub.issue2")}</li>
          <li>{t("multiClub.issue3")}</li>
          <li>{t("multiClub.issue4")}</li>
          <li>{t("multiClub.issue5")}</li>
          <li>{t("multiClub.issue6")}</li>
        </DocsList>
        <p>{t("multiClub.solution")}</p>
      </DocsSection>
    </DocsPage>
  );
}
