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
  const t = await getTranslations("docs.preSales.clubOwner.bookingsOverview");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function BookingsOverviewPage() {
  const t = await getTranslations("docs.preSales.clubOwner.bookingsOverview");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Business Intelligence">
          As a Club Owner, you get enhanced analytics and reporting capabilities to optimize your business operations.
        </DocsCallout>

        <DocsSubsection title="Advanced Features">
          <DocsFeatureList
            features={[
              "Revenue analytics and trend reports",
              "Court utilization and occupancy metrics",
              "Peak hours and demand analysis",
              "Customer behavior and booking patterns",
              "Comparative performance across time periods",
              "Export detailed reports for accounting",
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt="Club Owner Analytics Dashboard"
          caption="The analytics dashboard with revenue graphs and utilization metrics"
        />

        <DocsSubsection title="Financial Overview">
          <DocsFeatureList
            features={[
              "Daily, weekly, and monthly revenue summaries",
              "Payment method breakdowns",
              "Refund and cancellation tracking",
              "Projected revenue based on confirmed bookings",
              "Commission and fee calculations",
            ]}
          />
        </DocsSubsection>

        <DocsNote type="success">
          Use these insights to optimize pricing, identify peak demand periods, and maximize revenue.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/club-owner/crud-courts">
          Next: Manage Courts
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
