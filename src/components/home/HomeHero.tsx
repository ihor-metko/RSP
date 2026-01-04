import { getTranslations } from "next-intl/server";
import { PublicSearchBar } from "@/components/PublicSearchBar";
import Link from "next/link";

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

      {/* Pre-Sales Documentation Link */}
      <div className="relative z-10 max-w-2xl mx-auto mt-4 px-4 pb-6 text-center">
        <Link
          href="/docs/pre-sales"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 text-white border border-white/20 hover:bg-white/10 hover:border-white/30"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          {t("home.preSalesDocsButton")}
        </Link>
      </div>
    </section>
  );
}
