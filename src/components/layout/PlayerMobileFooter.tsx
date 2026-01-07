import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui/IMLink";
import "./PlayerMobileFooter.css";

/**
 * PlayerMobileFooter Component
 *
 * Mobile-optimized footer for player-facing UI
 * Vertical layout with the following sections:
 * - Brand: Logo and platform description
 * - Player Links: Find a club, How it works, FAQ
 * - For Club Owners: Get started, Documentation
 * - Legal: Terms of Service, Privacy Policy
 *
 * STYLING:
 * - Uses im-* semantic classes
 * - Dark theme support via CSS variables
 * - Mobile-first vertical stacking
 * - Not sticky, appears at bottom of page
 * - Darker background than main content
 *
 * ACCESSIBILITY:
 * - Semantic HTML with nav elements
 * - ARIA labels for navigation sections
 * - Proper link text for screen readers
 */
export function PlayerMobileFooter() {
  const t = useTranslations();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="im-player-mobile-footer" role="contentinfo">
      <div className="im-player-mobile-footer-container">
        {/* Brand Section */}
        <div className="im-player-mobile-footer-section">
          <div className="im-player-mobile-footer-brand">
            <span className="im-player-mobile-footer-logo">
              <span className="im-player-mobile-footer-logo-arena">Arena</span>
              <span className="im-player-mobile-footer-logo-one">One</span>
            </span>
          </div>
          <p className="im-player-mobile-footer-description">
            {t("footer.tagline")}
          </p>
        </div>

        {/* Player Links Section */}
        <div className="im-player-mobile-footer-section">
          <h3 className="im-player-mobile-footer-title">
            {t("playerDashboard.navigation.title")}
          </h3>
          <nav className="im-player-mobile-footer-links" aria-label={t("playerDashboard.navigation.title")}>
            <IMLink href="/clubs" className="im-player-mobile-footer-link">
              {t("footer.clubs")}
            </IMLink>
            <IMLink href="/docs/for-clubs/how-it-works" className="im-player-mobile-footer-link">
              {t("footer.howItWorks")}
            </IMLink>
            <IMLink href="/faq" className="im-player-mobile-footer-link">
              {t("footer.faq")}
            </IMLink>
          </nav>
        </div>

        {/* For Club Owners Section */}
        <div className="im-player-mobile-footer-section">
          <h3 className="im-player-mobile-footer-title">
            {t("footer.forClubOwners")}
          </h3>
          <nav className="im-player-mobile-footer-links" aria-label={t("footer.forClubOwners")}>
            <IMLink href="/docs/for-clubs/get-started" className="im-player-mobile-footer-link">
              {t("footer.getStarted")}
            </IMLink>
            <IMLink href="/docs/for-clubs/overview" className="im-player-mobile-footer-link">
              {t("footer.documentation")}
            </IMLink>
          </nav>
        </div>

        {/* Legal Section */}
        <div className="im-player-mobile-footer-section">
          <h3 className="im-player-mobile-footer-title">
            {t("footer.legal")}
          </h3>
          <nav className="im-player-mobile-footer-links" aria-label={t("footer.legal")}>
            <IMLink href="/terms" className="im-player-mobile-footer-link">
              {t("footer.terms")}
            </IMLink>
            <IMLink href="/privacy" className="im-player-mobile-footer-link">
              {t("footer.privacy")}
            </IMLink>
          </nav>
        </div>

        {/* Footer bottom - Copyright */}
        <div className="im-player-mobile-footer-bottom">
          <p className="im-player-mobile-footer-copyright">
            © {currentYear} {t("footer.brandName")}. {t("footer.allRightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
}
