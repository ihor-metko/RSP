import { renderHook, act } from "@testing-library/react";
import { useListController } from "@/hooks/useListController";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useListController", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "", role: "" },
        defaultSortBy: "createdAt",
        defaultSortOrder: "desc",
        defaultPage: 1,
        defaultPageSize: 10,
      })
    );

    expect(result.current.filters).toEqual({ search: "", role: "" });
    expect(result.current.sortBy).toBe("createdAt");
    expect(result.current.sortOrder).toBe("desc");
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });

  it("should update filters", () => {
    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "", role: "" },
      })
    );

    act(() => {
      result.current.setFilters({ search: "test" });
    });

    expect(result.current.filters.search).toBe("test");
    expect(result.current.page).toBe(1); // Should reset page
  });

  it("should update a single filter", () => {
    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "", role: "" },
      })
    );

    act(() => {
      result.current.setFilter("role", "admin");
    });

    expect(result.current.filters.role).toBe("admin");
    expect(result.current.page).toBe(1); // Should reset page
  });

  it("should update sort field", () => {
    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "" },
      })
    );

    act(() => {
      result.current.setSortBy("name");
    });

    expect(result.current.sortBy).toBe("name");
  });

  it("should update sort order", () => {
    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "" },
      })
    );

    act(() => {
      result.current.setSortOrder("asc");
    });

    expect(result.current.sortOrder).toBe("asc");
  });

  it("should update page number", () => {
    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "" },
      })
    );

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);
  });

  it("should update page size and reset page", () => {
    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "" },
      })
    );

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.page).toBe(3);

    act(() => {
      result.current.setPageSize(25);
    });

    expect(result.current.pageSize).toBe(25);
    expect(result.current.page).toBe(1); // Should reset page
  });

  it("should clear filters", () => {
    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "", role: "" },
      })
    );

    act(() => {
      result.current.setFilters({ search: "test", role: "admin" });
    });

    expect(result.current.filters).toEqual({ search: "test", role: "admin" });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters).toEqual({ search: "", role: "" });
    expect(result.current.page).toBe(1);
  });

  it("should reset all state", () => {
    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "", role: "" },
        defaultSortBy: "createdAt",
        defaultSortOrder: "desc",
        defaultPage: 1,
        defaultPageSize: 10,
      })
    );

    act(() => {
      result.current.setFilters({ search: "test" });
      result.current.setSortBy("name");
      result.current.setSortOrder("asc");
      result.current.setPage(2);
      result.current.setPageSize(25);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.filters).toEqual({ search: "", role: "" });
    expect(result.current.sortBy).toBe("createdAt");
    expect(result.current.sortOrder).toBe("desc");
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });

  it("should persist state to localStorage with debounce", async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "" },
        debounceDelay: 300,
      })
    );

    act(() => {
      result.current.setFilter("search", "test");
    });

    // Should not be saved immediately
    expect(localStorageMock.getItem("filters_users")).toBeNull();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should be saved after debounce
    const stored = localStorageMock.getItem("filters_users");
    expect(stored).toBeTruthy();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.filters.search).toBe("test");
    }

    jest.useRealTimers();
  });

  it("should load state from localStorage on mount", () => {
    const initialState = {
      filters: { search: "saved", role: "admin" },
      sortBy: "name",
      sortOrder: "asc" as const,
      page: 2,
      pageSize: 25,
    };

    localStorageMock.setItem("filters_clubs", JSON.stringify(initialState));

    const { result } = renderHook(() =>
      useListController({
        entityKey: "clubs",
        defaultFilters: { search: "", role: "" },
      })
    );

    // Wait for state to load
    act(() => {
      // State is loaded synchronously in useEffect
    });

    expect(result.current.filters.search).toBe("saved");
    expect(result.current.filters.role).toBe("admin");
    expect(result.current.sortBy).toBe("name");
    expect(result.current.sortOrder).toBe("asc");
    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(25);
  });

  it("should merge stored filters with defaults", () => {
    const partialState = {
      filters: { search: "saved" }, // Missing 'role' field
      sortBy: "name",
      sortOrder: "asc" as const,
      page: 1,
      pageSize: 10,
    };

    localStorageMock.setItem("filters_bookings", JSON.stringify(partialState));

    const { result } = renderHook(() =>
      useListController({
        entityKey: "bookings",
        defaultFilters: { search: "", role: "", status: "" },
      })
    );

    // Should have both stored and default values
    expect(result.current.filters.search).toBe("saved");
    expect(result.current.filters.role).toBe("");
    expect(result.current.filters.status).toBe("");
  });

  it("should work without persistence", () => {
    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "" },
        enablePersistence: false,
      })
    );

    act(() => {
      result.current.setFilter("search", "test");
    });

    expect(result.current.filters.search).toBe("test");
    expect(localStorageMock.getItem("filters_users")).toBeNull();
  });

  it("should handle localStorage errors gracefully", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
    
    // Mock localStorage to throw
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = jest.fn(() => {
      throw new Error("Storage full");
    });

    jest.useFakeTimers();

    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "" },
      })
    );

    act(() => {
      result.current.setFilter("search", "test");
    });

    // Fast-forward time to trigger debounced save
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should have logged a warning
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to save users state to localStorage"),
      expect.any(Error)
    );

    // Should still update state
    expect(result.current.filters.search).toBe("test");

    // Restore
    localStorageMock.setItem = originalSetItem;
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  it("should update filters using a function", () => {
    const { result } = renderHook(() =>
      useListController({
        entityKey: "users",
        defaultFilters: { search: "", role: "" },
      })
    );

    act(() => {
      result.current.setFilters((prev) => ({ ...prev, search: "test", role: "admin" }));
    });

    expect(result.current.filters).toEqual({ search: "test", role: "admin" });
  });
});
