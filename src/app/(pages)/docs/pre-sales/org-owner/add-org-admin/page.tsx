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
  const t = await getTranslations("docs.preSales.orgOwner.addOrgAdmin");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AddOrgAdminPage() {
  const t = await getTranslations("docs.preSales.orgOwner.addOrgAdmin");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Delegate Management">
          Organization Owners can add administrators to help manage the organization and its clubs efficiently.
        </DocsCallout>

        <DocsSubsection title="Adding an Organization Admin">
          <DocsSteps
            steps={[
              {
                title: "Access Admin Management",
                description: "Navigate to the administrators section in your organization settings",
              },
              {
                title: "Invite New Admin",
                description: "Click 'Add Administrator' and enter their email address",
              },
              {
                title: "Set Permissions",
                description: "Define what access level and permissions the admin will have",
              },
              {
                title: "Assign Responsibilities",
                description: "Optionally specify which clubs or areas they will oversee",
              },
              {
                title: "Send Invitation",
                description: "The admin receives an email invitation to join the organization",
              },
              {
                title: "Confirm Activation",
                description: "Once they accept, the admin account is activated",
              },
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt="Add Administrator Interface"
          caption="The admin invitation form with permission settings"
        />

        <DocsSubsection title="Admin Permission Levels">
          <p>You can grant different levels of access to organization admins based on their role and responsibilities.</p>
          <DocsNote type="info">
            Admin permissions can be modified at any time by the Organization Owner.
          </DocsNote>
        </DocsSubsection>

        <DocsNote type="warning">
          Organization Admins have significant access. Only invite trusted individuals with appropriate background.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/org-owner/access-control">
          Next: Understanding Access Control
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
