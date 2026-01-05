import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  DocsRoleCard,
  DocsRoleGrid,
  DocsFeatureList,
  DocsImagePlaceholder,
} from "@/components/ui/docs";

// Mock the IMLink component
jest.mock("@/components/ui/IMLink", () => ({
  IMLink: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("DocsRoleCard", () => {
  it("renders role card with name and description", () => {
    render(
      <DocsRoleCard
        name="Root Admin"
        description="Manage the entire system"
        href="/docs/root-admin"
      />
    );

    expect(screen.getByText("Root Admin")).toBeInTheDocument();
    expect(screen.getByText("Manage the entire system")).toBeInTheDocument();
  });

  it("renders with icon when provided", () => {
    render(
      <DocsRoleCard
        name="Club Owner"
        description="Manage your club"
        href="/docs/club-owner"
        icon="🎾"
      />
    );

    expect(screen.getByText("🎾")).toBeInTheDocument();
  });

  it("applies correct CSS classes", () => {
    const { container } = render(
      <DocsRoleCard
        name="Test Role"
        description="Test description"
        href="/test"
      />
    );

    const link = container.querySelector("a");
    expect(link).toHaveClass("im-docs-role-card");
  });
});

describe("DocsRoleGrid", () => {
  const mockRoles = [
    {
      name: "Role 1",
      description: "Description 1",
      href: "/role-1",
      icon: "👑",
    },
    {
      name: "Role 2",
      description: "Description 2",
      href: "/role-2",
      icon: "🎾",
    },
  ];

  it("renders multiple role cards", () => {
    render(<DocsRoleGrid roles={mockRoles} />);

    expect(screen.getByText("Role 1")).toBeInTheDocument();
    expect(screen.getByText("Role 2")).toBeInTheDocument();
    expect(screen.getByText("Description 1")).toBeInTheDocument();
    expect(screen.getByText("Description 2")).toBeInTheDocument();
  });

  it("applies grid CSS class", () => {
    const { container } = render(<DocsRoleGrid roles={mockRoles} />);

    const grid = container.querySelector(".im-docs-role-grid");
    expect(grid).toBeInTheDocument();
  });
});

describe("DocsFeatureList", () => {
  const mockFeatures = [
    "Real-time court availability",
    "Automated booking confirmations",
    "Multi-club management",
  ];

  it("renders all features", () => {
    render(<DocsFeatureList features={mockFeatures} />);

    expect(screen.getByText("Real-time court availability")).toBeInTheDocument();
    expect(screen.getByText("Automated booking confirmations")).toBeInTheDocument();
    expect(screen.getByText("Multi-club management")).toBeInTheDocument();
  });

  it("renders with title when provided", () => {
    render(<DocsFeatureList title="Key Features" features={mockFeatures} />);

    expect(screen.getByText("Key Features")).toBeInTheDocument();
  });

  it("renders with default checkmark icon", () => {
    render(<DocsFeatureList features={["Feature 1"]} />);

    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("renders with custom icon", () => {
    render(<DocsFeatureList features={["Feature 1"]} icon="★" />);

    expect(screen.getByText("★")).toBeInTheDocument();
  });

  it("applies correct CSS classes", () => {
    const { container } = render(<DocsFeatureList features={mockFeatures} />);

    const featureList = container.querySelector(".im-docs-feature-list");
    expect(featureList).toBeInTheDocument();
  });
});

describe("DocsImagePlaceholder", () => {
  it("renders image with correct src path", () => {
    render(
      <DocsImagePlaceholder
        role="club-admin"
        step="quick-booking"
        alt="Quick booking screenshot"
      />
    );

    const img = screen.getByAltText("Quick booking screenshot");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/Storage/docs-screenshots/club-admin/quick-booking.png");
  });

  it("renders with caption when provided", () => {
    render(
      <DocsImagePlaceholder
        role="root-admin"
        step="create-organization"
        alt="Organization creation"
        caption="The organization creation form"
      />
    );

    expect(screen.getByText("The organization creation form")).toBeInTheDocument();
  });

  it("applies correct CSS classes", () => {
    const { container } = render(
      <DocsImagePlaceholder
        role="org-owner"
        step="test"
        alt="Test screenshot"
      />
    );

    const figure = container.querySelector(".im-docs-screenshot");
    expect(figure).toBeInTheDocument();
  });

  it("generates correct path for different roles", () => {
    const roles = ["root-admin", "org-owner", "org-admin", "club-owner", "club-admin"] as const;
    
    roles.forEach((role) => {
      const { container } = render(
        <DocsImagePlaceholder
          role={role}
          step="test-step"
          alt="Test"
        />
      );

      const img = container.querySelector("img");
      expect(img).toHaveAttribute("src", `/Storage/docs-screenshots/${role}/test-step.png`);
    });
  });

  it("applies custom className when provided", () => {
    const { container } = render(
      <DocsImagePlaceholder
        role="club-admin"
        step="test"
        alt="Test"
        className="custom-class"
      />
    );

    const figure = container.querySelector(".im-docs-screenshot");
    expect(figure).toHaveClass("custom-class");
  });
});
