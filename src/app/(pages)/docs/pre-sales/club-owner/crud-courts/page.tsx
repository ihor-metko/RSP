import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsList,
  DocsNote,
  DocsCTA,
  DocsScreenshot,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.clubOwner.crudCourts");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CrudCourtsPage() {
  const t = await getTranslations("docs.preSales.clubOwner.crudCourts");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsSubsection title="Adding a New Court">
          <DocsList
            type="numbered"
            items={[
              "Navigate to the Courts management section",
              "Click the 'Add Court' button",
              "Enter court details (name, surface type, indoor/outdoor)",
              "Configure court availability settings",
              "Save the new court configuration",
            ]}
          />
          <DocsScreenshot
            alt="Add Court Form"
            caption="The court creation form allows you to specify all court details"
          />
        </DocsSubsection>

        <DocsSubsection title="Editing Court Details">
          <p>You can modify court information at any time. Changes are immediately reflected in the booking system.</p>
          <DocsNote type="warning">
            Modifying court availability may affect existing bookings. Review active reservations before making significant changes.
          </DocsNote>
        </DocsSubsection>

        <DocsSubsection title="Removing Courts">
          <p>Courts can be deactivated or permanently removed from your club.</p>
          <DocsNote type="info">
            We recommend deactivating courts rather than deleting them to preserve historical booking data.
          </DocsNote>
        </DocsSubsection>

        <DocsCTA href="/docs/pre-sales/club-owner/working-hours">
          Next: Configure Working Hours
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
