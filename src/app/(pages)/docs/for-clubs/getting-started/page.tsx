import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsSubsection } from "@/components/ui/DocsSubsection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsCTA } from "@/components/ui/DocsCTA";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.gettingStarted");

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function GettingStartedPage() {
  const t = await getTranslations("docs.gettingStarted");

  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("intro.title")}>
        <p>{t("intro.p1")}</p>
        <p>{t("intro.p2")}</p>
      </DocsSection>

      <DocsSection title={t("onboarding.title")}>
        <p>{t("onboarding.intro")}</p>

        <DocsSubsection title={t("onboarding.step1.title")}>
          <p>{t("onboarding.step1.p1")}</p>
          <DocsList type="bulleted">
            <li>{t("onboarding.step1.item1")}</li>
            <li>{t("onboarding.step1.item2")}</li>
            <li>{t("onboarding.step1.item3")}</li>
          </DocsList>
        </DocsSubsection>

        <DocsSubsection title={t("onboarding.step2.title")}>
          <p>{t("onboarding.step2.p1")}</p>
          <DocsList type="bulleted">
            <li>{t("onboarding.step2.item1")}</li>
            <li>{t("onboarding.step2.item2")}</li>
            <li>{t("onboarding.step2.item3")}</li>
          </DocsList>
        </DocsSubsection>

        <DocsSubsection title={t("onboarding.step3.title")}>
          <p>{t("onboarding.step3.p1")}</p>
          <DocsList type="bulleted">
            <li>{t("onboarding.step3.item1")}</li>
            <li>{t("onboarding.step3.item2")}</li>
            <li>{t("onboarding.step3.item3")}</li>
          </DocsList>
        </DocsSubsection>

        <DocsSubsection title={t("onboarding.step4.title")}>
          <p>{t("onboarding.step4.p1")}</p>
          <DocsList type="bulleted">
            <li>{t("onboarding.step4.item1")}</li>
            <li>{t("onboarding.step4.item2")}</li>
            <li>{t("onboarding.step4.item3")}</li>
          </DocsList>
        </DocsSubsection>

        <DocsSubsection title={t("onboarding.step5.title")}>
          <p>{t("onboarding.step5.p1")}</p>
          <DocsList type="bulleted">
            <li>{t("onboarding.step5.item1")}</li>
            <li>{t("onboarding.step5.item2")}</li>
            <li>{t("onboarding.step5.item3")}</li>
          </DocsList>
        </DocsSubsection>
      </DocsSection>

      <DocsSection title={t("ready.title")}>
        <p>{t("ready.intro")}</p>
        <div className="im-docs-cta-group">
          <DocsCTA href="/auth/sign-up">
            {t("ready.getStarted")}
          </DocsCTA>
          <DocsCTA href="/auth/sign-in" variant="secondary">
            {t("ready.requestAccess")}
          </DocsCTA>
        </div>
      </DocsSection>
    </DocsPage>
  );
}
