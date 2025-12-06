/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminCourtsPage from "@/app/(pages)/admin/courts/page";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => {
      const translations: Record<string, string> = {
        "common.loading": "Loading",
        "common.search": "Search",
        "common.name": "Name",
        "common.price": "Price",
        "common.actions": "Actions",
        "common.edit": "Edit",
        "common.delete": "Delete",
        "common.cancel": "Cancel",
        "common.processing": "Processing",
        "common.clearFilters": "Clear Filters",
        "common.viewDetails": "View Details",
        "common.indoor": "Indoor",
        "common.outdoor": "Outdoor",
        "admin.courts.title": "Courts",
        "admin.courts.subtitle": "Manage courts",
        "admin.courts.noResults": "No courts found",
        "admin.courts.noResultsMatch": "No courts match your search",
        "admin.courts.clubLabel": "Club",
        "admin.courts.type": "Type",
        "admin.courts.surface": "Surface",
        "admin.courts.indoor": "Indoor",
        "admin.courts.outdoor": "Outdoor",
        "admin.courts.pricing": "Pricing",
        "admin.courts.editCourt": "Edit Court",
        "admin.courts.deleteCourt": "Delete Court",
        "admin.courts.deleteConfirm": "Are you sure you want to delete {name}?",
        "admin.courts.addCourt": "To add a new court, go to",
        "admin.courts.allOrganizations": "All Organizations",
        "admin.courts.allClubs": "All Clubs",
        "admin.courts.filterByOrganization": "Filter by Organization",
        "admin.courts.filterByClub": "Filter by Club",
        "sidebar.organizations": "Organizations",
        "sidebar.clubs": "Clubs",
        "booking.book": "Book",
        "booking.viewSchedule": "View Schedule",
        "clubDetail.courtAvailability": "Court Availability",
        "clubDetail.limited": "Limited",
        "court.noAvailabilityData": "No availability data",
        "court.showMoreSlots": "Show more slots",
        "court.moreSlots": "more slots",
      };
      return translations[key] || key;
    };
    return t;
  },
}));

// Mock CourtCard component
jest.mock("@/components/CourtCard", () => ({
  CourtCard: ({ court }: { court: { name: string; type: string | null; surface: string | null; indoor: boolean } }) => (
    <div data-testid={`court-card-${court.name}`}>
      <h3>{court.name}</h3>
      {court.type && <span>{court.type}</span>}
      {court.surface && <span>{court.surface}</span>}
      <span>{court.indoor ? "Indoor" : "Outdoor"}</span>
    </div>
  ),
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  Button: ({ children, onClick, variant, className }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    variant?: string; 
    className?: string;
  }) => (
    <button onClick={onClick} data-variant={variant} className={className}>{children}</button>
  ),
  Input: ({ value, onChange, placeholder }: { 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    placeholder?: string;
  }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} />
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Modal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => (
    isOpen ? <div>{children}</div> : null
  ),
  IMLink: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
  PageHeader: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

// Mock CourtForm
jest.mock("@/components/admin/CourtForm", () => ({
  CourtForm: ({ onSubmit, onCancel }: { onSubmit: () => void; onCancel: () => void }) => (
    <div>
      <button onClick={onSubmit}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

const mockCourts = [
  {
    id: "court-1",
    name: "Court 1",
    slug: "court-1",
    type: "Padel",
    surface: "Artificial",
    indoor: true,
    isActive: true,
    defaultPriceCents: 5000,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    club: {
      id: "club-1",
      name: "Club 1",
    },
    organization: {
      id: "org-1",
      name: "Organization 1",
    },
    bookingCount: 10,
  },
  {
    id: "court-2",
    name: "Court 2",
    slug: "court-2",
    type: "Tennis",
    surface: "Clay",
    indoor: false,
    isActive: true,
    defaultPriceCents: 4000,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    club: {
      id: "club-2",
      name: "Club 2",
    },
    organization: null,
    bookingCount: 5,
  },
];

const mockCourtsResponse = {
  courts: mockCourts,
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
    hasMore: false,
  },
};

describe("AdminCourtsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as ReturnType<typeof useRouter>);
  });

  it("should render CourtCard components for each court", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "" },
      status: "authenticated",
      update: jest.fn(),
    } as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          isAdmin: true, 
          adminType: "root_admin",
          isRoot: true,
          managedIds: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourtsResponse,
      });

    render(<AdminCourtsPage />);

    // Wait for courts to load
    await waitFor(() => {
      expect(screen.getByTestId("court-card-Court 1")).toBeInTheDocument();
    });

    expect(screen.getByTestId("court-card-Court 2")).toBeInTheDocument();
  });

  it("should display organization and club information for each court", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "" },
      status: "authenticated",
      update: jest.fn(),
    } as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          isAdmin: true, 
          adminType: "root_admin",
          isRoot: true,
          managedIds: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourtsResponse,
      });

    render(<AdminCourtsPage />);

    // Wait for courts to load first
    await waitFor(() => {
      expect(screen.getByTestId("court-card-Court 1")).toBeInTheDocument();
    });

    // Check for club information (should always be visible)
    const clubLinks = screen.getAllByText(/Club [12]/);
    expect(clubLinks.length).toBeGreaterThan(0);
    
    // Check for organization information (should be visible for root admin)
    const orgElements = screen.getAllByText(/Organization 1/);
    expect(orgElements.length).toBeGreaterThan(0);
  });

  it("should display view details button for each court", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "" },
      status: "authenticated",
      update: jest.fn(),
    } as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          isAdmin: true, 
          adminType: "root_admin",
          isRoot: true,
          managedIds: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourtsResponse,
      });

    render(<AdminCourtsPage />);

    await waitFor(() => {
      const viewDetailsButtons = screen.getAllByText("View Details");
      expect(viewDetailsButtons.length).toBeGreaterThan(0);
    });
  });

  it("should display courts in a grid layout", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "" },
      status: "authenticated",
      update: jest.fn(),
    } as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          isAdmin: true, 
          adminType: "root_admin",
          isRoot: true,
          managedIds: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourtsResponse,
      });

    const { container } = render(<AdminCourtsPage />);

    await waitFor(() => {
      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass("grid-cols-1", "md:grid-cols-2", "lg:grid-cols-3");
    });
  });

  it("should show empty state when no courts are found", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "" },
      status: "authenticated",
      update: jest.fn(),
    } as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          isAdmin: true, 
          adminType: "root_admin",
          isRoot: true,
          managedIds: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          courts: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
        }),
      });

    render(<AdminCourtsPage />);

    await waitFor(() => {
      expect(screen.getByText("No courts found")).toBeInTheDocument();
    });
  });
});
