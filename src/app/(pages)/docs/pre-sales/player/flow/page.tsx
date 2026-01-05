import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsCallout,
  DocsNote,
  DocsImagePlaceholder,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.player.flow");

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PlayerFlowPage() {
  const t = await getTranslations("docs.preSales.player.flow");

  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("intro.title")}>
        <p>{t("intro.content")}</p>
      </DocsSection>

      {/* Step 1: Discover Clubs */}
      <DocsSection title={t("step1.title")}>
        <p>{t("step1.description")}</p>
        <DocsImagePlaceholder
          role="player"
          step="player__discovery__clubs-list"
          format="webp"
          alt={t("step1.screenshot.alt")}
          caption={t("step1.screenshot.caption")}
        />
      </DocsSection>

      {/* Step 2: Club Details */}
      <DocsSection title={t("step2.title")}>
        <p>{t("step2.description")}</p>
        <DocsImagePlaceholder
          role="player"
          step="player__club-details__overview"
          format="webp"
          alt={t("step2.screenshot.alt")}
          caption={t("step2.screenshot.caption")}
        />
      </DocsSection>

      {/* Step 3: Availability & Calendar Booking */}
      <DocsSection title={t("step3.title")}>
        <p>{t("step3.description")}</p>
        <DocsImagePlaceholder
          role="player"
          step="player__booking__calendar"
          format="webp"
          alt={t("step3.screenshot.alt")}
          caption={t("step3.screenshot.caption")}
        />
      </DocsSection>

      {/* Step 4: Authentication Required (Auth Gate) */}
      <DocsSection title={t("step4.title")}>
        <p>{t("step4.description")}</p>
        <DocsImagePlaceholder
          role="player"
          step="player__auth__login-required-modal"
          format="webp"
          alt={t("step4.screenshot.alt")}
          caption={t("step4.screenshot.caption")}
        />
      </DocsSection>

      {/* Step 5: Login / Register */}
      <DocsSection title={t("step5.title")}>
        <p>{t("step5.description")}</p>
        <DocsImagePlaceholder
          role="player"
          step="player__auth__login"
          format="webp"
          alt={t("step5.screenshot.alt")}
          caption={t("step5.screenshot.caption")}
        />
        <DocsNote type="info">
          {t("step5.note")}
        </DocsNote>
      </DocsSection>

      {/* Step 6: Booking Success */}
      <DocsSection title={t("step6.title")}>
        <p>{t("step6.description")}</p>
        <DocsImagePlaceholder
          role="player"
          step="player__booking__success"
          format="webp"
          alt={t("step6.screenshot.alt")}
          caption={t("step6.screenshot.caption")}
        />
      </DocsSection>

      {/* Quick Booking Section - Highlighted */}
      <DocsSection title={t("quickBooking.title")}>
        <DocsCallout title={t("quickBooking.callout.title")}>
          {t("quickBooking.callout.content")}
        </DocsCallout>

        <DocsSubsection title={t("quickBooking.step1.title")}>
          <p>{t("quickBooking.step1.description")}</p>
          <DocsImagePlaceholder
            role="player"
            step="player__quick-booking__date-time"
            format="webp"
            alt={t("quickBooking.step1.screenshot.alt")}
            caption={t("quickBooking.step1.screenshot.caption")}
          />
        </DocsSubsection>

        <DocsSubsection title={t("quickBooking.step2.title")}>
          <p>{t("quickBooking.step2.description")}</p>
          <DocsImagePlaceholder
            role="player"
            step="player__quick-booking__court-selection"
            format="webp"
            alt={t("quickBooking.step2.screenshot.alt")}
            caption={t("quickBooking.step2.screenshot.caption")}
          />
        </DocsSubsection>

        <DocsSubsection title={t("quickBooking.step3.title")}>
          <p>{t("quickBooking.step3.description")}</p>
          <DocsImagePlaceholder
            role="player"
            step="player__quick-booking__payment"
            format="webp"
            alt={t("quickBooking.step3.screenshot.alt")}
            caption={t("quickBooking.step3.screenshot.caption")}
          />
        </DocsSubsection>

        <DocsSubsection title={t("quickBooking.step4.title")}>
          <p>{t("quickBooking.step4.description")}</p>
          <DocsImagePlaceholder
            role="player"
            step="player__quick-booking__success"
            format="webp"
            alt={t("quickBooking.step4.screenshot.alt")}
            caption={t("quickBooking.step4.screenshot.caption")}
          />
        </DocsSubsection>
      </DocsSection>

      {/* Player Account */}
      <DocsSection title={t("account.title")}>
        <p>{t("account.description")}</p>
        <DocsImagePlaceholder
          role="player"
          step="player__account"
          format="webp"
          alt={t("account.screenshot.alt")}
          caption={t("account.screenshot.caption")}
        />
      </DocsSection>
    </DocsPage>
  );
}
