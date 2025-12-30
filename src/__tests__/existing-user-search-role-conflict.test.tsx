/**
 * Test to verify that the ExistingUserSearchStep component properly
 * detects and displays role conflicts when assigning admin roles
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ExistingUserSearchStep } from "@/components/admin/admin-wizard/ExistingUserSearchStep";

// Mock next-intl
const mockTranslations: Record<string, string | ((params: Record<string, string>) => string)> = {
  searchLabel: "Search for User *",
  searchPlaceholder: "Type name or email to search...",
  searching: "Searching...",
  registrationNotice: "To assign an administrator, please select an existing user.",
  alreadyOwnerOf: (params: Record<string, string>) => `Already Owner of ${params.context}`,
  alreadyAdminOf: (params: Record<string, string>) => `Already Admin in ${params.context}`,
  noName: "No name",
};

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const translation = mockTranslations[key];
    if (typeof translation === "function" && params) {
      return translation(params);
    }
    return translation || key;
  },
}));

// Mock SelectedUserCard component
jest.mock("@/components/admin/admin-wizard/SelectedUserCard", () => ({
  SelectedUserCard: ({ name, email }: { name: string; email: string }) => (
    <div>
      <h4>Selected User</h4>
      <div>{name}</div>
      <div>{email}</div>
    </div>
  ),
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  Input: React.forwardRef(function Input(
    props: React.InputHTMLAttributes<HTMLInputElement>,
    ref: React.Ref<HTMLInputElement>
  ) {
    return <input ref={ref} {...props} />;
  }),
}));

// Mock fetch API
global.fetch = jest.fn();

describe("ExistingUserSearchStep - Role Conflict Detection", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should detect and display when user is already owner of the organization", async () => {
    
    
    // Mock API response with user who is already an owner
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [
          {
            id: "user-1",
            name: "John Doe",
            email: "john@example.com",
            roles: [
              {
                type: "organization",
                role: "owner",
                contextId: "org-123",
                contextName: "Test Organization",
              },
            ],
          },
        ],
      }),
    });

    render(
      <ExistingUserSearchStep
        data={{}}
        onChange={mockOnChange}
        errors={{}}
        disabled={false}
        organizationId="org-123"
        role="ORGANIZATION_ADMIN"
      />
    );

    const searchInput = screen.getByPlaceholderText("Type name or email to search...");
    fireEvent.change(searchInput, { target: { value: "john" } });

    await waitFor(() => {
      expect(screen.getByText("Already Owner of Test Organization")).toBeInTheDocument();
    });
  });

  it("should detect and display when user is already admin of the organization", async () => {
    
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [
          {
            id: "user-1",
            name: "Jane Doe",
            email: "jane@example.com",
            roles: [
              {
                type: "organization",
                role: "admin",
                contextId: "org-123",
                contextName: "Test Organization",
              },
            ],
          },
        ],
      }),
    });

    render(
      <ExistingUserSearchStep
        data={{}}
        onChange={mockOnChange}
        errors={{}}
        disabled={false}
        organizationId="org-123"
        role="ORGANIZATION_OWNER"
      />
    );

    const searchInput = screen.getByPlaceholderText("Type name or email to search...");
    fireEvent.change(searchInput, { target: { value: "jane" } });

    await waitFor(() => {
      expect(screen.getByText("Already Admin in Test Organization")).toBeInTheDocument();
    });
  });

  it("should detect and display when user is already owner of the club", async () => {
    
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [
          {
            id: "user-1",
            name: "Bob Smith",
            email: "bob@example.com",
            roles: [
              {
                type: "club",
                role: "owner",
                contextId: "club-456",
                contextName: "Test Club",
              },
            ],
          },
        ],
      }),
    });

    render(
      <ExistingUserSearchStep
        data={{}}
        onChange={mockOnChange}
        errors={{}}
        disabled={false}
        clubId="club-456"
        role="CLUB_ADMIN"
      />
    );

    const searchInput = screen.getByPlaceholderText("Type name or email to search...");
    fireEvent.change(searchInput, { target: { value: "bob" } });

    await waitFor(() => {
      expect(screen.getByText("Already Owner of Test Club")).toBeInTheDocument();
    });
  });

  it("should detect and display when user is already admin of the club", async () => {
    
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [
          {
            id: "user-1",
            name: "Alice Brown",
            email: "alice@example.com",
            roles: [
              {
                type: "club",
                role: "admin",
                contextId: "club-456",
                contextName: "Test Club",
              },
            ],
          },
        ],
      }),
    });

    render(
      <ExistingUserSearchStep
        data={{}}
        onChange={mockOnChange}
        errors={{}}
        disabled={false}
        clubId="club-456"
        role="CLUB_OWNER"
      />
    );

    const searchInput = screen.getByPlaceholderText("Type name or email to search...");
    fireEvent.change(searchInput, { target: { value: "alice" } });

    await waitFor(() => {
      expect(screen.getByText("Already Admin in Test Club")).toBeInTheDocument();
    });
  });

  it("should mark user as disabled with aria-disabled when they have conflicting role", async () => {
    
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [
          {
            id: "user-1",
            name: "John Doe",
            email: "john@example.com",
            roles: [
              {
                type: "organization",
                role: "owner",
                contextId: "org-123",
                contextName: "Test Organization",
              },
            ],
          },
        ],
      }),
    });

    render(
      <ExistingUserSearchStep
        data={{}}
        onChange={mockOnChange}
        errors={{}}
        disabled={false}
        organizationId="org-123"
        role="ORGANIZATION_ADMIN"
      />
    );

    const searchInput = screen.getByPlaceholderText("Type name or email to search...");
    fireEvent.change(searchInput, { target: { value: "john" } });

    await waitFor(() => {
      const disabledItem = screen.getByRole("option");
      expect(disabledItem).toHaveAttribute("aria-disabled", "true");
      expect(disabledItem).toHaveClass("im-autocomplete-item--disabled");
    });
  });

  it("should NOT show role conflict for users in different organizations", async () => {
    
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [
          {
            id: "user-1",
            name: "John Doe",
            email: "john@example.com",
            roles: [
              {
                type: "organization",
                role: "owner",
                contextId: "org-456", // Different org
                contextName: "Other Organization",
              },
            ],
          },
        ],
      }),
    });

    render(
      <ExistingUserSearchStep
        data={{}}
        onChange={mockOnChange}
        errors={{}}
        disabled={false}
        organizationId="org-123" // Trying to assign to this org
        role="ORGANIZATION_ADMIN"
      />
    );

    const searchInput = screen.getByPlaceholderText("Type name or email to search...");
    fireEvent.change(searchInput, { target: { value: "john" } });

    await waitFor(() => {
      const item = screen.getByRole("option");
      expect(item).not.toHaveAttribute("aria-disabled", "true");
      expect(item).not.toHaveClass("im-autocomplete-item--disabled");
    });
  });

  it("should NOT show role conflict for users in different clubs", async () => {
    
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [
          {
            id: "user-1",
            name: "Bob Smith",
            email: "bob@example.com",
            roles: [
              {
                type: "club",
                role: "owner",
                contextId: "club-789", // Different club
                contextName: "Other Club",
              },
            ],
          },
        ],
      }),
    });

    render(
      <ExistingUserSearchStep
        data={{}}
        onChange={mockOnChange}
        errors={{}}
        disabled={false}
        clubId="club-456" // Trying to assign to this club
        role="CLUB_ADMIN"
      />
    );

    const searchInput = screen.getByPlaceholderText("Type name or email to search...");
    fireEvent.change(searchInput, { target: { value: "bob" } });

    await waitFor(() => {
      const item = screen.getByRole("option");
      expect(item).not.toHaveAttribute("aria-disabled", "true");
      expect(item).not.toHaveClass("im-autocomplete-item--disabled");
    });
  });

  it("should prevent selecting users with conflicting roles", async () => {
    
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: [
          {
            id: "user-1",
            name: "John Doe",
            email: "john@example.com",
            roles: [
              {
                type: "organization",
                role: "owner",
                contextId: "org-123",
                contextName: "Test Organization",
              },
            ],
          },
        ],
      }),
    });

    render(
      <ExistingUserSearchStep
        data={{}}
        onChange={mockOnChange}
        errors={{}}
        disabled={false}
        organizationId="org-123"
        role="ORGANIZATION_ADMIN"
      />
    );

    const searchInput = screen.getByPlaceholderText("Type name or email to search...");
    fireEvent.change(searchInput, { target: { value: "john" } });

    await waitFor(() => {
      const disabledItem = screen.getByRole("option");
      expect(disabledItem).toBeInTheDocument();
    });

    // Try to click on the disabled item
    const disabledItem = screen.getByRole("option");
    fireEvent.click(disabledItem);

    // onChange should NOT have been called
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
