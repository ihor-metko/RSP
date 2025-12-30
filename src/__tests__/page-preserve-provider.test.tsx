/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { PagePreserveProvider } from "@/components/PagePreserveProvider";

// Mock next/navigation
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockPathname = "/";
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: jest.fn(),
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

describe("PagePreserveProvider", () => {
  let sessionStorageMock: Record<string, string> = {};

  beforeAll(() => {
    // Mock sessionStorage
    global.Storage.prototype.getItem = jest.fn((key: string) => sessionStorageMock[key] || null);
    global.Storage.prototype.setItem = jest.fn((key: string, value: string) => {
      sessionStorageMock[key] = value;
    });
    global.Storage.prototype.removeItem = jest.fn((key: string) => {
      delete sessionStorageMock[key];
    });
    global.Storage.prototype.clear = jest.fn(() => {
      sessionStorageMock = {};
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock = {};
    mockPathname = "/";
    mockSearchParams = new URLSearchParams();
  });

  it("should save the current page to sessionStorage when navigating", async () => {
    mockPathname = "/admin/clubs";
    mockSearchParams = new URLSearchParams();

    render(
      <PagePreserveProvider>
        <div>Test content</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "arena_last_page",
        "/admin/clubs"
      );
    });
  });

  it("should save the current page with query parameters", async () => {
    mockPathname = "/admin/operations";
    mockSearchParams = new URLSearchParams("clubId=123&view=calendar");

    render(
      <PagePreserveProvider>
        <div>Test content</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "arena_last_page",
        "/admin/operations?clubId=123&view=calendar"
      );
    });
  });

  it("should restore saved page on mount when on root path", async () => {
    // Set up saved URL in sessionStorage
    sessionStorageMock["arena_last_page"] = "/admin/clubs/456";
    mockPathname = "/";
    mockSearchParams = new URLSearchParams();

    render(
      <PagePreserveProvider>
        <div>Test content</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/admin/clubs/456");
    });
  });

  it("should restore saved page with query parameters", async () => {
    sessionStorageMock["arena_last_page"] = "/admin/courts?organizationId=789&status=active";
    mockPathname = "/";
    mockSearchParams = new URLSearchParams();

    render(
      <PagePreserveProvider>
        <div>Test content</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/admin/courts?organizationId=789&status=active");
    });
  });

  it("should not save excluded auth paths", async () => {
    mockPathname = "/auth/sign-in";
    mockSearchParams = new URLSearchParams();

    render(
      <PagePreserveProvider>
        <div>Test content</div>
      </PagePreserveProvider>
    );

    // Wait a bit to ensure the effect has run
    await waitFor(() => {
      expect(sessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  it("should not save root path", async () => {
    mockPathname = "/";
    mockSearchParams = new URLSearchParams();

    render(
      <PagePreserveProvider>
        <div>Test content</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(sessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  it("should not restore when already on a non-root page", async () => {
    sessionStorageMock["arena_last_page"] = "/admin/clubs";
    mockPathname = "/admin/organizations";
    mockSearchParams = new URLSearchParams();

    render(
      <PagePreserveProvider>
        <div>Test content</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it("should not restore excluded paths", async () => {
    sessionStorageMock["arena_last_page"] = "/auth/sign-in?redirectTo=/clubs";
    mockPathname = "/";
    mockSearchParams = new URLSearchParams();

    render(
      <PagePreserveProvider>
        <div>Test content</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it("should handle organization detail page with ID", async () => {
    mockPathname = "/admin/organizations/org-123";
    mockSearchParams = new URLSearchParams();

    render(
      <PagePreserveProvider>
        <div>Test content</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "arena_last_page",
        "/admin/organizations/org-123"
      );
    });
  });

  it("should handle club detail page with query parameters", async () => {
    mockPathname = "/admin/clubs/club-456";
    mockSearchParams = new URLSearchParams("tab=details&edit=true");

    render(
      <PagePreserveProvider>
        <div>Test content</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "arena_last_page",
        "/admin/clubs/club-456?tab=details&edit=true"
      );
    });
  });

  it("should handle errors gracefully when sessionStorage fails", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    
    // Make setItem throw an error
    (Storage.prototype.setItem as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Storage quota exceeded");
    });

    mockPathname = "/admin/clubs";
    mockSearchParams = new URLSearchParams();

    render(
      <PagePreserveProvider>
        <div>Test content</div>
      </PagePreserveProvider>
    );

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    consoleWarnSpy.mockRestore();
  });
});
