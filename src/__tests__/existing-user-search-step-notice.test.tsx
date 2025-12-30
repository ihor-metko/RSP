/**
 * Test to verify that the user registration notice is displayed
 * in the ExistingUserSearchStep component
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { ExistingUserSearchStep } from "@/components/admin/admin-wizard/ExistingUserSearchStep";

// Mock next-intl
const mockTranslations: Record<string, string> = {
  searchLabel: "Search for User *",
  searchPlaceholder: "Type name or email to search...",
  searching: "Searching...",
  registrationNotice: "To assign an administrator, please select an existing user. If the user does not exist, they must register first.",
  selectedUser: "Selected User",
  name: "Name:",
  email: "Email:",
  changeUser: "Change User",
  noName: "No name",
  "errors.enterEmail": "Please enter an email address to search",
  "errors.invalidEmail": "Please enter a valid email address",
  "errors.searchFailed": "Failed to search for user",
  "errors.noResults": "No users found with that email address",
  "errors.searchError": "An error occurred while searching",
};

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => mockTranslations[key] || key,
}));

// Mock SelectedUserCard component
jest.mock("@/components/admin/admin-wizard/SelectedUserCard", () => ({
  SelectedUserCard: ({ name, email, onChangeUser }: {
    name: string;
    email: string;
    onChangeUser: () => void;
  }) => (
    <div>
      <h4>Selected User</h4>
      <div>{name}</div>
      <div>{email}</div>
      <button onClick={onChangeUser}>Change User</button>
    </div>
  ),
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  Button: ({ children, onClick, disabled }: { 
    children: React.ReactNode; 
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Input: React.forwardRef(function Input(props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.Ref<HTMLInputElement>) {
    return <input ref={ref} {...props} />;
  }),
}));

describe("ExistingUserSearchStep - Registration Notice", () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    data: {},
    onChange: mockOnChange,
    errors: {},
    disabled: false,
    organizationId: undefined,
    clubId: undefined,
    role: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display the registration notice when no user is selected", () => {
    render(<ExistingUserSearchStep {...defaultProps} />);

    const notice = screen.getByRole("status");
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(
      "To assign an administrator, please select an existing user. If the user does not exist, they must register first."
    );
  });

  it("should have proper accessibility attributes on the notice", () => {
    render(<ExistingUserSearchStep {...defaultProps} />);

    const notice = screen.getByRole("status");
    expect(notice).toHaveAttribute("aria-live", "polite");
    expect(notice).toHaveClass("im-registration-notice");
  });

  it("should NOT display the notice when a user is already selected", () => {
    const propsWithSelectedUser = {
      ...defaultProps,
      data: {
        userId: "user-123",
        email: "test@example.com",
        name: "Test User",
      },
    };

    render(<ExistingUserSearchStep {...propsWithSelectedUser} />);

    // The notice should not be present
    const notice = screen.queryByRole("status");
    expect(notice).not.toBeInTheDocument();
  });

  it("should display the selected user information when a user is selected", () => {
    const propsWithSelectedUser = {
      ...defaultProps,
      data: {
        userId: "user-123",
        email: "test@example.com",
        name: "Test User",
      },
    };

    render(<ExistingUserSearchStep {...propsWithSelectedUser} />);

    // Should show selected user section
    expect(screen.getByText("Selected User")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("should display the search field and notice together when no user is selected", () => {
    render(<ExistingUserSearchStep {...defaultProps} />);

    // Both notice and search field should be present
    const notice = screen.getByRole("status");
    expect(notice).toBeInTheDocument();
    
    const searchInput = screen.getByPlaceholderText("Type name or email to search...");
    expect(searchInput).toBeInTheDocument();
  });

  it("should have autocomplete attributes for live search", () => {
    render(<ExistingUserSearchStep {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Type name or email to search...");
    // In the DOM, React's autoComplete becomes autocomplete attribute
    expect(searchInput).toHaveAttribute("aria-autocomplete", "list");
    expect(searchInput).toHaveAttribute("aria-expanded", "false");
  });
});
