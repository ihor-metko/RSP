import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui";
import "./Footer.css";

export function PublicFooter() {
  const t = useTranslations();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="im-public-footer" role="contentinfo">
      <div className="im-public-footer-container">
        <div className="im-public-footer-grid">
          {/* Brand / About Section */}
          <div className="im-public-footer-section">
            <h3 className="im-public-footer-title">
              {t("footer.brandName")}
            </h3>
            <p className="text-sm" style={{ color: "var(--im-footer-text-muted)" }}>
              {t("footer.tagline")}
            </p>
          </div>

          {/* Quick Links */}
          <div className="im-public-footer-section">
            <h3 className="im-public-footer-title">
              {t("footer.quickLinks")}
            </h3>
            <nav className="im-public-footer-links" aria-label={t("footer.quickLinks")}>
              <IMLink href="/" className="im-public-footer-link">
                {t("footer.home")}
              </IMLink>
              <IMLink href="/clubs" className="im-public-footer-link">
                {t("footer.clubs")}
              </IMLink>
              <IMLink href="/docs/for-clubs/how-it-works" className="im-public-footer-link">
                {t("footer.howItWorks")}
              </IMLink>
              <IMLink href="/auth/sign-in" className="im-public-footer-link">
                {t("common.signIn")}
              </IMLink>
              <IMLink href="/auth/sign-up" className="im-public-footer-link">
                {t("common.register")}
              </IMLink>
            </nav>
          </div>

          {/* Support */}
          <div className="im-public-footer-section">
            <h3 className="im-public-footer-title">
              {t("footer.support")}
            </h3>
            <nav className="im-public-footer-links" aria-label={t("footer.support")}>
              <IMLink href="/help" className="im-public-footer-link">
                {t("footer.help")}
              </IMLink>
              <IMLink href="/contact" className="im-public-footer-link">
                {t("footer.contact")}
              </IMLink>
              <IMLink href="/faq" className="im-public-footer-link">
                {t("footer.faq")}
              </IMLink>
            </nav>
          </div>

          {/* Legal */}
          <div className="im-public-footer-section">
            <h3 className="im-public-footer-title">
              {t("footer.legal")}
            </h3>
            <nav className="im-public-footer-links" aria-label={t("footer.legal")}>
              <IMLink href="/privacy" className="im-public-footer-link">
                {t("footer.privacy")}
              </IMLink>
              <IMLink href="/terms" className="im-public-footer-link">
                {t("footer.terms")}
              </IMLink>
            </nav>
          </div>
        </div>

        {/* Bottom section with copyright and social links */}
        <div className="im-public-footer-bottom">
          <p className="im-public-footer-copyright">
            © {currentYear} {t("footer.brandName")}. {t("footer.allRightsReserved")}
          </p>
          <div className="im-public-footer-social" role="list" aria-label={t("footer.socialLinks")}>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="im-public-footer-social-link"
              aria-label="Twitter"
              role="listitem"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="im-public-footer-social-link"
              aria-label="Facebook"
              role="listitem"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="im-public-footer-social-link"
              aria-label="Instagram"
              role="listitem"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
