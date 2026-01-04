import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsFeatureList,
  DocsCallout,
  DocsNote,
  DocsScreenshot,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.player.calendar");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CalendarPage() {
  const t = await getTranslations("docs.preSales.player.calendar");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Stay Organized">
          Your personal booking calendar keeps all your reservations in one place, making it easy to manage your playing schedule.
        </DocsCallout>

        <DocsSubsection title="Calendar Features">
          <DocsFeatureList
            features={[
              "View all upcoming and past bookings",
              "Filter by club or date range",
              "Receive reminders before your booking time",
              "Quick access to booking details and directions",
              "Easy cancellation and modification options",
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt="Player Calendar View"
          caption="The calendar view displays all your bookings with color-coded status indicators"
        />

        <DocsNote type="info">
          You can sync your ArenaOne calendar with your personal calendar app to get reminders on all your devices.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/player/confirmation">
          Next: Understanding Booking Confirmations
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
