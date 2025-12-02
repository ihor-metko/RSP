/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/ui/PageHeader";

describe("PageHeader Component", () => {
  describe("Basic rendering", () => {
    it("renders the title", () => {
      render(<PageHeader title="Test Title" />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Test Title");
    });

    it("applies the im-page-header class to the container", () => {
      const { container } = render(<PageHeader title="Test" />);
      const header = container.querySelector("header");
      expect(header).toHaveClass("im-page-header");
    });

    it("applies the im-title class to the title", () => {
      render(<PageHeader title="Test" />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveClass("im-title");
    });
  });

  describe("Description rendering", () => {
    it("renders the description when provided", () => {
      render(<PageHeader title="Test" description="Test description" />);
      expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("applies the im-description class to the description", () => {
      render(<PageHeader title="Test" description="Test description" />);
      const description = screen.getByText("Test description");
      expect(description).toHaveClass("im-description");
    });

    it("does not render description when not provided", () => {
      const { container } = render(<PageHeader title="Test" />);
      const description = container.querySelector(".im-description");
      expect(description).not.toBeInTheDocument();
    });
  });

  describe("Actions rendering", () => {
    it("renders actions when provided", () => {
      render(
        <PageHeader
          title="Test"
          actions={<button>Action Button</button>}
        />
      );
      expect(screen.getByRole("button", { name: "Action Button" })).toBeInTheDocument();
    });

    it("applies the im-actions class to the actions container", () => {
      const { container } = render(
        <PageHeader
          title="Test"
          actions={<button>Action</button>}
        />
      );
      const actionsContainer = container.querySelector(".im-actions");
      expect(actionsContainer).toBeInTheDocument();
    });

    it("renders multiple actions", () => {
      render(
        <PageHeader
          title="Test"
          actions={
            <>
              <button>First Action</button>
              <button>Second Action</button>
            </>
          }
        />
      );
      expect(screen.getByRole("button", { name: "First Action" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Second Action" })).toBeInTheDocument();
    });

    it("does not render actions container when not provided", () => {
      const { container } = render(<PageHeader title="Test" />);
      const actionsContainer = container.querySelector(".im-actions");
      expect(actionsContainer).not.toBeInTheDocument();
    });
  });

  describe("Custom className", () => {
    it("applies custom className to the container", () => {
      const { container } = render(
        <PageHeader title="Test" className="custom-class" />
      );
      const header = container.querySelector("header");
      expect(header).toHaveClass("im-page-header");
      expect(header).toHaveClass("custom-class");
    });

    it("trims className properly", () => {
      const { container } = render(
        <PageHeader title="Test" className="" />
      );
      const header = container.querySelector("header");
      expect(header?.className).not.toContain("  ");
    });
  });

  describe("Full component rendering", () => {
    it("renders title, description, and actions together", () => {
      render(
        <PageHeader
          title="Admin - Clubs"
          description="Manage all padel clubs"
          actions={
            <>
              <button>Export</button>
              <button>Create Club</button>
            </>
          }
        />
      );

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Admin - Clubs");
      expect(screen.getByText("Manage all padel clubs")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create Club" })).toBeInTheDocument();
    });
  });

  describe("CSS classes structure", () => {
    it("has proper semantic structure with im-* classes", () => {
      const { container } = render(
        <PageHeader
          title="Test"
          description="Test description"
          actions={<button>Action</button>}
        />
      );

      expect(container.querySelector(".im-page-header")).toBeInTheDocument();
      expect(container.querySelector(".im-page-header-content")).toBeInTheDocument();
      expect(container.querySelector(".im-title")).toBeInTheDocument();
      expect(container.querySelector(".im-description")).toBeInTheDocument();
      expect(container.querySelector(".im-actions")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("uses semantic header element", () => {
      const { container } = render(<PageHeader title="Test" />);
      const header = container.querySelector("header");
      expect(header).toBeInTheDocument();
    });

    it("uses h1 for the title", () => {
      render(<PageHeader title="Page Title" />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Page Title");
    });
  });
});
