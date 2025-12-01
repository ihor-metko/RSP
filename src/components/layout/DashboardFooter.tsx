import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui";
import "./Footer.css";

export function DashboardFooter() {
  const t = useTranslations();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="im-dashboard-footer" role="contentinfo">
      <div className="im-dashboard-footer-container">
        <p className="im-dashboard-footer-copyright">
          © {currentYear} {t("footer.brandName")}
        </p>
        <nav className="im-dashboard-footer-links" aria-label={t("footer.quickLinks")}>
          <IMLink href="/help" className="im-dashboard-footer-link">
            {t("footer.help")}
          </IMLink>
          <IMLink href="/privacy" className="im-dashboard-footer-link">
            {t("footer.privacy")}
          </IMLink>
          <IMLink href="/terms" className="im-dashboard-footer-link">
            {t("footer.terms")}
          </IMLink>
        </nav>
      </div>
    </footer>
  );
}
