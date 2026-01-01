/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ClubContactsView } from "@/components/admin/club/ClubContactsView";
import type { ClubDetail } from "@/types/club";

// Mock stores
const mockUpdateClubInStore = jest.fn();

jest.mock("@/stores/useAdminClubStore", () => ({
  useAdminClubStore: (selector: (state: {
    updateClubInStore: typeof mockUpdateClubInStore;
  }) => unknown) => {
    return selector({
      updateClubInStore: mockUpdateClubInStore,
    });
  },
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const translations: Record<string, Record<string, string>> = {
      clubDetail: {
        contactInformation: "Contact Information",
        editContactInformation: "Edit Contact Information",
        phone: "Phone",
        email: "Email",
        website: "Website",
        notSet: "Not set",
        invalidEmailFormat: "Invalid email format",
        failedToUpdateContacts: "Failed to update contacts",
        failedToSaveChanges: "Failed to save changes",
      },
      common: {
        edit: "Edit",
        cancel: "Cancel",
      },
    };
    return (key: string) => translations[namespace]?.[key] || key;
  },
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Input: ({ 
    label, 
    name, 
    value, 
    onChange,
    placeholder,
    disabled,
    type
  }: { 
    label: string; 
    name: string; 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    type?: string;
  }) => (
    <div>
      <label>{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        type={type}
        data-testid={`input-${name}`}
      />
    </div>
  ),
}));

// Mock SectionEditModal
jest.mock("@/components/admin/club/SectionEditModal", () => ({
  SectionEditModal: ({ 
    isOpen, 
    onClose, 
    title, 
    onSave, 
    children,
    isSaving
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    onSave: () => void; 
    children: React.ReactNode;
    isSaving: boolean;
  }) => (
    isOpen ? (
      <div data-testid="modal">
        <h1>{title}</h1>
        {children}
        <button onClick={onSave} disabled={isSaving} data-testid="save-button">
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button onClick={onClose} disabled={isSaving}>Cancel</button>
      </div>
    ) : null
  ),
}));

const mockClub: ClubDetail = {
  id: "club-1",
  organizationId: "org-1",
  name: "Test Club",
  slug: "test-club",
  shortDescription: "A test club",
  longDescription: null,
  location: "123 Test St",
  city: "Test City",
  country: "Test Country",
  latitude: null,
  longitude: null,
  phone: "+1234567890",
  email: "test@club.com",
  website: "https://testclub.com",
  logoUrl: null,
  bannerUrl: null,
  imagesUrl: [],
  status: "PUBLISHED",
  businessHours: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("ClubContactsView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("renders contact information correctly", () => {
    render(<ClubContactsView club={mockClub} />);
    
    expect(screen.getByText("Contact Information")).toBeInTheDocument();
    expect(screen.getByText("+1234567890")).toBeInTheDocument();
    expect(screen.getByText("test@club.com")).toBeInTheDocument();
    expect(screen.getByText("https://testclub.com")).toBeInTheDocument();
  });

  it("shows 'Not set' for empty contact fields", () => {
    const clubWithoutContacts = { 
      ...mockClub, 
      phone: null, 
      email: null, 
      website: null 
    };
    
    render(<ClubContactsView club={clubWithoutContacts} />);
    
    const notSetElements = screen.getAllByText("Not set");
    expect(notSetElements).toHaveLength(3); // phone, email, website
  });

  it("does not display address or location fields", () => {
    render(<ClubContactsView club={mockClub} />);
    
    // Address should not be visible
    expect(screen.queryByText("123 Test St")).not.toBeInTheDocument();
    expect(screen.queryByText("Address")).not.toBeInTheDocument();
    expect(screen.queryByText("City")).not.toBeInTheDocument();
    expect(screen.queryByText("Country")).not.toBeInTheDocument();
  });

  it("opens edit modal when Edit button is clicked", () => {
    render(<ClubContactsView club={mockClub} />);
    
    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);
    
    expect(screen.getByText("Edit Contact Information")).toBeInTheDocument();
    expect(screen.getByTestId("input-phone")).toHaveValue("+1234567890");
    expect(screen.getByTestId("input-email")).toHaveValue("test@club.com");
    expect(screen.getByTestId("input-website")).toHaveValue("https://testclub.com");
  });

  it("does not show address fields in edit modal", () => {
    render(<ClubContactsView club={mockClub} />);
    
    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);
    
    // Address-related fields should not exist
    expect(screen.queryByTestId("input-location")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-city")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-country")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-latitude")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-longitude")).not.toBeInTheDocument();
  });

  it("validates email format", async () => {
    render(<ClubContactsView club={mockClub} />);
    
    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);
    
    const emailInput = screen.getByTestId("input-email");
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    
    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText("Invalid email format")).toBeInTheDocument();
    });
    
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("successfully updates contact information", async () => {
    const updatedClub = {
      ...mockClub,
      phone: "+9876543210",
      email: "updated@club.com",
      website: "https://updatedclub.com",
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedClub,
    });

    render(<ClubContactsView club={mockClub} />);
    
    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);
    
    const phoneInput = screen.getByTestId("input-phone");
    const emailInput = screen.getByTestId("input-email");
    const websiteInput = screen.getByTestId("input-website");
    
    fireEvent.change(phoneInput, { target: { value: "+9876543210" } });
    fireEvent.change(emailInput, { target: { value: "updated@club.com" } });
    fireEvent.change(websiteInput, { target: { value: "https://updatedclub.com" } });
    
    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/clubs/club-1/contacts",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: "+9876543210",
            email: "updated@club.com",
            website: "https://updatedclub.com",
          }),
        })
      );
    });

    await waitFor(() => {
      expect(mockUpdateClubInStore).toHaveBeenCalledWith("club-1", updatedClub);
    });
  });

  it("does not call location endpoint", async () => {
    const updatedClub = { ...mockClub };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedClub,
    });

    render(<ClubContactsView club={mockClub} />);
    
    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);
    
    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Verify location endpoint was NOT called
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/location"),
      expect.anything()
    );
  });

  it("handles API errors gracefully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });

    render(<ClubContactsView club={mockClub} />);
    
    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);
    
    const saveButton = screen.getByTestId("save-button");
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("disables edit button when disabled prop is true", () => {
    render(<ClubContactsView club={mockClub} disabled={true} />);
    
    const editButton = screen.getByText("Edit");
    expect(editButton).toBeDisabled();
  });

  it("closes modal when Cancel is clicked", () => {
    render(<ClubContactsView club={mockClub} />);
    
    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);
    
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);
    
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });
});
