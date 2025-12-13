/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ClubAdminsSection } from "@/components/admin/club/ClubAdminsSection";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock zustand stores
const mockHasAnyRole = jest.fn();
const mockFetchSimpleUsers = jest.fn();

jest.mock("@/stores/useUserStore", () => ({
  useUserStore: (selector: (state: unknown) => unknown) =>
    selector({
      hasAnyRole: mockHasAnyRole,
    }),
}));

jest.mock("@/stores/useAdminUsersStore", () => ({
  useAdminUsersStore: (selector: (state: unknown) => unknown) =>
    selector({
      simpleUsers: [],
      fetchSimpleUsers: mockFetchSimpleUsers,
    }),
}));

// Mock UserProfileModal
jest.mock("@/components/admin/UserProfileModal", () => ({
  UserProfileModal: ({ isOpen, userId }: { isOpen: boolean; userId: string }) => (
    <div data-testid="user-profile-modal">
      {isOpen && <div>Modal for user: {userId}</div>}
    </div>
  ),
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) => (
    <div data-testid="modal" style={{ display: isOpen ? "block" : "none" }}>
      <h2>{title}</h2>
      {children}
    </div>
  ),
  Input: ({ label, value, onChange }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div>
      <label>{label}</label>
      <input value={value} onChange={onChange} />
    </div>
  ),
}));

describe("ClubAdminsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("should render loading state initially", () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    );

    render(<ClubAdminsSection clubId="club-1" />);

    expect(screen.getByText("common.loading")).toBeInTheDocument();
  });

  it("should fetch and display club admins", async () => {
    const mockAdmins = [
      { id: "user-1", name: "John Doe", email: "john@example.com" },
      { id: "user-2", name: null, email: "jane@example.com" },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAdmins,
    });

    render(<ClubAdminsSection clubId="club-1" />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
    
    const janeEmails = screen.getAllByText("jane@example.com");
    expect(janeEmails.length).toBeGreaterThan(0);
  });

  it("should display error message on fetch failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<ClubAdminsSection clubId="club-1" />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch club admins")).toBeInTheDocument();
    });
  });

  it("should show add admin button when user has permission", async () => {
    mockHasAnyRole.mockReturnValue(true);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<ClubAdminsSection clubId="club-1" />);

    await waitFor(() => {
      const buttons = screen.getAllByText("clubAdmins.addAdmin");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it("should not show add admin button when user lacks permission", async () => {
    mockHasAnyRole.mockReturnValue(false);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<ClubAdminsSection clubId="club-1" />);

    await waitFor(() => {
      expect(screen.queryByText("clubAdmins.addAdmin")).not.toBeInTheDocument();
    });
  });

  it("should show view profile button for each admin", async () => {
    const mockAdmins = [
      { id: "user-1", name: "John Doe", email: "john@example.com" },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAdmins,
    });

    render(<ClubAdminsSection clubId="club-1" />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
    
    expect(screen.getByText("common.viewProfile")).toBeInTheDocument();
  });

  it("should open profile modal when view profile is clicked", async () => {
    const mockAdmins = [
      { id: "user-1", name: "John Doe", email: "john@example.com" },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAdmins,
    });

    render(<ClubAdminsSection clubId="club-1" />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const viewProfileButton = screen.getByText("common.viewProfile");
    fireEvent.click(viewProfileButton);

    await waitFor(() => {
      expect(screen.getByText("Modal for user: user-1")).toBeInTheDocument();
    });
  });

  it("should show remove button when user has permission", async () => {
    mockHasAnyRole.mockReturnValue(true);

    const mockAdmins = [
      { id: "user-1", name: "John Doe", email: "john@example.com" },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAdmins,
    });

    render(<ClubAdminsSection clubId="club-1" />);

    await waitFor(() => {
      const removeButtons = screen.getAllByText("common.remove");
      expect(removeButtons.length).toBeGreaterThan(0);
    });
  });

  it("should not show remove button when user lacks permission", async () => {
    mockHasAnyRole.mockReturnValue(false);

    const mockAdmins = [
      { id: "user-1", name: "John Doe", email: "john@example.com" },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAdmins,
    });

    render(<ClubAdminsSection clubId="club-1" />);

    await waitFor(() => {
      expect(screen.queryByText("common.remove")).not.toBeInTheDocument();
    });
  });

  it("should display empty state when no admins exist", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<ClubAdminsSection clubId="club-1" />);

    await waitFor(() => {
      expect(screen.getByText("clubAdmins.noAdmins")).toBeInTheDocument();
    });
  });

  it("should handle forbidden access gracefully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    render(<ClubAdminsSection clubId="club-1" />);

    await waitFor(() => {
      expect(screen.getByText("common.forbidden")).toBeInTheDocument();
    });
  });
});
