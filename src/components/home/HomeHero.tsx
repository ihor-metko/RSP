import { getTranslations } from "next-intl/server";
import { PublicSearchBar } from "@/components/PublicSearchBar";

/**
 * Server Component for the Home page hero section
 * Renders the hero banner with search functionality
 */
export async function HomeHero() {
  const t = await getTranslations();

  return (
    <section className="tm-hero flex-col relative overflow-hidden bg-linear-to-br from-(--rsp-primary) via-[#0a1040] to-(--rsp-primary)">
      <div className="tm-hero-overlay absolute inset-0 bg-[url('/hero-pattern.svg')]" />
      <div className="tm-hero-bg absolute inset-0 bg-[url('/platform/padel-club-banner.webp')] bg-cover bg-center bg-no-repeat" />

      <div className="tm-hero-content relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-4 text-center">
        <h2 className="tm-hero-headline text-3xl md:text-5xl font-bold text-white mb-4">
          {t("home.heroHeadline")}
        </h2>
        <p className="tm-hero-subheadline text-lg md:text-xl text-gray-300 mb-8">
          {t("home.heroSubheadline")}
        </p>
      </div>

      {/* Search bar in hero - client component */}
      <div className="tm-hero-search w-full max-w-2xl mx-auto rounded-lg p-4">
        <PublicSearchBar navigateOnSearch compact />
      </div>
    </section>
  );
}
