import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsCallout,
  DocsList,
  DocsNote,
  DocsScreenshot,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.player.confirmation");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ConfirmationPage() {
  const t = await getTranslations("docs.preSales.player.confirmation");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Instant Confirmation">
          Every booking is confirmed instantly. You&apos;ll receive immediate confirmation with all the details you need.
        </DocsCallout>

        <DocsSubsection title="What's Included in Your Confirmation">
          <DocsList
            type="bulleted"
            items={[
              "Booking reference number for easy tracking",
              "Club name, address, and contact information",
              "Court details and surface type",
              "Date, time, and duration of your reservation",
              "Total cost and payment confirmation",
              "Directions and parking information",
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt="Booking Confirmation"
          caption="Your confirmation screen shows all booking details and options to modify or cancel"
        />

        <DocsSubsection title="Managing Your Booking">
          <p>From the confirmation page, you can:</p>
          <DocsList
            type="bulleted"
            items={[
              "Add the booking to your calendar",
              "Share booking details with friends",
              "Get directions to the club",
              "Modify your booking (subject to availability)",
              "Cancel if your plans change",
            ]}
          />
        </DocsSubsection>

        <DocsNote type="info">
          You&apos;ll receive a reminder notification 24 hours and 1 hour before your booking time.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/player/overview">
          Back to Player Overview
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
