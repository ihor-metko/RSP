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
  const t = await getTranslations("docs.preSales.orgAdmin.editSettings");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function EditSettingsPage() {
  const t = await getTranslations("docs.preSales.orgAdmin.editSettings");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Centralized Configuration">
          Manage organization-wide settings to ensure consistency and compliance across all clubs in your organization.
        </DocsCallout>

        <DocsSubsection title="Configurable Settings">
          <DocsSteps
            steps={[
              {
                title: "Branding & Identity",
                description: "Set organization logo, colors, and branding guidelines for all clubs",
              },
              {
                title: "Payment Configuration",
                description: "Configure payment gateways, commission rates, and billing preferences",
              },
              {
                title: "Communication Settings",
                description: "Set up email templates, notification preferences, and SMS settings",
              },
              {
                title: "Booking Policies",
                description: "Define cancellation policies, refund rules, and booking restrictions",
              },
              {
                title: "Integration Settings",
                description: "Configure third-party integrations and API access",
              },
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt="Settings Configuration Panel"
          caption="The settings panel with various configuration options organized by category"
        />

        <DocsSubsection title="Policy Management">
          <p>Establish and enforce organization-wide policies:</p>
          <DocsNote type="warning">
            Policy changes will affect all clubs in the organization. Review impact before applying changes.
          </DocsNote>
        </DocsSubsection>

        <DocsNote type="info">
          Some advanced settings may require Organization Owner approval to modify.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/org-admin/view-clubs">
          Back to Clubs Overview
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
