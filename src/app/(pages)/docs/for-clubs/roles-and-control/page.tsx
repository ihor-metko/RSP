import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsNote } from "@/components/ui/DocsNote";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.rolesAndControl");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function RolesAndControlPage() {
  const t = await getTranslations("docs.rolesAndControl");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title={t("why.title")}>
        <p>{t("why.intro")}</p>
        <p>{t("why.outro")}</p>
      </DocsSection>

      <DocsSection title={t("orgOwner.title")}>
        <p>{t("orgOwner.intro")}</p>
        <p><strong>{t("orgOwner.manage")}</strong></p>
        <DocsList type="bulleted">
          <li>{t("orgOwner.item1")}</li>
          <li>{t("orgOwner.item2")}</li>
          <li>{t("orgOwner.item3")}</li>
          <li>{t("orgOwner.item4")}</li>
          <li>{t("orgOwner.item5")}</li>
        </DocsList>
        <DocsNote type="info">
          {t("orgOwner.note")}
        </DocsNote>
      </DocsSection>

      <DocsSection title={t("orgAdmin.title")}>
        <p>{t("orgAdmin.intro")}</p>
        <p><strong>{t("orgAdmin.manage")}</strong></p>
        <DocsList type="bulleted">
          <li>{t("orgAdmin.item1")}</li>
          <li>{t("orgAdmin.item2")}</li>
          <li>{t("orgAdmin.item3")}</li>
          <li>{t("orgAdmin.item4")}</li>
        </DocsList>
        <p>{t("orgAdmin.outro")}</p>
        <DocsNote type="info">
          {t("orgAdmin.note")}
        </DocsNote>
      </DocsSection>

      <DocsSection title={t("clubAdmin.title")}>
        <p>{t("clubAdmin.intro")}</p>
        <p><strong>{t("clubAdmin.manage")}</strong></p>
        <DocsList type="bulleted">
          <li>{t("clubAdmin.item1")}</li>
          <li>{t("clubAdmin.item2")}</li>
          <li>{t("clubAdmin.item3")}</li>
          <li>{t("clubAdmin.item4")}</li>
        </DocsList>
        <p><strong>{t("clubAdmin.cannot")}</strong></p>
        <DocsList type="bulleted">
          <li>{t("clubAdmin.cannot1")}</li>
          <li>{t("clubAdmin.cannot2")}</li>
          <li>{t("clubAdmin.cannot3")}</li>
        </DocsList>
        <DocsNote type="info">
          {t("clubAdmin.note")}
        </DocsNote>
      </DocsSection>

      <DocsSection title={t("whyWorks.title")}>
        <p>{t("whyWorks.intro")}</p>
        <DocsList type="bulleted">
          <li><strong>{t("whyWorks.item1.title")}</strong> {t("whyWorks.item1.text")}</li>
          <li><strong>{t("whyWorks.item2.title")}</strong> {t("whyWorks.item2.text")}</li>
          <li><strong>{t("whyWorks.item3.title")}</strong> {t("whyWorks.item3.text")}</li>
          <li><strong>{t("whyWorks.item4.title")}</strong> {t("whyWorks.item4.text")}</li>
        </DocsList>
      </DocsSection>

      <DocsSection title={t("assigning.title")}>
        <p>{t("assigning.intro")}</p>
        <DocsList type="bulleted">
          <li>{t("assigning.item1")}</li>
          <li>{t("assigning.item2")}</li>
          <li>{t("assigning.item3")}</li>
          <li>{t("assigning.item4")}</li>
        </DocsList>
        <DocsNote type="warning">
          {t("assigning.warning")}
        </DocsNote>
      </DocsSection>

      <DocsSection title={t("scenarios.title")}>
        <p><strong>{t("scenarios.single.title")}</strong></p>
        <p>{t("scenarios.single.text")}</p>
        
        <p className="mt-4"><strong>{t("scenarios.multi.title")}</strong></p>
        <p>{t("scenarios.multi.text")}</p>

        <p className="mt-4"><strong>{t("scenarios.growing.title")}</strong></p>
        <p>{t("scenarios.growing.text")}</p>
      </DocsSection>

      <DocsSection title={t("takeaway.title")}>
        <DocsNote type="info">
          {t("takeaway.note")}
        </DocsNote>
      </DocsSection>
    </DocsPage>
  );
}
