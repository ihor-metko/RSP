import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsSteps,
  DocsCallout,
  DocsNote,
  DocsScreenshot,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.clubOwner.workingHours");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function WorkingHoursPage() {
  const t = await getTranslations("docs.preSales.clubOwner.workingHours");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Advanced Scheduling">
          Club Owners have access to advanced scheduling features including seasonal hours, dynamic pricing, and bulk schedule management.
        </DocsCallout>

        <DocsSubsection title="Seasonal Schedules">
          <DocsSteps
            steps={[
              {
                title: "Create Season Templates",
                description: "Define different schedules for summer, winter, or other periods",
              },
              {
                title: "Set Date Ranges",
                description: "Specify when each seasonal schedule is active",
              },
              {
                title: "Configure Hours",
                description: "Set appropriate operating hours for each season",
              },
              {
                title: "Apply to Courts",
                description: "Choose which courts use which seasonal schedules",
              },
              {
                title: "Review and Activate",
                description: "Confirm and activate seasonal schedules",
              },
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt="Seasonal Schedule Configuration"
          caption="The seasonal schedule editor with calendar view and time slots"
        />

        <DocsSubsection title="Dynamic Pricing by Time">
          <p>Set different pricing rates for peak and off-peak hours to maximize revenue and manage demand.</p>
          <DocsNote type="info">
            Dynamic pricing automatically adjusts based on time of day and day of week.
          </DocsNote>
        </DocsSubsection>

        <DocsNote type="success">
          Strategic use of seasonal schedules and dynamic pricing can increase revenue by up to 30%.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/club-owner/bookings-overview">
          Back to Bookings Overview
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
