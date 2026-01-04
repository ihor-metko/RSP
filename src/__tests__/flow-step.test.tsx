/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import FlowStep from "@/app/(pages)/docs/preview/player/components/FlowStep";

describe("FlowStep", () => {
  it("should render step number when provided", () => {
    render(<FlowStep stepNumber={1} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("should render title when provided", () => {
    render(<FlowStep title="Test Step Title" />);
    expect(screen.getByText("Test Step Title")).toBeInTheDocument();
  });

  it("should render description when provided", () => {
    render(<FlowStep description="Test step description" />);
    expect(screen.getByText("Test step description")).toBeInTheDocument();
  });

  it("should render children content", () => {
    render(
      <FlowStep>
        <p>Step content</p>
      </FlowStep>
    );
    expect(screen.getByText("Step content")).toBeInTheDocument();
  });

  it("should render preview content when provided", () => {
    render(
      <FlowStep 
        preview={<div>Preview content</div>}
      />
    );
    expect(screen.getByText("Preview content")).toBeInTheDocument();
  });

  it("should apply active state class", () => {
    const { container } = render(<FlowStep state="active" stepNumber={1} />);
    const step = container.querySelector(".im-flow-step");
    expect(step).toHaveClass("im-flow-step--active");
  });

  it("should apply completed state class", () => {
    const { container } = render(<FlowStep state="completed" stepNumber={1} />);
    const step = container.querySelector(".im-flow-step");
    expect(step).toHaveClass("im-flow-step--completed");
  });

  it("should apply disabled state class", () => {
    const { container } = render(<FlowStep state="disabled" stepNumber={1} />);
    const step = container.querySelector(".im-flow-step");
    expect(step).toHaveClass("im-flow-step--disabled");
  });

  it("should not apply state class for default state", () => {
    const { container } = render(<FlowStep state="default" stepNumber={1} />);
    const step = container.querySelector(".im-flow-step");
    expect(step).not.toHaveClass("im-flow-step--active");
    expect(step).not.toHaveClass("im-flow-step--completed");
    expect(step).not.toHaveClass("im-flow-step--disabled");
  });

  it("should apply custom className", () => {
    const { container } = render(
      <FlowStep className="custom-step-class" />
    );
    const step = container.querySelector(".im-flow-step");
    expect(step).toHaveClass("custom-step-class");
  });

  it("should render all elements together", () => {
    render(
      <FlowStep
        stepNumber={2}
        title="Step Title"
        description="Step Description"
        preview={<div>Preview</div>}
        state="active"
        className="test-class"
      >
        <p>Children</p>
      </FlowStep>
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Step Title")).toBeInTheDocument();
    expect(screen.getByText("Step Description")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Children")).toBeInTheDocument();
  });

  it("should render without errors when no props are provided", () => {
    const { container } = render(<FlowStep />);
    const step = container.querySelector(".im-flow-step");
    expect(step).toBeInTheDocument();
  });
});
