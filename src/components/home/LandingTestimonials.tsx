import { getTranslations } from "next-intl/server";

interface Testimonial {
  id: string;
  name: string;
  text: string;
  rating: number;
  initials: string;
}

/**
 * Star Rating component for testimonials
 */
function StarRating({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        className={i <= rating ? "im-star" : "im-star im-star--empty"}
        aria-hidden="true"
      >
        ★
      </span>
    );
  }
  return (
    <div className="im-testimonial-rating" aria-label={`Rating: ${rating} out of 5 stars`}>
      {stars}
    </div>
  );
}

/**
 * Server Component for the "Testimonials" section
 * Displays user testimonials with ratings
 */
export async function LandingTestimonials() {
  const t = await getTranslations();

  const testimonials: Testimonial[] = [
    {
      id: "testimonial-1",
      name: t("home.testimonials.testimonial1Name"),
      text: t("home.testimonials.testimonial1Text"),
      rating: 5,
      initials: "JS",
    },
    {
      id: "testimonial-2",
      name: t("home.testimonials.testimonial2Name"),
      text: t("home.testimonials.testimonial2Text"),
      rating: 5,
      initials: "EW",
    },
    {
      id: "testimonial-3",
      name: t("home.testimonials.testimonial3Name"),
      text: t("home.testimonials.testimonial3Text"),
      rating: 4,
      initials: "MB",
    },
    {
      id: "testimonial-4",
      name: t("home.testimonials.testimonial4Name"),
      text: t("home.testimonials.testimonial4Text"),
      rating: 5,
      initials: "SJ",
    },
  ];

  return (
    <section
      className="im-testimonials"
      aria-labelledby="testimonials-title"
    >
      <div className="im-testimonials-container">
        <h2 id="testimonials-title" className="im-testimonials-title">
          {t("home.testimonials.title")}
        </h2>

        <div
          className="im-testimonials-grid"
          role="list"
          aria-label={t("home.testimonials.title")}
        >
          {testimonials.map((testimonial) => (
            <article
              key={testimonial.id}
              className="im-testimonial-card"
              role="listitem"
              tabIndex={0}
            >
              <div className="im-testimonial-header">
                <div className="im-testimonial-avatar" aria-hidden="true">
                  {testimonial.initials}
                </div>
                <div className="im-testimonial-info">
                  <p className="im-testimonial-name">{testimonial.name}</p>
                  <StarRating rating={testimonial.rating} />
                </div>
              </div>
              <blockquote className="im-testimonial-text">
                &ldquo;{testimonial.text}&rdquo;
              </blockquote>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
