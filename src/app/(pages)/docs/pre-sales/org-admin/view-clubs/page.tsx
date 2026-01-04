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
  const t = await getTranslations("docs.preSales.orgAdmin.viewClubs");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ViewClubsPage() {
  const t = await getTranslations("docs.preSales.orgAdmin.viewClubs");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("section1.title")}>
        <p>{t("section1.content")}</p>

        <DocsCallout title="Multi-Club Oversight">
          Organization Admins can view and monitor all clubs within their organization from a single dashboard.
        </DocsCallout>

        <DocsSubsection title="Club Management Features">
          <DocsFeatureList
            features={[
              "View all clubs in your organization",
              "Monitor club performance metrics",
              "Access club-level booking data",
              "Review customer feedback and ratings",
              "Track revenue across all clubs",
              "Identify high-performing and underperforming locations",
            ]}
          />
        </DocsSubsection>

        <DocsScreenshot
          alt="Clubs Overview Dashboard"
          caption="The clubs dashboard showing all locations with key performance indicators"
        />

        <DocsSubsection title="Club Analytics">
          <DocsFeatureList
            features={[
              "Compare performance across multiple clubs",
              "Aggregate booking statistics",
              "Revenue trends and forecasts",
              "Court utilization rates by location",
              "Customer acquisition and retention metrics",
            ]}
          />
        </DocsSubsection>

        <DocsNote type="info">
          Organization Admins have read access to all clubs but cannot modify individual club settings without proper permissions.
        </DocsNote>

        <DocsCTA href="/docs/pre-sales/org-admin/manage-organization">
          Next: Manage Organization Settings
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
