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
  const t = await getTranslations("docs.preSales.orgAdmin.manageOrganization");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ManageOrganizationPage() {
  const t = await getTranslations("docs.preSales.orgAdmin.manageOrganization");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Organization-Wide Control">
          Organization Admins can manage key organizational settings and ensure consistency across all clubs.
        </DocsCallout>

        <DocsSubsection title="Administrative Capabilities">
          <DocsList
            type="bulleted"
            items={[
              "View and update organization profile information",
              "Monitor organization-wide statistics",
              "Access financial reports and summaries",
              "Review audit logs and system activities",
              "Manage organization-level integrations",
              "Configure notification settings",
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt="Organization Management Dashboard"
          caption="The organization management interface with settings and analytics"
        />

        <DocsSubsection title="Reporting & Analytics">
          <DocsList
            type="bulleted"
            items={[
              "Generate organization-wide performance reports",
              "Track key business metrics across all clubs",
              "Export data for external analysis",
              "Set up automated report delivery",
              "Create custom dashboards",
            ]}
          />
        </DocsSubsection>

        <DocsNote type="info">
          Changes to organization settings may require approval from the Organization Owner depending on permission levels.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/org-admin/edit-settings">
          Next: Edit Organization Settings
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
