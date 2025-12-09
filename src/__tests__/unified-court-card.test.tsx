/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { CourtCard } from "@/components/courts/CourtCard";
import type { Court } from "@/types/court";
import type { Club } from "@/types/club";
import type { Organization } from "@/types/organization";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "common.perHour": "per hour",
      "common.indoor": "Indoor",
      "sidebar.organizations": "Organization",
      "admin.courts.clubLabel": "Club",
      "admin.courts.status": "Status",
      "admin.courts.active": "Active",
      "admin.courts.inactive": "Inactive",
      "admin.courts.pricing": "Pricing",
      "common.edit": "Edit",
      "common.delete": "Delete",
    };
    return translations[key] || key;
  },
}));

// Mock useUserStore
const mockHasAnyRole = jest.fn();
jest.mock("@/stores/useUserStore", () => ({
  useUserStore: (selector: (state: { hasAnyRole: () => boolean }) => unknown) => {
    const state = {
      hasAnyRole: mockHasAnyRole,
    };
    return selector(state);
  },
}));

// Mock image utilities
jest.mock("@/utils/image", () => ({
  isValidImageUrl: () => false,
  getSupabaseStorageUrl: (url: string | null | undefined) => url || "",
}));

// Mock price utilities
jest.mock("@/utils/price", () => ({
  formatPrice: (cents: number) => `$${(cents / 100).toFixed(2)}`,
}));

// Mock court-card utilities
jest.mock("@/utils/court-card", () => ({
  formatTime: (time: string) => time,
  getSlotStatusClass: () => "",
  getStatusLabel: () => "",
  calculateAvailabilitySummary: () => ({ available: 0, total: 0, status: "unavailable" }),
}));

const mockCourt: Court = {
  id: "court-1",
  name: "Test Court",
  type: "Padel",
  surface: "Synthetic",
  indoor: true,
  defaultPriceCents: 5000,
  imageUrl: null,
};

const mockClub: Club = {
  id: "club-1",
  name: "Test Club",
  location: "Test Location",
  contactInfo: null,
  openingHours: null,
  logo: null,
  status: "active",
  createdAt: "2024-01-01",
};

const mockOrganization: Organization = {
  id: "org-1",
  name: "Test Organization",
  slug: "test-org",
  createdAt: "2024-01-01",
};

describe("Unified CourtCard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Client View (Non-Admin)", () => {
    beforeEach(() => {
      mockHasAnyRole.mockReturnValue(false);
    });

    it("renders basic court information without admin details", () => {
      render(
        <CourtCard
          court={mockCourt}
          club={mockClub}
          organization={mockOrganization}
          showBookButton={true}
          showViewSchedule={true}
          showDetailedAvailability={false}
        />
      );

      // Court info should be visible
      expect(screen.getByText("Test Court")).toBeInTheDocument();
      expect(screen.getByText(/\$50\.00/)).toBeInTheDocument();
      expect(screen.getByText("Indoor")).toBeInTheDocument();

      // Admin info should NOT be visible
      expect(screen.queryByText("Organization:")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Organization")).not.toBeInTheDocument();
      expect(screen.queryByText("Club:")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Club")).not.toBeInTheDocument();
      expect(screen.queryByText("Status:")).not.toBeInTheDocument();
      
      // Admin actions should NOT be visible
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
      expect(screen.queryByText("Pricing")).not.toBeInTheDocument();
    });
  });

  describe("Admin View", () => {
    beforeEach(() => {
      mockHasAnyRole.mockReturnValue(true);
    });

    it("renders admin information when user has admin role and club/org are provided", () => {
      render(
        <CourtCard
          court={mockCourt}
          club={mockClub}
          organization={mockOrganization}
          isActive={true}
          showBookButton={false}
          showViewSchedule={false}
          showDetailedAvailability={false}
        />
      );

      // Court info should be visible
      expect(screen.getByText("Test Court")).toBeInTheDocument();

      // Admin info should be visible
      expect(screen.getByText("Organization:")).toBeInTheDocument();
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
      expect(screen.getByText("Club:")).toBeInTheDocument();
      expect(screen.getByText("Test Club")).toBeInTheDocument();
      expect(screen.getByText("Status:")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders inactive status correctly", () => {
      render(
        <CourtCard
          court={mockCourt}
          club={mockClub}
          organization={mockOrganization}
          isActive={false}
          showBookButton={false}
          showViewSchedule={false}
          showDetailedAvailability={false}
        />
      );

      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("renders admin actions when callbacks are provided", () => {
      const mockEdit = jest.fn();
      const mockDelete = jest.fn();

      render(
        <CourtCard
          court={mockCourt}
          club={mockClub}
          organization={mockOrganization}
          onEdit={mockEdit}
          onDelete={mockDelete}
          showBookButton={false}
          showViewSchedule={false}
          showDetailedAvailability={false}
        />
      );

      // Admin action buttons should be visible
      expect(screen.getByText("Pricing")).toBeInTheDocument();
      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("does not render organization info when not provided", () => {
      render(
        <CourtCard
          court={mockCourt}
          club={mockClub}
          isActive={true}
          showBookButton={false}
          showViewSchedule={false}
          showDetailedAvailability={false}
        />
      );

      // Club info should be visible
      expect(screen.getByText("Club:")).toBeInTheDocument();
      expect(screen.getByText("Test Club")).toBeInTheDocument();

      // Organization info should NOT be visible
      expect(screen.queryByText("Organization:")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Organization")).not.toBeInTheDocument();
    });

    it("does not render admin info when neither club nor organization are provided", () => {
      render(
        <CourtCard
          court={mockCourt}
          isActive={true}
          showBookButton={false}
          showViewSchedule={false}
          showDetailedAvailability={false}
        />
      );

      // Admin info should NOT be visible
      expect(screen.queryByText("Organization:")).not.toBeInTheDocument();
      expect(screen.queryByText("Club:")).not.toBeInTheDocument();
      expect(screen.queryByText("Status:")).not.toBeInTheDocument();
    });
  });

  describe("Element Order", () => {
    beforeEach(() => {
      mockHasAnyRole.mockReturnValue(true);
    });

    it("renders admin info in correct order: Organization → Club → Status", () => {
      const { container } = render(
        <CourtCard
          court={mockCourt}
          club={mockClub}
          organization={mockOrganization}
          isActive={true}
          showBookButton={false}
          showViewSchedule={false}
          showDetailedAvailability={false}
        />
      );

      const adminSection = container.querySelector(".im-court-card-admin-info");
      expect(adminSection).toBeInTheDocument();

      // Check text content order
      const text = adminSection?.textContent || "";
      const orgIndex = text.indexOf("Organization:");
      const clubIndex = text.indexOf("Club:");
      const statusIndex = text.indexOf("Status:");

      expect(orgIndex).toBeLessThan(clubIndex);
      expect(clubIndex).toBeLessThan(statusIndex);
    });
  });
});
