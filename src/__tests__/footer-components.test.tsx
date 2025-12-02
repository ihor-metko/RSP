/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "footer.brandName": "Padel Club",
      "footer.tagline": "Find and book padel courts at the best clubs near you.",
      "footer.quickLinks": "Quick Links",
      "footer.home": "Home",
      "footer.clubs": "Clubs",
      "footer.support": "Support",
      "footer.help": "Help Center",
      "footer.contact": "Contact Us",
      "footer.faq": "FAQ",
      "footer.legal": "Legal",
      "footer.privacy": "Privacy Policy",
      "footer.terms": "Terms of Service",
      "footer.allRightsReserved": "All rights reserved.",
      "footer.socialLinks": "Social Links",
      "common.signIn": "Sign In",
      "common.register": "Register",
    };
    return translations[key] || key;
  },
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock IMLink component
jest.mock("@/components/ui", () => ({
  IMLink: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import { PublicFooter } from "@/components/layout/PublicFooter";
import { DashboardFooter } from "@/components/layout/DashboardFooter";

describe("Footer Components", () => {
  describe("PublicFooter", () => {
    it("renders the brand name", () => {
      render(<PublicFooter />);
      expect(screen.getByText("Padel Club")).toBeInTheDocument();
    });

    it("renders the tagline", () => {
      render(<PublicFooter />);
      expect(
        screen.getByText("Find and book padel courts at the best clubs near you.")
      ).toBeInTheDocument();
    });

    it("renders Quick Links section", () => {
      render(<PublicFooter />);
      expect(screen.getByText("Quick Links")).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Clubs")).toBeInTheDocument();
    });

    it("renders Support section", () => {
      render(<PublicFooter />);
      expect(screen.getByText("Support")).toBeInTheDocument();
      expect(screen.getByText("Help Center")).toBeInTheDocument();
      expect(screen.getByText("Contact Us")).toBeInTheDocument();
      expect(screen.getByText("FAQ")).toBeInTheDocument();
    });

    it("renders Legal section", () => {
      render(<PublicFooter />);
      expect(screen.getByText("Legal")).toBeInTheDocument();
      expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
      expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    });

    it("renders copyright text with current year", () => {
      render(<PublicFooter />);
      const currentYear = new Date().getFullYear();
      expect(
        screen.getByText(new RegExp(`© ${currentYear}.*Padel Club.*All rights reserved.`))
      ).toBeInTheDocument();
    });

    it("renders social links", () => {
      render(<PublicFooter />);
      expect(screen.getByLabelText("Twitter")).toBeInTheDocument();
      expect(screen.getByLabelText("Facebook")).toBeInTheDocument();
      expect(screen.getByLabelText("Instagram")).toBeInTheDocument();
    });

    it("has proper accessibility attributes", () => {
      render(<PublicFooter />);
      const footer = screen.getByRole("contentinfo");
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass("im-public-footer");
    });

    it("has proper navigation landmarks", () => {
      render(<PublicFooter />);
      const navElements = screen.getAllByRole("navigation");
      expect(navElements.length).toBeGreaterThanOrEqual(3); // Quick Links, Support, Legal
    });
  });

  describe("DashboardFooter", () => {
    it("renders the brand name", () => {
      render(<DashboardFooter />);
      expect(screen.getByText(/Padel Club/)).toBeInTheDocument();
    });

    it("renders copyright text with current year", () => {
      render(<DashboardFooter />);
      const currentYear = new Date().getFullYear();
      expect(
        screen.getByText(new RegExp(`© ${currentYear}.*Padel Club`))
      ).toBeInTheDocument();
    });

    it("renders quick links", () => {
      render(<DashboardFooter />);
      expect(screen.getByText("Help Center")).toBeInTheDocument();
      expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
      expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    });

    it("has proper accessibility attributes", () => {
      render(<DashboardFooter />);
      const footer = screen.getByRole("contentinfo");
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass("im-dashboard-footer");
    });

    it("has proper navigation landmark", () => {
      render(<DashboardFooter />);
      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();
    });

    it("is more compact than PublicFooter", () => {
      const { container: dashboardContainer } = render(<DashboardFooter />);
      const dashboardFooter = dashboardContainer.querySelector(".im-dashboard-footer");
      expect(dashboardFooter).toBeInTheDocument();

      const { container: publicContainer } = render(<PublicFooter />);
      const publicFooter = publicContainer.querySelector(".im-public-footer");
      expect(publicFooter).toBeInTheDocument();

      // Dashboard footer should have fewer navigation links
      const dashboardLinks =
        dashboardContainer.querySelectorAll("a").length;
      const publicLinks = publicContainer.querySelectorAll("a").length;
      expect(dashboardLinks).toBeLessThan(publicLinks);
    });
  });

  describe("Footer CSS Classes", () => {
    it("PublicFooter uses im-* class prefix", () => {
      const { container } = render(<PublicFooter />);
      const footer = container.querySelector("footer");
      expect(footer).toHaveClass("im-public-footer");

      // Check for other im-* classes
      expect(container.querySelector(".im-public-footer-container")).toBeInTheDocument();
      expect(container.querySelector(".im-public-footer-grid")).toBeInTheDocument();
    });

    it("DashboardFooter uses im-* class prefix", () => {
      const { container } = render(<DashboardFooter />);
      const footer = container.querySelector("footer");
      expect(footer).toHaveClass("im-dashboard-footer");

      // Check for other im-* classes
      expect(container.querySelector(".im-dashboard-footer-container")).toBeInTheDocument();
      expect(container.querySelector(".im-dashboard-footer-links")).toBeInTheDocument();
    });
  });
});
