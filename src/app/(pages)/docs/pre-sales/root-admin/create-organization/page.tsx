import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSteps,
  DocsNote,
  DocsCallout,
  DocsCTA,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.rootAdmin.createOrganization");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CreateOrganizationPage() {
  const t = await getTranslations("docs.preSales.rootAdmin.createOrganization");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Root Admin Capability">
          Creating organizations is a core Root Admin function. You can set up multiple organizations to manage different business entities.
        </DocsCallout>

        <DocsSteps
          steps={[
            {
              title: "Access Organization Management",
              description: "Navigate to the Organizations section from your Root Admin dashboard",
            },
            {
              title: "Create New Organization",
              description: "Click 'Create Organization' and enter basic information like name and description",
            },
            {
              title: "Assign Organization Owner",
              description: "Select or invite a user to be the Organization Owner who will manage the organization",
            },
            {
              title: "Configure Settings",
              description: "Set up organization-wide preferences, payment settings, and branding",
            },
            {
              title: "Review and Activate",
              description: "Review all information and activate the organization to make it operational",
            },
          ]}
        />

        <DocsNote type="info">
          Organization Owners can create clubs and manage their own administrators once the organization is activated.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/root-admin/view-org-admins">
          Learn About Managing Organization Admins
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
