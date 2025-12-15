/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "confirmation.title": "Confirm Action",
      "confirmation.confirm": "Confirm",
      "common.cancel": "Cancel",
    };
    return translations[key] || key;
  },
}));

describe("ConfirmationModal", () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not render when isOpen is false", () => {
    render(
      <ConfirmationModal
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        message="Test message"
      />
    );

    expect(screen.queryByText("Test message")).not.toBeInTheDocument();
  });

  it("should render when isOpen is true", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        message="Test message"
      />
    );

    expect(screen.getByText("Test message")).toBeInTheDocument();
    expect(screen.getByText("Confirm Action")).toBeInTheDocument();
  });

  it("should render custom title when provided", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Custom Title"
        message="Test message"
      />
    );

    expect(screen.getByText("Custom Title")).toBeInTheDocument();
  });

  it("should call onClose when cancel button is clicked", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        message="Test message"
      />
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it("should call onConfirm when confirm button is clicked", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        message="Test message"
      />
    );

    const confirmButton = screen.getByText("Confirm");
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should render custom button texts when provided", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        message="Test message"
        confirmText="Delete"
        cancelText="Go Back"
      />
    );

    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Go Back")).toBeInTheDocument();
  });

  it("should disable buttons when isProcessing is true", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        message="Test message"
        isProcessing={true}
      />
    );

    const cancelButton = screen.getByText("Cancel");
    const confirmButton = screen.getByText("Confirm");

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it("should render children content when provided", () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        message="Test message"
      >
        <div>Additional content</div>
      </ConfirmationModal>
    );

    expect(screen.getByText("Additional content")).toBeInTheDocument();
  });

  it("should render with danger variant by default", () => {
    const { container } = render(
      <ConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        message="Test message"
      />
    );

    const confirmButton = screen.getByText("Confirm");
    expect(confirmButton).toBeInTheDocument();
  });

  it("should render with primary variant when specified", () => {
    const { container } = render(
      <ConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        message="Test message"
        variant="primary"
      />
    );

    const confirmButton = screen.getByText("Confirm");
    expect(confirmButton).toBeInTheDocument();
  });
});
