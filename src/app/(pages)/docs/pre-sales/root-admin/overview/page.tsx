import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsCallout,
  DocsFeatureList,
  DocsNote,
  DocsCTA,
  DocsScreenshot,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.rootAdmin.overview");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function RootAdminOverviewPage() {
  const t = await getTranslations("docs.preSales.rootAdmin.overview");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Key Responsibility">
          As a Root Admin, you have full control over the ArenaOne platform, including the ability to create and manage organizations, assign administrators, and oversee system-wide settings.
        </DocsCallout>

        <DocsSubsection title="Core Capabilities">
          <DocsFeatureList
            features={[
              "Create and manage multiple organizations",
              "Assign organization owners and administrators",
              "Monitor system-wide statistics and usage",
              "Configure global platform settings",
              "Access all organization and club data",
            ]}
          />
        </DocsSubsection>

        <DocsNote type="info">
          Root Admin access is typically reserved for platform administrators and should be granted with care.
        </DocsNote>

        <DocsScreenshot
          alt="Root Admin Dashboard"
          caption="The Root Admin dashboard provides a comprehensive overview of all organizations and key metrics"
        />

        <DocsCTA href="/docs/pre-sales/root-admin/create-organization">
          Learn How to Create Organizations
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
