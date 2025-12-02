/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

describe("Breadcrumbs Component", () => {
  describe("Basic rendering", () => {
    it("renders breadcrumb items", () => {
      render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Clubs", href: "/clubs" },
            { label: "Club Name" },
          ]}
        />
      );
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Clubs")).toBeInTheDocument();
      expect(screen.getByText("Club Name")).toBeInTheDocument();
    });

    it("renders navigation element with proper aria-label", () => {
      render(
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }]}
          ariaLabel="Custom navigation"
        />
      );
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveAttribute("aria-label", "Custom navigation");
    });

    it("applies the im-breadcrumbs class to the container", () => {
      const { container } = render(
        <Breadcrumbs items={[{ label: "Test" }]} />
      );
      const nav = container.querySelector("nav");
      expect(nav).toHaveClass("im-breadcrumbs");
    });

    it("returns null when items array is empty", () => {
      const { container } = render(<Breadcrumbs items={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Link rendering", () => {
    it("renders clickable links for items with href (except last)", () => {
      render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Clubs", href: "/clubs" },
            { label: "Current Page" },
          ]}
        />
      );
      const homeLink = screen.getByRole("link", { name: "Home" });
      const clubsLink = screen.getByRole("link", { name: "Clubs" });
      expect(homeLink).toHaveAttribute("href", "/");
      expect(clubsLink).toHaveAttribute("href", "/clubs");
    });

    it("renders last item as non-clickable with aria-current", () => {
      render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Current Page" },
          ]}
        />
      );
      const currentItem = screen.getByText("Current Page");
      expect(currentItem).toHaveAttribute("aria-current", "page");
      expect(currentItem.tagName).toBe("SPAN");
    });

    it("applies im-breadcrumb-link class to links", () => {
      render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Current" },
          ]}
        />
      );
      const link = screen.getByRole("link", { name: "Home" });
      expect(link).toHaveClass("im-breadcrumb-link");
    });

    it("applies im-breadcrumb-current class to last item", () => {
      render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Current" },
          ]}
        />
      );
      const current = screen.getByText("Current");
      expect(current).toHaveClass("im-breadcrumb-current");
    });
  });

  describe("Separator rendering", () => {
    it("renders default separator (>) between items", () => {
      render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Current" },
          ]}
        />
      );
      expect(screen.getByText(">")).toBeInTheDocument();
    });

    it("renders custom separator when provided", () => {
      render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Current" },
          ]}
          separator="/"
        />
      );
      expect(screen.getByText("/")).toBeInTheDocument();
    });

    it("does not render separator before first item", () => {
      const { container } = render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Current" },
          ]}
        />
      );
      const separators = container.querySelectorAll(".im-breadcrumb-separator");
      expect(separators).toHaveLength(1);
    });

    it("renders separators with aria-hidden", () => {
      const { container } = render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Current" },
          ]}
        />
      );
      const separator = container.querySelector(".im-breadcrumb-separator");
      expect(separator).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Home icon", () => {
    it("renders home icon when showHomeIcon is true and first item links to /", () => {
      const { container } = render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Current" },
          ]}
          showHomeIcon={true}
        />
      );
      const homeIcon = container.querySelector(".im-breadcrumb-home-icon");
      expect(homeIcon).toBeInTheDocument();
    });

    it("does not render home icon when showHomeIcon is false", () => {
      const { container } = render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Current" },
          ]}
          showHomeIcon={false}
        />
      );
      const homeIcon = container.querySelector(".im-breadcrumb-home-icon");
      expect(homeIcon).not.toBeInTheDocument();
    });

    it("does not render home icon when first item does not link to /", () => {
      const { container } = render(
        <Breadcrumbs
          items={[
            { label: "Clubs", href: "/clubs" },
            { label: "Current" },
          ]}
          showHomeIcon={true}
        />
      );
      const homeIcon = container.querySelector(".im-breadcrumb-home-icon");
      expect(homeIcon).not.toBeInTheDocument();
    });
  });

  describe("Custom className", () => {
    it("applies custom className to the container", () => {
      const { container } = render(
        <Breadcrumbs items={[{ label: "Test" }]} className="custom-class" />
      );
      const nav = container.querySelector("nav");
      expect(nav).toHaveClass("im-breadcrumbs");
      expect(nav).toHaveClass("custom-class");
    });

    it("trims className properly", () => {
      const { container } = render(
        <Breadcrumbs items={[{ label: "Test" }]} className="" />
      );
      const nav = container.querySelector("nav");
      expect(nav?.className).not.toContain("  ");
    });
  });

  describe("Accessibility", () => {
    it("uses semantic nav element", () => {
      render(<Breadcrumbs items={[{ label: "Test" }]} />);
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("uses ordered list for breadcrumb items", () => {
      render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Current" },
          ]}
        />
      );
      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("renders list items for each breadcrumb", () => {
      render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Clubs", href: "/clubs" },
            { label: "Current" },
          ]}
        />
      );
      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(3);
    });

    it("has default aria-label for navigation", () => {
      render(<Breadcrumbs items={[{ label: "Test" }]} />);
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveAttribute("aria-label", "Breadcrumb navigation");
    });
  });

  describe("CSS classes structure", () => {
    it("has proper semantic structure with im-* classes", () => {
      const { container } = render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Current" },
          ]}
        />
      );

      expect(container.querySelector(".im-breadcrumbs")).toBeInTheDocument();
      expect(container.querySelector(".im-breadcrumbs-list")).toBeInTheDocument();
      expect(container.querySelector(".im-breadcrumb-item")).toBeInTheDocument();
      expect(container.querySelector(".im-breadcrumb-link")).toBeInTheDocument();
      expect(container.querySelector(".im-breadcrumb-current")).toBeInTheDocument();
      expect(container.querySelector(".im-breadcrumb-separator")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("handles single item without href", () => {
      render(<Breadcrumbs items={[{ label: "Current Page" }]} />);
      const current = screen.getByText("Current Page");
      expect(current).toHaveAttribute("aria-current", "page");
      expect(current).toHaveClass("im-breadcrumb-current");
    });

    it("handles item with href as last item (renders as current)", () => {
      render(
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }]}
        />
      );
      // Single item should be rendered as current, not as a link
      const current = screen.getByText("Home");
      expect(current).toHaveAttribute("aria-current", "page");
    });

    it("handles multiple separators correctly", () => {
      const { container } = render(
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Clubs", href: "/clubs" },
            { label: "Club", href: "/clubs/123" },
            { label: "Court" },
          ]}
          separator="/"
        />
      );
      const separators = container.querySelectorAll(".im-breadcrumb-separator");
      expect(separators).toHaveLength(3);
    });
  });
});
