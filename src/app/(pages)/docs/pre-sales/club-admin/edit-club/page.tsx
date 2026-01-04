import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsList,
  DocsCallout,
  DocsNote,
  DocsScreenshot,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.clubAdmin.editClub");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function EditClubPage() {
  const t = await getTranslations("docs.preSales.clubAdmin.editClub");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Keep Information Current">
          Regularly update your club information to ensure customers have accurate details about your facility.
        </DocsCallout>

        <DocsSubsection title="Editable Club Information">
          <DocsList
            type="bulleted"
            items={[
              "Club name and description",
              "Contact information (phone, email, website)",
              "Physical address and location coordinates",
              "Amenities and facilities available",
              "Photos and promotional images",
              "Social media links",
              "Payment and cancellation policies",
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt="Club Edit Form"
          caption="The club editing interface with all fields and options"
        />

        <DocsSubsection title="Managing Club Media">
          <p>Upload and manage photos to showcase your facilities:</p>
          <DocsList
            type="bulleted"
            items={[
              "Add high-quality photos of courts and amenities",
              "Set a primary club image for listings",
              "Organize images in a gallery",
              "Remove outdated or low-quality images",
            ]}
          />
        </DocsSubsection>

        <DocsNote type="info">
          Changes to club information are visible immediately to customers browsing the platform.
        </DocsNote>

        <DocsNote type="success">
          Complete and attractive club profiles receive more bookings from customers.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/club-admin/bookings-overview">
          Back to Bookings Overview
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
