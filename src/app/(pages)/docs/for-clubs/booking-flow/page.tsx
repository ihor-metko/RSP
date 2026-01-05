import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsNote } from "@/components/ui/DocsNote";
import { DocsCTA } from "@/components/ui/DocsCTA";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.bookingFlow");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function BookingFlowPage() {
  const t = await getTranslations("docs.bookingFlow");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("howWorks.title")}>
        <p>{t("howWorks.intro")}</p>
        <p>{t("howWorks.outro")}</p>
      </DocsSection>

      <DocsSection title={t("player.title")}>
        <p>{t("player.intro")}</p>
        <DocsList type="numbered">
          <li>{t("player.step1")}</li>
          <li>{t("player.step2")}</li>
          <li>{t("player.step3")}</li>
          <li>{t("player.step4")}</li>
          <li>{t("player.step5")}</li>
        </DocsList>
        <DocsNote type="info">
          {t("player.note")}
        </DocsNote>
      </DocsSection>

      <DocsSection title={t("club.title")}>
        <p>{t("club.intro")}</p>
        <DocsList type="bulleted">
          <li>{t("club.control1")}</li>
          <li>{t("club.control2")}</li>
          <li>{t("club.control3")}</li>
          <li>{t("club.control4")}</li>
          <li>{t("club.control5")}</li>
        </DocsList>
        <p>{t("club.outro")}</p>
      </DocsSection>

      <DocsSection title={t("noDouble.title")}>
        <p>{t("noDouble.intro")}</p>
        <DocsList type="bulleted">
          <li>{t("noDouble.item1")}</li>
          <li>{t("noDouble.item2")}</li>
          <li>{t("noDouble.item3")}</li>
        </DocsList>
        <DocsNote type="info">
          {t("noDouble.note")}
        </DocsNote>
      </DocsSection>

      <DocsSection title={t("confirmations.title")}>
        <p>{t("confirmations.intro")}</p>
        <DocsList type="bulleted">
          <li>{t("confirmations.item1")}</li>
          <li>{t("confirmations.item2")}</li>
          <li>{t("confirmations.item3")}</li>
        </DocsList>
      </DocsSection>

      <DocsSection title={t("changes.title")}>
        <p>{t("changes.intro")}</p>
        <DocsList type="bulleted">
          <li>{t("changes.item1")}</li>
          <li>{t("changes.item2")}</li>
          <li>{t("changes.item3")}</li>
        </DocsList>
        <DocsNote type="warning">
          {t("changes.warning")}
        </DocsNote>

        <div className="im-docs-cta-group">
          <DocsCTA href="/docs/for-clubs/getting-started">
            Get Started
          </DocsCTA>
          <DocsCTA href="/docs/for-clubs/roles-and-control" variant="secondary">
            Learn About Roles
          </DocsCTA>
        </div>
      </DocsSection>
    </DocsPage>
  );
}
