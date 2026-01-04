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
  const t = await getTranslations("docs.preSales.clubAdmin.bookingsOverview");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function BookingsOverviewPage() {
  const t = await getTranslations("docs.preSales.clubAdmin.bookingsOverview");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Real-Time Management">
          The Bookings Overview dashboard gives you a complete view of all reservations, helping you manage your club efficiently.
        </DocsCallout>

        <DocsSubsection title="Dashboard Capabilities">
          <DocsFeatureList
            features={[
              "View all bookings in a unified calendar view",
              "Filter by court, date range, or booking status",
              "See real-time availability across all courts",
              "Track booking revenue and occupancy rates",
              "Manage customer reservations and special requests",
              "Handle cancellations and modifications",
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt="Bookings Dashboard"
          caption="The bookings dashboard displays all reservations with filtering and search options"
        />

        <DocsSubsection title="Booking Management Actions">
          <p>As a Club Admin, you can:</p>
          <DocsFeatureList
            features={[
              "Create manual bookings for walk-in customers",
              "Modify existing reservations",
              "Process refunds and cancellations",
              "Block time slots for maintenance or events",
              "Export booking data for reporting",
            ]}
          />
        </DocsSubsection>

        <DocsNote type="info">
          All booking changes are logged and customers receive automatic notifications about any modifications.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/club-admin/crud-courts">
          Next: Manage Courts
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
