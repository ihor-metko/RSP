/**
 * @jest-environment node
 */

/**
 * Integration tests for landing page SSR handler admin redirect logic.
 *
 * These tests verify that the landing page (src/app/page.tsx) properly
 * redirects ALL admin types (Root, Organization, Club) to admin dashboard
 * while allowing regular users and unauthenticated users to view the landing.
 *
 * Test scenarios:
 * - Root admin GET / → redirect to /admin/dashboard
 * - Organization admin GET / → redirect to /admin/dashboard
 * - Club admin GET / → redirect to /admin/dashboard (previously failing case)
 * - Regular authenticated user GET / → 200 and landing rendered
 * - Unauthenticated GET / → 200 and landing rendered
 */

import { redirect } from "next/navigation";
import { getAdminHomepage } from "@/utils/roleRedirect";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

// Mock auth
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock checkUserAdminStatus
const mockCheckUserAdminStatus = jest.fn();
jest.mock("@/utils/roleRedirect", () => {
  const actual = jest.requireActual("@/utils/roleRedirect");
  return {
    ...actual,
    checkUserAdminStatus: (...args: unknown[]) => mockCheckUserAdminStatus(...args),
  };
});

// Mock React components used by the landing page
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  Suspense: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/layout/Header", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/layout", () => ({
  PublicFooter: () => null,
}));

jest.mock("@/components/ui", () => ({
  ClubCardsGridSkeleton: () => null,
  PersonalizedSectionSkeleton: () => null,
}));

jest.mock("@/components/home", () => ({
  HomeHero: () => null,
  PopularClubsSection: () => null,
  PersonalizedSectionWrapper: () => null,
  LandingHowItWorks: () => null,
  LandingClubsCoaches: () => null,
  LandingTestimonials: () => null,
}));

// Import Home component after mocking
import Home from "@/app/page";

describe("Landing Page SSR Handler - Admin Redirect Tests", () => {
  const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to non-admin state
    mockCheckUserAdminStatus.mockResolvedValue({
      isAdmin: false,
      adminType: "none",
      managedIds: [],
    });
  });

  describe("Unauthenticated users", () => {
    it("should render landing page for unauthenticated users (no session)", async () => {
      mockAuth.mockResolvedValue(null);

      await Home();

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockCheckUserAdminStatus).not.toHaveBeenCalled();
    });

    it("should render landing page for session with no user", async () => {
      mockAuth.mockResolvedValue({ user: undefined });

      await Home();

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockCheckUserAdminStatus).not.toHaveBeenCalled();
    });
  });

  describe("Regular authenticated users (non-admin)", () => {
    it("should render landing page for regular player user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "player-1", email: "player@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: false,
        adminType: "none",
        managedIds: [],
      });

      await Home();

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockCheckUserAdminStatus).toHaveBeenCalledWith("player-1", false);
    });

    it("should render landing page for regular coach user (non-admin)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-1", email: "coach@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: false,
        adminType: "none",
        managedIds: [],
      });

      await Home();

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockCheckUserAdminStatus).toHaveBeenCalledWith("coach-1", false);
    });
  });

  describe("Root admin users (isRoot=true)", () => {
    it("should redirect root admin to /admin/dashboard", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-1", email: "root@test.com", isRoot: true },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "root_admin",
        managedIds: [],
      });

      await Home();

      expect(mockRedirect).toHaveBeenCalledWith("/admin/dashboard");
      expect(mockCheckUserAdminStatus).toHaveBeenCalledWith("root-admin-1", true);
    });

    it("should use fast path for root admin (isRoot checked first)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-2", email: "root2@test.com", isRoot: true },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "root_admin",
        managedIds: [],
      });

      await Home();

      // Verify isRoot was passed correctly for fast path
      expect(mockCheckUserAdminStatus).toHaveBeenCalledWith("root-admin-2", true);
      expect(mockRedirect).toHaveBeenCalledWith(getAdminHomepage("root_admin"));
    });
  });

  describe("Organization admin users", () => {
    it("should redirect organization admin to /admin/dashboard", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin-1", email: "org-admin@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1"],
      });

      await Home();

      expect(mockRedirect).toHaveBeenCalledWith("/admin/dashboard");
      expect(mockCheckUserAdminStatus).toHaveBeenCalledWith("org-admin-1", false);
    });

    it("should redirect organization admin with multiple orgs to /admin/dashboard", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin-2", email: "org-admin2@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1", "org-2", "org-3"],
      });

      await Home();

      expect(mockRedirect).toHaveBeenCalledWith(getAdminHomepage("organization_admin"));
    });
  });

  describe("Club admin users (previously failing case)", () => {
    it("should redirect club admin to /admin/dashboard", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin-1", email: "club-admin@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "club_admin",
        managedIds: ["club-1"],
      });

      await Home();

      expect(mockRedirect).toHaveBeenCalledWith("/admin/dashboard");
      expect(mockCheckUserAdminStatus).toHaveBeenCalledWith("club-admin-1", false);
    });

    it("should redirect club admin with multiple clubs to /admin/dashboard", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin-2", email: "club-admin2@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "club_admin",
        managedIds: ["club-1", "club-2"],
      });

      await Home();

      expect(mockRedirect).toHaveBeenCalledWith(getAdminHomepage("club_admin"));
    });

    it("should block club admin even when they have no isRoot flag", async () => {
      // This test specifically verifies the previously failing case
      mockAuth.mockResolvedValue({
        user: { id: "club-admin-3", email: "club-only@test.com" }, // No isRoot in session
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "club_admin",
        managedIds: ["club-x"],
      });

      await Home();

      // Should still redirect even without isRoot flag
      expect(mockRedirect).toHaveBeenCalledWith("/admin/dashboard");
    });
  });

  describe("Edge cases", () => {
    it("should handle undefined isRoot gracefully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", email: "user@test.com" }, // isRoot is undefined
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: false,
        adminType: "none",
        managedIds: [],
      });

      await Home();

      // isRoot undefined should be treated as false
      expect(mockCheckUserAdminStatus).toHaveBeenCalledWith("user-1", false);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("should handle user with isRoot undefined but is org admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-2", email: "user2@test.com" },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1"],
      });

      await Home();

      expect(mockRedirect).toHaveBeenCalledWith("/admin/dashboard");
    });

    it("should handle user with isRoot undefined but is club admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-3", email: "user3@test.com" },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "club_admin",
        managedIds: ["club-1"],
      });

      await Home();

      expect(mockRedirect).toHaveBeenCalledWith("/admin/dashboard");
    });
  });

  describe("Admin type priority", () => {
    it("should respect admin type returned by checkUserAdminStatus", async () => {
      // User is both org and club admin, but checkUserAdminStatus returns org_admin (higher priority)
      mockAuth.mockResolvedValue({
        user: { id: "multi-admin", email: "multi@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1"],
      });

      await Home();

      expect(mockRedirect).toHaveBeenCalledWith(getAdminHomepage("organization_admin"));
    });
  });
});

describe("Landing Page SSR - getAdminHomepage integration", () => {
  it("should use getAdminHomepage to determine redirect target", async () => {
    const { getAdminHomepage } = jest.requireActual("@/utils/roleRedirect");
    
    expect(getAdminHomepage("root_admin")).toBe("/admin/dashboard");
    expect(getAdminHomepage("organization_admin")).toBe("/admin/dashboard");
    expect(getAdminHomepage("club_admin")).toBe("/admin/dashboard");
    expect(getAdminHomepage("none")).toBe("/");
  });
});
