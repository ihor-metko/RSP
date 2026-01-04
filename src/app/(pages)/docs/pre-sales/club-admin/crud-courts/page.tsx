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
  const t = await getTranslations("docs.preSales.clubAdmin.crudCourts");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CrudCourtsPage() {
  const t = await getTranslations("docs.preSales.clubAdmin.crudCourts");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Court Management">
          As a Club Admin, you have full control over your club&apos;s courts, including adding, editing, and managing court availability.
        </DocsCallout>

        <DocsSubsection title="Adding a New Court">
          <DocsSteps
            steps={[
              {
                title: "Navigate to Courts Section",
                description: "Access the court management area from your admin dashboard",
              },
              {
                title: "Click Add Court",
                description: "Start the court creation process",
              },
              {
                title: "Enter Court Details",
                description: "Provide court name, surface type (clay, hard, grass), and indoor/outdoor designation",
              },
              {
                title: "Set Pricing",
                description: "Configure hourly rates and any time-based pricing variations",
              },
              {
                title: "Configure Availability",
                description: "Set default availability hours for the court",
              },
              {
                title: "Save and Activate",
                description: "Save the court and make it available for bookings",
              },
            ]}
          />

          <DocsScreenshot
            alt="Add Court Form"
            caption="The court creation form with all configuration options"
          />
        </DocsSubsection>

        <DocsSubsection title="Editing Existing Courts">
          <p>You can modify court details at any time, including:</p>
          <DocsNote type="info">
            Changes to court details are reflected immediately in the booking system.
          </DocsNote>
        </DocsSubsection>

        <DocsSubsection title="Court Status Management">
          <p>Courts can be temporarily disabled for maintenance or permanently removed if no longer in service.</p>
          <DocsNote type="warning">
            Deactivating a court with existing bookings will require you to handle those reservations manually.
          </DocsNote>
        </DocsSubsection>

        <DocsCTA href="/docs/pre-sales/club-admin/working-hours">
          Next: Configure Working Hours
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
