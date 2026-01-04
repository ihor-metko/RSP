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
  const t = await getTranslations("docs.preSales.rootAdmin.viewOrgAdmins");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ViewOrgAdminsPage() {
  const t = await getTranslations("docs.preSales.rootAdmin.viewOrgAdmins");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="System-Wide Oversight">
          Root Admins can view and manage all organization administrators across the entire platform, ensuring proper governance and security.
        </DocsCallout>

        <DocsSubsection title="Admin Management Features">
          <DocsFeatureList
            features={[
              "View all organization owners and admins across the platform",
              "Monitor admin activity and access patterns",
              "Review permission assignments and role changes",
              "Track admin login history and security events",
              "Disable or remove admin access when necessary",
              "Generate compliance and audit reports",
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt="Organization Admins Dashboard"
          caption="The admin overview showing all organization administrators with their roles and status"
        />

        <DocsSubsection title="Security Monitoring">
          <DocsFeatureList
            features={[
              "Real-time alerts for suspicious admin activity",
              "Failed login attempt tracking",
              "Permission escalation monitoring",
              "Multi-factor authentication enforcement",
              "Session management and timeout controls",
            ]}
          />
        </DocsSubsection>

        <DocsNote type="info">
          Root Admin oversight ensures that organization administrators operate within proper boundaries and maintain platform security standards.
        </DocsNote>

        <DocsNote type="warning">
          Use Root Admin privileges responsibly. All actions are logged and audited for security and compliance purposes.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/root-admin/overview">
          Back to Root Admin Overview
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
