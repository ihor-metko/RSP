import { getTranslations } from "next-intl/server";
import { IMLink } from "@/components/ui";

interface FeaturedItem {
  id: string;
  type: "club" | "coach";
  name: string;
  description: string;
  imageIcon: string;
}

/**
 * Server Component for the "Featured Clubs & Coaches" section
 * Displays a grid of featured clubs and coaches
 */
export async function LandingClubsCoaches() {
  const t = await getTranslations();

  const featuredItems: FeaturedItem[] = [
    {
      id: "club-1",
      type: "club",
      name: t("home.clubsCoaches.club1Name"),
      description: t("home.clubsCoaches.club1Desc"),
      imageIcon: "🏟️",
    },
    {
      id: "club-2",
      type: "club",
      name: t("home.clubsCoaches.club2Name"),
      description: t("home.clubsCoaches.club2Desc"),
      imageIcon: "🌅",
    },
    {
      id: "club-3",
      type: "club",
      name: t("home.clubsCoaches.club3Name"),
      description: t("home.clubsCoaches.club3Desc"),
      imageIcon: "🏙️",
    },
    {
      id: "coach-1",
      type: "coach",
      name: t("home.clubsCoaches.coach1Name"),
      description: t("home.clubsCoaches.coach1Desc"),
      imageIcon: "👨‍🏫",
    },
    {
      id: "coach-2",
      type: "coach",
      name: t("home.clubsCoaches.coach2Name"),
      description: t("home.clubsCoaches.coach2Desc"),
      imageIcon: "👩‍🏫",
    },
    {
      id: "coach-3",
      type: "coach",
      name: t("home.clubsCoaches.coach3Name"),
      description: t("home.clubsCoaches.coach3Desc"),
      imageIcon: "🎯",
    },
  ];

  return (
    <section
      className="im-clubs-coaches"
      aria-labelledby="clubs-coaches-title"
    >
      <div className="im-clubs-coaches-container">
        <h2 id="clubs-coaches-title" className="im-clubs-coaches-title">
          {t("home.clubsCoaches.title")}
        </h2>

        <div className="im-clubs-coaches-grid" role="list" aria-label={t("home.clubsCoaches.title")}>
          {featuredItems.map((item) => (
            <article
              key={item.id}
              className="im-featured-card"
              role="listitem"
            >
              <div className="im-featured-image" aria-hidden="true">
                <span>{item.imageIcon}</span>
              </div>
              <div className="im-featured-content">
                <h3 className="im-featured-name">{item.name}</h3>
                <p className="im-featured-description">{item.description}</p>
                <IMLink
                  href={item.type === "club" ? "/clubs" : "/clubs"}
                  className="im-featured-cta"
                  aria-label={
                    item.type === "club"
                      ? `${t("home.clubsCoaches.viewClub")}: ${item.name}`
                      : `${t("home.clubsCoaches.bookCoach")}: ${item.name}`
                  }
                >
                  {item.type === "club"
                    ? t("home.clubsCoaches.viewClub")
                    : t("home.clubsCoaches.bookCoach")}
                </IMLink>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
