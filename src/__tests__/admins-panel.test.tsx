/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import AdminsPanel from "@/components/admin/AdminsPanel";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "adminsPanel.title": "Administrators",
      "adminsPanel.description": "Manage organization and club administrators",
      "adminsPanel.orgAdmins": "Organization Admins",
      "adminsPanel.clubAdmins": "Club Admins",
      "adminsPanel.manageAdmins": "Manage Admins",
    };
    return translations[key] || key;
  },
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("AdminsPanel Component", () => {
  it("should render loading state", () => {
    render(
      <AdminsPanel
        orgAdminsCount={0}
        clubAdminsCount={0}
        loading={true}
      />
    );

    expect(screen.getByText("Administrators")).toBeInTheDocument();
  });

  it("should render admin counts", () => {
    render(
      <AdminsPanel
        orgAdminsCount={5}
        clubAdminsCount={12}
        loading={false}
      />
    );

    expect(screen.getByText("Administrators")).toBeInTheDocument();
    expect(screen.getByText("Manage organization and club administrators")).toBeInTheDocument();
    expect(screen.getByText("Organization Admins")).toBeInTheDocument();
    expect(screen.getByText("Club Admins")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("should render zero counts", () => {
    render(
      <AdminsPanel
        orgAdminsCount={0}
        clubAdminsCount={0}
        loading={false}
      />
    );

    const zeroCounts = screen.getAllByText("0");
    expect(zeroCounts).toHaveLength(2);
  });

  it("should render with organization context", () => {
    render(
      <AdminsPanel
        orgAdminsCount={3}
        clubAdminsCount={8}
        organizationId="org-123"
        loading={false}
      />
    );

    const manageLinks = screen.getAllByText("Manage Admins");
    expect(manageLinks).toHaveLength(2);

    // Check org admins link
    expect(manageLinks[0].closest("a")).toHaveAttribute("href", "/admin/orgs/org-123/admins");
    
    // Check club admins link
    expect(manageLinks[1].closest("a")).toHaveAttribute("href", "/admin/orgs/org-123/club-admins");
  });

  it("should render without organization context", () => {
    render(
      <AdminsPanel
        orgAdminsCount={2}
        clubAdminsCount={6}
        loading={false}
      />
    );

    const manageLinks = screen.getAllByText("Manage Admins");
    expect(manageLinks).toHaveLength(2);

    // Check org admins link (default)
    expect(manageLinks[0].closest("a")).toHaveAttribute("href", "/admin/users");
    
    // Check club admins link (default)
    expect(manageLinks[1].closest("a")).toHaveAttribute("href", "/admin/users?role=club_admin");
  });

  it("should format large numbers with locale", () => {
    render(
      <AdminsPanel
        orgAdminsCount={1234}
        clubAdminsCount={5678}
        loading={false}
      />
    );

    // Numbers should be formatted with toLocaleString()
    // In default locale, this would be "1,234" and "5,678"
    expect(screen.getByText(/1.*234/)).toBeInTheDocument();
    expect(screen.getByText(/5.*678/)).toBeInTheDocument();
  });
});
