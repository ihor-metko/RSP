import { render, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { AdminGuard } from "@/components/guards/AdminGuard";
import { useUserStore } from "@/stores/useUserStore";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock user store
jest.mock("@/stores/useUserStore");

const mockUseRouter = useRouter as jest.Mock;
const mockUseUserStore = useUserStore as unknown as jest.Mock;

describe("AdminGuard", () => {
  let mockRouter: { replace: jest.Mock };

  beforeEach(() => {
    // Setup mocks
    mockRouter = { replace: jest.fn() };
    mockUseRouter.mockReturnValue(mockRouter);

    // Default user store state (not hydrated)
    mockUseUserStore.mockImplementation((selector) => {
      const state = {
        isHydrated: false,
        isLoading: false,
        sessionStatus: "loading",
        adminStatus: null,
      };
      return selector(state);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return null while not hydrated", () => {
    mockUseUserStore.mockImplementation((selector) => {
      const state = {
        isHydrated: false,
        isLoading: false,
        sessionStatus: "loading",
        adminStatus: null,
      };
      return selector(state);
    });

    const { container } = render(
      <AdminGuard>
        <div>Test Content</div>
      </AdminGuard>
    );

    // Should not show content while not hydrated
    expect(container.textContent).toBe("");
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("should return null while user is loading", () => {
    mockUseUserStore.mockImplementation((selector) => {
      const state = {
        isHydrated: true,
        isLoading: true,
        sessionStatus: "loading",
        adminStatus: null,
      };
      return selector(state);
    });

    const { container } = render(
      <AdminGuard>
        <div>Test Content</div>
      </AdminGuard>
    );

    // Should not show content while loading
    expect(container.textContent).toBe("");
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("should redirect to sign-in if user is not authenticated", async () => {
    mockUseUserStore.mockImplementation((selector) => {
      const state = {
        isHydrated: true,
        isLoading: false,
        sessionStatus: "unauthenticated",
        adminStatus: null,
      };
      return selector(state);
    });

    const { container } = render(
      <AdminGuard>
        <div>Test Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/auth/sign-in");
    });

    // Should not show content
    expect(container.textContent).toBe("");
  });

  it("should redirect to sign-in if user is not an admin", async () => {
    mockUseUserStore.mockImplementation((selector) => {
      const state = {
        isHydrated: true,
        isLoading: false,
        sessionStatus: "authenticated",
        adminStatus: { isAdmin: false, adminType: "none", managedIds: [] },
      };
      return selector(state);
    });

    const { container } = render(
      <AdminGuard>
        <div>Test Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/auth/sign-in");
    });

    // Should not show content
    expect(container.textContent).toBe("");
  });

  it("should render children if user is authenticated and is an admin", async () => {
    mockUseUserStore.mockImplementation((selector) => {
      const state = {
        isHydrated: true,
        isLoading: false,
        sessionStatus: "authenticated",
        adminStatus: { isAdmin: true, adminType: "root_admin", managedIds: [] },
      };
      return selector(state);
    });

    const { container } = render(
      <AdminGuard>
        <div>Test Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Test Content");
    });

    // Should not redirect
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("should render children if user is an organization admin", async () => {
    mockUseUserStore.mockImplementation((selector) => {
      const state = {
        isHydrated: true,
        isLoading: false,
        sessionStatus: "authenticated",
        adminStatus: { isAdmin: true, adminType: "organization_admin", managedIds: ["org1"] },
      };
      return selector(state);
    });

    const { container } = render(
      <AdminGuard>
        <div>Org Admin Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Org Admin Content");
    });

    // Should not redirect
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("should render children if user is a club admin", async () => {
    mockUseUserStore.mockImplementation((selector) => {
      const state = {
        isHydrated: true,
        isLoading: false,
        sessionStatus: "authenticated",
        adminStatus: { isAdmin: true, adminType: "club_admin", managedIds: ["club1"] },
      };
      return selector(state);
    });

    const { container } = render(
      <AdminGuard>
        <div>Club Admin Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Club Admin Content");
    });

    // Should not redirect
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("should not redirect on subsequent renders when already authenticated", async () => {
    mockUseUserStore.mockImplementation((selector) => {
      const state = {
        isHydrated: true,
        isLoading: false,
        sessionStatus: "authenticated",
        adminStatus: { isAdmin: true, adminType: "root_admin", managedIds: [] },
      };
      return selector(state);
    });

    const { container, rerender } = render(
      <AdminGuard>
        <div>Test Content</div>
      </AdminGuard>
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Test Content");
    });

    // Rerender should not cause additional redirects
    rerender(
      <AdminGuard>
        <div>Test Content</div>
      </AdminGuard>
    );

    // Should still not redirect
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
