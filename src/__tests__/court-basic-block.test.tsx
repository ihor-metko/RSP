/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CourtBasicBlock } from "@/components/admin/court/CourtBasicBlock";
import type { CourtDetail } from "@/components/admin/court";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock CSS imports
jest.mock("@/components/admin/court/CourtBasicBlock.css", () => ({}));
jest.mock("@/components/admin/club/SectionEditModal.css", () => ({}));
jest.mock("@/components/ui/Modal.css", () => ({}));
jest.mock("@/components/ui/Button.css", () => ({}));
jest.mock("@/components/ui/Input.css", () => ({}));

const mockCourt: CourtDetail = {
  id: "court-123",
  name: "Test Court",
  slug: "test-court",
  type: "padel",
  surface: "artificial",
  indoor: true,
  defaultPriceCents: 5000,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
  club: {
    id: "club-123",
    name: "Test Club",
    businessHours: [],
  },
  courtPriceRules: [],
};

describe("CourtBasicBlock", () => {
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render court basic information", () => {
    render(<CourtBasicBlock court={mockCourt} onUpdate={mockOnUpdate} />);

    expect(screen.getByText("Basic Information")).toBeInTheDocument();
    expect(screen.getByText("Test Court")).toBeInTheDocument();
    expect(screen.getByText("test-court")).toBeInTheDocument();
    expect(screen.getByText("padel")).toBeInTheDocument();
    expect(screen.getByText("artificial")).toBeInTheDocument();
    expect(screen.getByText("Indoor")).toBeInTheDocument();
    expect(screen.getByText("$50.00/hour")).toBeInTheDocument();
  });

  it("should show Not set for empty optional fields", () => {
    const courtWithoutOptionals: CourtDetail = {
      ...mockCourt,
      slug: null,
      type: null,
      surface: null,
    };

    render(<CourtBasicBlock court={courtWithoutOptionals} onUpdate={mockOnUpdate} />);

    const notSetElements = screen.getAllByText("Not set");
    expect(notSetElements.length).toBe(3); // slug, type, surface
  });

  it("should show Outdoor badge when indoor is false", () => {
    const outdoorCourt: CourtDetail = {
      ...mockCourt,
      indoor: false,
    };

    render(<CourtBasicBlock court={outdoorCourt} onUpdate={mockOnUpdate} />);

    expect(screen.getByText("Outdoor")).toBeInTheDocument();
  });

  it("should open edit modal when Edit button is clicked", () => {
    render(<CourtBasicBlock court={mockCourt} onUpdate={mockOnUpdate} />);

    const editButton = screen.getByRole("button", { name: /edit/i });
    fireEvent.click(editButton);

    expect(screen.getByText("Edit Basic Information")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Court")).toBeInTheDocument();
    expect(screen.getByDisplayValue("test-court")).toBeInTheDocument();
  });

  it("should validate name is required", async () => {
    render(<CourtBasicBlock court={mockCourt} onUpdate={mockOnUpdate} />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Clear name field
    const nameInput = screen.getByDisplayValue("Test Court");
    fireEvent.change(nameInput, { target: { value: "" } });

    // Submit
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it("should validate name minimum length", async () => {
    render(<CourtBasicBlock court={mockCourt} onUpdate={mockOnUpdate} />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Enter short name
    const nameInput = screen.getByDisplayValue("Test Court");
    fireEvent.change(nameInput, { target: { value: "A" } });

    // Submit
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    expect(await screen.findByText("Name must be at least 2 characters")).toBeInTheDocument();
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it("should validate slug pattern", async () => {
    render(<CourtBasicBlock court={mockCourt} onUpdate={mockOnUpdate} />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Enter invalid slug
    const slugInput = screen.getByDisplayValue("test-court");
    fireEvent.change(slugInput, { target: { value: "Invalid Slug!" } });

    // Submit
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    expect(
      await screen.findByText("Slug must contain only lowercase letters, numbers, and hyphens")
    ).toBeInTheDocument();
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it("should call onUpdate with form data on successful save", async () => {
    mockOnUpdate.mockResolvedValue({ ...mockCourt, name: "Updated Court" });

    render(<CourtBasicBlock court={mockCourt} onUpdate={mockOnUpdate} />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Update name
    const nameInput = screen.getByDisplayValue("Test Court");
    fireEvent.change(nameInput, { target: { value: "Updated Court" } });

    // Submit
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Court",
          slug: "test-court",
          type: "padel",
          surface: "artificial",
          indoor: true,
          defaultPriceCents: 5000,
        })
      );
    });
  });

  it("should close modal on cancel", () => {
    render(<CourtBasicBlock court={mockCourt} onUpdate={mockOnUpdate} />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByText("Edit Basic Information")).toBeInTheDocument();

    // Cancel
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByText("Edit Basic Information")).not.toBeInTheDocument();
  });

  it("should handle server errors with field mapping", async () => {
    const serverError = new Error("Validation failed");
    (serverError as Error & { errors: Record<string, string> }).errors = {
      slug: "This slug is already in use",
    };
    mockOnUpdate.mockRejectedValue(serverError);

    render(<CourtBasicBlock court={mockCourt} onUpdate={mockOnUpdate} />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Submit
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("This slug is already in use")).toBeInTheDocument();
    });
  });
});
