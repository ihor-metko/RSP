import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsCallout,
  DocsSteps,
  DocsNote,
  DocsScreenshot,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.player.quickBooking");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function QuickBookingPage() {
  const t = await getTranslations("docs.preSales.player.quickBooking");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title={t("callout.title")}>
          {t("callout.content")}
        </DocsCallout>

        <DocsSteps
          steps={[
            {
              title: t("steps.step1.title"),
              description: t("steps.step1.description"),
            },
            {
              title: t("steps.step2.title"),
              description: t("steps.step2.description"),
            },
            {
              title: t("steps.step3.title"),
              description: t("steps.step3.description"),
            },
            {
              title: t("steps.step4.title"),
              description: t("steps.step4.description"),
            },
            {
              title: t("steps.step5.title"),
              description: t("steps.step5.description"),
            },
          ]}
        />

        <DocsScreenshot
          alt={t("screenshot.alt")}
          caption={t("screenshot.caption")}
        />

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
