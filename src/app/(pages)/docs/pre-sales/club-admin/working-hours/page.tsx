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
  const t = await getTranslations("docs.preSales.clubAdmin.workingHours");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function WorkingHoursPage() {
  const t = await getTranslations("docs.preSales.clubAdmin.workingHours");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Flexible Scheduling">
          Configure your club&apos;s operating hours to match your business needs, with support for different schedules per day and special dates.
        </DocsCallout>

        <DocsSubsection title="Setting Regular Working Hours">
          <DocsSteps
            steps={[
              {
                title: "Access Working Hours Settings",
                description: "Navigate to the working hours configuration from your club settings",
              },
              {
                title: "Set Daily Schedule",
                description: "Configure opening and closing times for each day of the week",
              },
              {
                title: "Define Time Slots",
                description: "Set booking slot duration (e.g., 60 minutes, 90 minutes)",
              },
              {
                title: "Configure Breaks",
                description: "Add lunch breaks or maintenance windows if needed",
              },
              {
                title: "Save Schedule",
                description: "Apply the schedule to make it active",
              },
            ]}
          />

          <DocsScreenshot
            alt="Working Hours Configuration"
            caption="The working hours interface with weekly schedule editor"
          />
        </DocsSubsection>

        <DocsSubsection title="Special Dates & Exceptions">
          <p>You can set special hours for holidays, events, or maintenance days.</p>
          <DocsNote type="info">
            Special date configurations override regular working hours for specific dates.
          </DocsNote>
        </DocsSubsection>

        <DocsNote type="warning">
          Changing working hours will affect court availability. Existing bookings outside new hours will need to be addressed.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/club-admin/edit-club">
          Next: Edit Club Information
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
