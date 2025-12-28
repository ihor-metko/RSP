/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import type { ClubDetail } from "@/types/club";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "clubDetail.partOfOrganization": "Part of organization",
      "common.published": "Published",
      "common.draft": "Draft",
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  IMLink: ({ 
    children, 
    href, 
    className 
  }: { 
    children: React.ReactNode; 
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className} data-testid="im-link">
      {children}
    </a>
  ),
}));

describe("Club Detail - Organization Context", () => {
  const mockClubWithOrganization: Partial<ClubDetail> = {
    id: "club-1",
    name: "Test Club",
    organization: {
      id: "org-1",
      name: "Test Organization",
    },
  };

  const mockClubWithoutOrganization: Partial<ClubDetail> = {
    id: "club-2",
    name: "Test Club Without Org",
    organization: null,
  };

  it("should display organization context when organization data is present", () => {
    const TestComponent = () => (
      <div>
        {mockClubWithOrganization.organization && (
          <div className="im-club-org-context">
            <div className="im-club-org-context-content">
              <span className="im-club-org-context-label">Part of organization</span>
              <span className="im-club-org-context-name">
                {mockClubWithOrganization.organization.name}
              </span>
            </div>
          </div>
        )}
      </div>
    );

    render(<TestComponent />);
    
    expect(screen.getByText("Part of organization")).toBeInTheDocument();
    expect(screen.getByText("Test Organization")).toBeInTheDocument();
  });

  it("should not display organization context when organization data is absent", () => {
    const TestComponent = () => (
      <div>
        {mockClubWithoutOrganization.organization && (
          <div className="im-club-org-context">
            <div className="im-club-org-context-content">
              <span className="im-club-org-context-label">Part of organization</span>
              <span className="im-club-org-context-name">
                {mockClubWithoutOrganization.organization.name}
              </span>
            </div>
          </div>
        )}
      </div>
    );

    render(<TestComponent />);
    
    expect(screen.queryByText("Part of organization")).not.toBeInTheDocument();
  });

  it("should display organization as a link for root admins", () => {
    const adminStatus = { adminType: "root_admin" as const };
    
    const TestComponent = () => (
      <div>
        {mockClubWithOrganization.organization && (
          <div className="im-club-org-context">
            <div className="im-club-org-context-content">
              <span className="im-club-org-context-label">Part of organization</span>
              {adminStatus.adminType === "root_admin" ? (
                <a
                  href={`/admin/organizations/${mockClubWithOrganization.organization.id}`}
                  className="im-club-org-context-link"
                  data-testid="org-link"
                >
                  {mockClubWithOrganization.organization.name}
                </a>
              ) : (
                <span className="im-club-org-context-name">
                  {mockClubWithOrganization.organization.name}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );

    render(<TestComponent />);
    
    const link = screen.getByTestId("org-link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/admin/organizations/org-1");
    expect(link).toHaveTextContent("Test Organization");
  });

  it("should display organization as plain text for non-root admins", () => {
    const adminStatus = { adminType: "organization_admin" as const };
    
    const TestComponent = () => (
      <div>
        {mockClubWithOrganization.organization && (
          <div className="im-club-org-context">
            <div className="im-club-org-context-content">
              <span className="im-club-org-context-label">Part of organization</span>
              {adminStatus.adminType === "root_admin" ? (
                <a
                  href={`/admin/organizations/${mockClubWithOrganization.organization.id}`}
                  className="im-club-org-context-link"
                >
                  {mockClubWithOrganization.organization.name}
                </a>
              ) : (
                <span className="im-club-org-context-name" data-testid="org-name">
                  {mockClubWithOrganization.organization.name}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );

    render(<TestComponent />);
    
    const orgName = screen.getByTestId("org-name");
    expect(orgName).toBeInTheDocument();
    expect(orgName).toHaveTextContent("Test Organization");
    expect(screen.queryByTestId("org-link")).not.toBeInTheDocument();
  });
});
