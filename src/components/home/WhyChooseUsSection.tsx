import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";

/**
 * Server Component for the "Why Choose Us" features section
 */
export async function WhyChooseUsSection() {
  const t = await getTranslations();

  return (
    <section className="tm-why-choose-us bg-gray-50 dark:bg-gray-900/50 py-12 px-4 md:px-8">
      <div className="w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">{t("home.whyChooseUs")}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card title={t("home.feature1Title")}>
            <p className="text-gray-600 dark:text-gray-400">{t("home.feature1Desc")}</p>
          </Card>
          <Card title={t("home.feature2Title")}>
            <p className="text-gray-600 dark:text-gray-400">{t("home.feature2Desc")}</p>
          </Card>
          <Card title={t("home.feature3Title")}>
            <p className="text-gray-600 dark:text-gray-400">{t("home.feature3Desc")}</p>
          </Card>
        </div>
      </div>
    </section>
  );
}
