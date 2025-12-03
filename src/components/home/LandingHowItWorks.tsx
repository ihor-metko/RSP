import { getTranslations } from "next-intl/server";

/**
 * Server Component for the "How It Works" section
 * Displays 3 steps explaining how the platform works
 */
export async function LandingHowItWorks() {
  const t = await getTranslations();

  const steps = [
    {
      number: 1,
      icon: "🔍",
      title: t("home.howItWorks.step1Title"),
      description: t("home.howItWorks.step1Desc"),
    },
    {
      number: 2,
      icon: "📅",
      title: t("home.howItWorks.step2Title"),
      description: t("home.howItWorks.step2Desc"),
    },
    {
      number: 3,
      icon: "🎾",
      title: t("home.howItWorks.step3Title"),
      description: t("home.howItWorks.step3Desc"),
    },
  ];

  return (
    <section
      className="im-how-it-works"
      aria-labelledby="how-it-works-title"
    >
      <div className="im-how-it-works-container">
        <h2 id="how-it-works-title" className="im-how-it-works-title">
          {t("home.howItWorks.title")}
        </h2>

        <div className="im-steps-grid" role="list" aria-label={t("home.howItWorks.title")}>
          {steps.map((step) => (
            <article
              key={step.number}
              className="im-step-card"
              role="listitem"
              tabIndex={0}
              aria-label={`${step.title}: ${step.description}`}
            >
              <div className="im-step-icon" aria-hidden="true">
                <span className="im-step-number">{step.number}</span>
              </div>
              <h3 className="im-step-title">{step.title}</h3>
              <p className="im-step-description">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
