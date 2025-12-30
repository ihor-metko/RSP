/**
 * Test to verify that the UserSearchDropdown component works correctly
 * with overlay positioning
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserSearchDropdown } from "@/components/ui/UserSearchDropdown";
import type { SimpleUser } from "@/types/adminUser";

const MIN_SEARCH_LENGTH = 2;

// Mock next-intl
const mockTranslations: Record<string, string> = {
  searchUsers: "Search Users",
  searchUsersPlaceholder: "Search by name or email...",
  noUsersFound: "No users found. Try a different search.",
  searching: "Searching...",
};

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => mockTranslations[key] || key,
}));

// Mock UI Input component directly to avoid circular dependency
interface MockInputProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  type?: string;
  id?: string;
  autoComplete?: string;
  "aria-autocomplete"?: string;
  "aria-controls"?: string;
  "aria-expanded"?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

jest.mock("@/components/ui/Input", () => ({
  Input: React.forwardRef<HTMLInputElement, MockInputProps>(function MockInput({ onChange, value, placeholder, disabled, label, ...props }: MockInputProps, ref) {
    return (
      <div>
        {label && <label>{label}</label>}
        <input
          ref={ref}
          type="text"
          onChange={onChange}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          {...props}
        />
      </div>
    );
  }),
}));

describe("UserSearchDropdown", () => {
  const mockUsers: SimpleUser[] = [
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      roles: [],
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
      roles: [
        {
          type: "organization",
          role: "admin",
          contextId: "org1",
          contextName: "Test Org",
        },
      ],
    },
  ];

  const mockOnSelect = jest.fn();
  const mockOnSearchChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the search input with label", () => {
    render(
      <UserSearchDropdown
        onSelect={mockOnSelect}
        users={[]}
        onSearchChange={mockOnSearchChange}
        label="Search Users"
        placeholder="Search by name or email..."
      />
    );

    expect(screen.getByLabelText("Search Users")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search by name or email...")).toBeInTheDocument();
  });

  it("displays dropdown with users when typing", () => {
    render(
      <UserSearchDropdown
        onSelect={mockOnSelect}
        users={mockUsers}
        onSearchChange={mockOnSearchChange}
        label="Search Users"
      />
    );

    const input = screen.getByLabelText("Search Users");
    fireEvent.change(input, { target: { value: "john" } });

    // Check that the dropdown is visible with user results
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("shows disabled user with reason", () => {
    const getUserDisabledInfo = (user: SimpleUser) => {
      if (user.roles && user.roles.length > 0) {
        return { disabled: true, reason: "Already Admin in Test Org" };
      }
      return { disabled: false };
    };

    render(
      <UserSearchDropdown
        onSelect={mockOnSelect}
        users={mockUsers}
        onSearchChange={mockOnSearchChange}
        getUserDisabledInfo={getUserDisabledInfo}
      />
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "jane" } });

    expect(screen.getByText("Already Admin in Test Org")).toBeInTheDocument();
  });

  it("calls onSelect when user is selected", () => {
    render(
      <UserSearchDropdown
        onSelect={mockOnSelect}
        users={mockUsers}
        onSearchChange={mockOnSearchChange}
      />
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "john" } });

    const userOption = screen.getByText("John Doe");
    fireEvent.click(userOption);

    expect(mockOnSelect).toHaveBeenCalledWith("1");
  });

  it("does not call onSelect for disabled users", () => {
    const getUserDisabledInfo = (user: SimpleUser) => {
      if (user.id === "2") {
        return { disabled: true, reason: "Already Admin" };
      }
      return { disabled: false };
    };

    render(
      <UserSearchDropdown
        onSelect={mockOnSelect}
        users={mockUsers}
        onSearchChange={mockOnSearchChange}
        getUserDisabledInfo={getUserDisabledInfo}
      />
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "jane" } });

    const disabledUserOption = screen.getByText("Jane Smith");
    fireEvent.click(disabledUserOption);

    // Should not be called for disabled user
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it("shows searching indicator when isSearching is true", () => {
    render(
      <UserSearchDropdown
        onSelect={mockOnSelect}
        users={[]}
        onSearchChange={mockOnSearchChange}
        isSearching={true}
      />
    );

    expect(screen.getByText("Searching...")).toBeInTheDocument();
  });

  it("shows no users found message when search returns empty", () => {
    render(
      <UserSearchDropdown
        onSelect={mockOnSelect}
        users={[]}
        onSearchChange={mockOnSearchChange}
        isSearching={false}
      />
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "ab".substring(0, MIN_SEARCH_LENGTH) } }); // Minimum chars to trigger search

    expect(screen.getByText("No users found. Try a different search.")).toBeInTheDocument();
  });

  it("calls onSearchChange when input changes", () => {
    render(
      <UserSearchDropdown
        onSelect={mockOnSelect}
        users={[]}
        onSearchChange={mockOnSearchChange}
      />
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "test" } });

    expect(mockOnSearchChange).toHaveBeenCalledWith("test");
  });
});
