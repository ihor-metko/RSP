import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsNote } from "@/components/ui/DocsNote";
import { DocsCTA } from "@/components/ui/DocsCTA";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.howItWorks");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function HowItWorksPage() {
  const t = await getTranslations("docs.howItWorks");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("structure.title")}>
        <p>{t("structure.intro1")}</p>
        <p>{t("structure.intro2")}</p>
        <DocsList type="numbered">
          <li><strong>{t("structure.level1")}</strong></li>
          <li><strong>{t("structure.level2")}</strong></li>
          <li><strong>{t("structure.level3")}</strong></li>
          <li><strong>{t("structure.level4")}</strong></li>
        </DocsList>
      </DocsSection>

      <DocsSection title={t("organization.title")}>
        <p>{t("organization.intro1")}</p>
        <p>{t("organization.intro2")}</p>
        <p>{t("organization.intro3")}</p>
        <DocsList type="bulleted">
          <li>{t("organization.benefit1")}</li>
          <li>{t("organization.benefit2")}</li>
          <li>{t("organization.benefit3")}</li>
          <li>{t("organization.benefit4")}</li>
        </DocsList>
      </DocsSection>

      <DocsSection title={t("clubs.title")}>
        <p>{t("clubs.intro1")}</p>
        <p>{t("clubs.intro2")}</p>
        <DocsList type="bulleted">
          <li>{t("clubs.control1")}</li>
          <li>{t("clubs.control2")}</li>
          <li>{t("clubs.control3")}</li>
          <li>{t("clubs.control4")}</li>
        </DocsList>
        <p>{t("clubs.outro")}</p>
      </DocsSection>

      <DocsSection title={t("courts.title")}>
        <p>{t("courts.intro")}</p>
        <p>{t("courts.define")}</p>
        <DocsList type="bulleted">
          <li>{t("courts.item1")}</li>
          <li>{t("courts.item2")}</li>
          <li>{t("courts.item3")}</li>
          <li>{t("courts.item4")}</li>
        </DocsList>
      </DocsSection>

      <DocsSection title={t("bookings.title")}>
        <p>{t("bookings.intro")}</p>
        <p>{t("bookings.handles")}</p>
        <DocsList type="bulleted">
          <li>{t("bookings.item1")}</li>
          <li>{t("bookings.item2")}</li>
          <li>{t("bookings.item3")}</li>
          <li>{t("bookings.item4")}</li>
        </DocsList>
      </DocsSection>

      <DocsSection title={t("whyMatters.title")}>
        <p>{t("whyMatters.intro")}</p>
        
        <DocsNote type="info">
          {t("whyMatters.note")}
        </DocsNote>

        <p>{t("whyMatters.benefits")}</p>
        <DocsList type="bulleted">
          <li>
            <strong>{t("whyMatters.benefit1.title")}</strong> {t("whyMatters.benefit1.text")}
          </li>
          <li>
            <strong>{t("whyMatters.benefit2.title")}</strong> {t("whyMatters.benefit2.text")}
          </li>
          <li>
            <strong>{t("whyMatters.benefit3.title")}</strong> {t("whyMatters.benefit3.text")}
          </li>
          <li>
            <strong>{t("whyMatters.benefit4.title")}</strong> {t("whyMatters.benefit4.text")}
          </li>
        </DocsList>
      </DocsSection>

      <DocsSection title={t("together.title")}>
        <p>{t("together.intro")}</p>
        <DocsList type="numbered">
          <li>{t("together.step1")}</li>
          <li>{t("together.step2")}</li>
          <li>{t("together.step3")}</li>
          <li>{t("together.step4")}</li>
        </DocsList>
        <p>{t("together.perspective")}</p>
        <p>{t("together.conclusion")}</p>

        <div className="im-docs-cta-group">
          <DocsCTA href="/docs/for-clubs/getting-started">
            Get Started Now
          </DocsCTA>
          <DocsCTA href="/docs/for-clubs/booking-flow" variant="secondary">
            Explore Booking Flow
          </DocsCTA>
        </div>
      </DocsSection>
    </DocsPage>
  );
}
