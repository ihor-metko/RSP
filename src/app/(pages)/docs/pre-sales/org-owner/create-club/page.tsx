import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsList,
  DocsCallout,
  DocsNote,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.orgOwner.createClub");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CreateClubPage() {
  const t = await getTranslations("docs.preSales.orgOwner.createClub");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Organization Owner Privilege">
          As an Organization Owner, you can create and manage multiple clubs under your organization.
        </DocsCallout>

        <DocsSubsection title="Steps to Create a Club">
          <DocsList
            type="numbered"
            items={[
              "Navigate to your organization dashboard",
              "Click on 'Create New Club'",
              "Fill in basic club information (name, description)",
              "Add club location and contact details",
              "Configure initial settings and working hours",
              "Save and publish your club",
            ]}
          />
        </DocsSubsection>

        <DocsSubsection title="Required Information">
          <p>When creating a club, you&apos;ll need to provide:</p>
          <DocsList
            type="bulleted"
            items={[
              "Club name and description",
              "Physical address and location coordinates",
              "Contact information (phone, email)",
              "Business hours and operating schedule",
              "Club administrator assignments",
            ]}
          />
        </DocsSubsection>

        <DocsNote type="success">
          Once created, your club will be immediately visible to potential customers on the platform.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/org-owner/add-org-admin">
          Next: Add Organization Administrators
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
