/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { IMLink } from "@/components/ui/IMLink";

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => {
    return <a href={href} className={className}>{children}</a>;
  };
});

describe("IMLink Component", () => {
  describe("Basic link rendering", () => {
    it("renders a link with text", () => {
      render(<IMLink href="/test">Test Link</IMLink>);
      const link = screen.getByText("Test Link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/test");
    });

    it("applies the im-link class by default", () => {
      render(<IMLink href="/test">Test Link</IMLink>);
      const link = screen.getByText("Test Link");
      expect(link).toHaveClass("im-link");
    });

    it("applies custom className", () => {
      render(<IMLink href="/test" className="custom-class">Test Link</IMLink>);
      const link = screen.getByText("Test Link");
      expect(link).toHaveClass("im-link");
      expect(link).toHaveClass("custom-class");
    });
  });

  describe("Button-styled link rendering", () => {
    it("applies button classes when asButton is true", () => {
      render(<IMLink href="/test" asButton>Button Link</IMLink>);
      const link = screen.getByText("Button Link");
      expect(link).toHaveClass("im-link--button");
      expect(link).not.toHaveClass("im-link");
    });

    it("applies primary variant by default when asButton is true", () => {
      render(<IMLink href="/test" asButton>Button Link</IMLink>);
      const link = screen.getByText("Button Link");
      expect(link).toHaveClass("im-link--button");
      expect(link).not.toHaveClass("im-link--button-outline");
      expect(link).not.toHaveClass("im-link--button-danger");
    });

    it("applies outline variant when specified", () => {
      render(<IMLink href="/test" asButton variant="outline">Button Link</IMLink>);
      const link = screen.getByText("Button Link");
      expect(link).toHaveClass("im-link--button");
      expect(link).toHaveClass("im-link--button-outline");
    });

    it("applies danger variant when specified", () => {
      render(<IMLink href="/test" asButton variant="danger">Button Link</IMLink>);
      const link = screen.getByText("Button Link");
      expect(link).toHaveClass("im-link--button");
      expect(link).toHaveClass("im-link--button-danger");
    });

    it("applies small size when specified", () => {
      render(<IMLink href="/test" asButton size="small">Button Link</IMLink>);
      const link = screen.getByText("Button Link");
      expect(link).toHaveClass("im-link--button");
      expect(link).toHaveClass("im-link--button-small");
    });

    it("does not apply size class when size is medium", () => {
      render(<IMLink href="/test" asButton size="medium">Button Link</IMLink>);
      const link = screen.getByText("Button Link");
      expect(link).toHaveClass("im-link--button");
      expect(link).not.toHaveClass("im-link--button-small");
    });

    it("combines button classes with custom className", () => {
      render(
        <IMLink href="/test" asButton variant="outline" className="custom-class">
          Button Link
        </IMLink>
      );
      const link = screen.getByText("Button Link");
      expect(link).toHaveClass("im-link--button");
      expect(link).toHaveClass("im-link--button-outline");
      expect(link).toHaveClass("custom-class");
    });
  });

  describe("Variant prop without asButton", () => {
    it("does not apply button variant classes when asButton is false", () => {
      render(<IMLink href="/test" variant="outline">Test Link</IMLink>);
      const link = screen.getByText("Test Link");
      expect(link).toHaveClass("im-link");
      expect(link).not.toHaveClass("im-link--button");
      expect(link).not.toHaveClass("im-link--button-outline");
    });
  });

  describe("Accessibility", () => {
    it("maintains link semantics", () => {
      render(<IMLink href="/test">Test Link</IMLink>);
      const link = screen.getByRole("link", { name: "Test Link" });
      expect(link).toBeInTheDocument();
    });

    it("maintains link semantics when styled as button", () => {
      render(<IMLink href="/test" asButton>Button Link</IMLink>);
      const link = screen.getByRole("link", { name: "Button Link" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/test");
    });
  });

  describe("Real-world usage scenarios", () => {
    it("renders as a regular link in navigation", () => {
      render(<IMLink href="/clubs">View Clubs</IMLink>);
      const link = screen.getByText("View Clubs");
      expect(link).toHaveClass("im-link");
      expect(link).not.toHaveClass("im-link--button");
    });

    it("renders as a button-styled link for primary actions", () => {
      render(<IMLink href="/admin/clubs/new" asButton variant="primary">Create Club</IMLink>);
      const link = screen.getByText("Create Club");
      expect(link).toHaveClass("im-link--button");
      expect(link).toHaveAttribute("href", "/admin/clubs/new");
    });

    it("renders as an outline button-styled link for secondary actions", () => {
      render(<IMLink href="/clubs/export" asButton variant="outline">Export Data</IMLink>);
      const link = screen.getByText("Export Data");
      expect(link).toHaveClass("im-link--button");
      expect(link).toHaveClass("im-link--button-outline");
    });
  });
});
