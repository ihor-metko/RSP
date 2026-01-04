/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import DocsSimulationCard from "@/app/(pages)/docs/preview/player/components/DocsSimulationCard";

describe("DocsSimulationCard", () => {
  it("should render title when provided", () => {
    render(<DocsSimulationCard title="Test Title" />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("should render description when provided", () => {
    render(<DocsSimulationCard description="Test description" />);
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("should render badge when provided", () => {
    render(<DocsSimulationCard badge="Demo Mode" />);
    expect(screen.getByText("Demo Mode")).toBeInTheDocument();
  });

  it("should render note when provided", () => {
    render(<DocsSimulationCard note="This is a test note" />);
    expect(screen.getByText("This is a test note")).toBeInTheDocument();
  });

  it("should render children content", () => {
    render(
      <DocsSimulationCard>
        <p>Child content</p>
      </DocsSimulationCard>
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("should render preview content when provided", () => {
    render(
      <DocsSimulationCard 
        preview={<div>Preview content</div>}
      />
    );
    expect(screen.getByText("Preview content")).toBeInTheDocument();
  });

  it("should render actions when provided", () => {
    render(
      <DocsSimulationCard 
        actions={<button>Action Button</button>}
      />
    );
    expect(screen.getByText("Action Button")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <DocsSimulationCard className="custom-class" />
    );
    const card = container.querySelector(".im-docs-sim-card");
    expect(card).toHaveClass("custom-class");
  });

  it("should render all elements together", () => {
    render(
      <DocsSimulationCard
        badge="Test Badge"
        title="Test Title"
        description="Test Description"
        note="Test Note"
        preview={<div>Preview</div>}
        actions={<button>Action</button>}
        className="test-class"
      >
        <p>Children</p>
      </DocsSimulationCard>
    );

    expect(screen.getByText("Test Badge")).toBeInTheDocument();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByText("Test Note")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Children")).toBeInTheDocument();
  });

  it("should render without errors when no props are provided", () => {
    const { container } = render(<DocsSimulationCard />);
    const card = container.querySelector(".im-docs-sim-card");
    expect(card).toBeInTheDocument();
  });
});
