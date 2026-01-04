import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsFeatureList,
  DocsList,
  DocsCallout,
  DocsNote,
  DocsScreenshot,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.orgOwner.accessControl");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AccessControlPage() {
  const t = await getTranslations("docs.preSales.orgOwner.accessControl");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Granular Permissions">
          ArenaOne provides a comprehensive role-based access control system to ensure security and proper authorization across your organization.
        </DocsCallout>

        <DocsSubsection title="Role Hierarchy">
          <DocsList
            type="numbered"
            items={[
              "Organization Owner - Full control over the entire organization",
              "Organization Admin - Manage clubs and settings with owner-defined permissions",
              "Club Owner - Full control over assigned clubs",
              "Club Admin - Manage day-to-day operations of assigned clubs",
              "Player - Book courts and manage personal reservations",
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt="Access Control Dashboard"
          caption="The access control panel showing role assignments and permissions"
        />

        <DocsSubsection title="Configurable Permissions">
          <DocsFeatureList
            features={[
              "Assign roles at organization or club level",
              "Create custom permission sets for specific needs",
              "Temporarily grant elevated access for special tasks",
              "Revoke access instantly when needed",
              "Track permission changes in audit logs",
            ]}
          />
        </DocsSubsection>

        <DocsSubsection title="Best Practices">
          <DocsList
            type="bulleted"
            items={[
              "Follow principle of least privilege - grant minimum necessary access",
              "Regularly review and audit user permissions",
              "Use specific roles rather than blanket admin access",
              "Remove access immediately when personnel changes occur",
              "Monitor audit logs for unusual activity",
            ]}
          />
        </DocsSubsection>

        <DocsNote type="warning">
          Access control changes take effect immediately. Review carefully before applying changes.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/org-owner/create-club">
          Next: Create a New Club
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
