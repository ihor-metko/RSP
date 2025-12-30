import { render, waitFor } from "@testing-library/react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { PagePreserveProvider } from "@/components/PagePreserveProvider";
import { useUserStore } from "@/stores/useUserStore";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock user store
jest.mock("@/stores/useUserStore");

const mockUsePathname = usePathname as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockUseUserStore = useUserStore as unknown as jest.Mock;

describe("PagePreserveProvider", () => {
  let mockRouter: { push: jest.Mock };
  let mockSearchParams: URLSearchParams;

  beforeEach(() => {
    // Clear sessionStorage
    sessionStorage.clear();

    // Setup mocks
    mockRouter = { push: jest.fn() };
    mockSearchParams = new URLSearchParams();

    mockUseRouter.mockReturnValue(mockRouter);
    mockUseSearchParams.mockReturnValue(mockSearchParams);
    mockUsePathname.mockReturnValue("/admin/clubs");

    // Default user store state (authenticated)
    mockUseUserStore.mockImplementation((selector) => {
      const state = {
        isHydrated: true,
        isLoading: false,
        sessionStatus: "authenticated",
      };
      return selector(state);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render children without errors", () => {
    const { container } = render(
      <PagePreserveProvider>
        <div>Test Content</div>
      </PagePreserveProvider>
    );

    expect(container.textContent).toBe("Test Content");
  });

  it("should save current page to sessionStorage on navigation", async () => {
    mockUsePathname.mockReturnValue("/admin/clubs");
    mockSearchParams = new URLSearchParams("?page=2");
    mockUseSearchParams.mockReturnValue(mockSearchParams);

    render(
      <PagePreserveProvider>
        <div>Test</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      const stored = sessionStorage.getItem("arenaone_last_page");
      expect(stored).toBe("/admin/clubs?page=2");
    });
  });

  it("should not save excluded paths (auth pages)", async () => {
    mockUsePathname.mockReturnValue("/auth/sign-in");

    render(
      <PagePreserveProvider>
        <div>Test</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      const stored = sessionStorage.getItem("arenaone_last_page");
      expect(stored).toBeNull();
    });
  });

  it("should not save root path", async () => {
    mockUsePathname.mockReturnValue("/");

    render(
      <PagePreserveProvider>
        <div>Test</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      const stored = sessionStorage.getItem("arenaone_last_page");
      expect(stored).toBeNull();
    });
  });

  it("should restore page from sessionStorage on initial mount", async () => {
    // Pre-populate sessionStorage
    sessionStorage.setItem("arenaone_last_page", "/admin/clubs?page=5");
    sessionStorage.setItem("arenaone_last_page_timestamp", Date.now().toString());

    // Current page is dashboard (a page we restore from)
    mockUsePathname.mockReturnValue("/admin/dashboard");

    render(
      <PagePreserveProvider>
        <div>Test</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/admin/clubs?page=5");
    });
  });

  it("should not restore page if user is not authenticated", async () => {
    // Pre-populate sessionStorage
    sessionStorage.setItem("arenaone_last_page", "/admin/clubs");
    sessionStorage.setItem("arenaone_last_page_timestamp", Date.now().toString());

    // User is not authenticated
    mockUseUserStore.mockImplementation((selector) => {
      const state = {
        isHydrated: true,
        isLoading: false,
        sessionStatus: "unauthenticated",
      };
      return selector(state);
    });

    mockUsePathname.mockReturnValue("/admin/dashboard");

    render(
      <PagePreserveProvider>
        <div>Test</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  it("should not restore expired page (older than 30 minutes)", async () => {
    const thirtyOneMinutesAgo = Date.now() - (31 * 60 * 1000);
    sessionStorage.setItem("arenaone_last_page", "/admin/clubs");
    sessionStorage.setItem("arenaone_last_page_timestamp", thirtyOneMinutesAgo.toString());

    mockUsePathname.mockReturnValue("/admin/dashboard");

    render(
      <PagePreserveProvider>
        <div>Test</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      // Should not restore the expired page
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
    
    // The expired page should be removed during restoration check
    // But new dashboard path will be saved after initial mount completes
    // So we just verify restoration didn't happen
  });

  it("should not restore if already on the stored page", async () => {
    sessionStorage.setItem("arenaone_last_page", "/admin/clubs");
    sessionStorage.setItem("arenaone_last_page_timestamp", Date.now().toString());

    // Already on the stored page
    mockUsePathname.mockReturnValue("/admin/clubs");

    render(
      <PagePreserveProvider>
        <div>Test</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  it("should not restore if current page is not dashboard or root", async () => {
    sessionStorage.setItem("arenaone_last_page", "/admin/clubs");
    sessionStorage.setItem("arenaone_last_page_timestamp", Date.now().toString());

    // Current page is a specific page (user intentionally navigated)
    mockUsePathname.mockReturnValue("/admin/organizations");

    render(
      <PagePreserveProvider>
        <div>Test</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });
});
