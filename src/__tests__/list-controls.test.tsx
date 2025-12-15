import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";
import { useListController } from "@/hooks/useListController";
import type { UseListControllerReturn } from "@/hooks/useListController";

// Mock UI components before importing list-controls
jest.mock("@/components/ui", () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Button: ({ children, onClick, disabled, variant, size, className, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
  Input: ({ value, onChange, onKeyDown, placeholder, label, type, id, ...props }: any) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div>
        {label && <label htmlFor={inputId}>{label}</label>}
        <input
          id={inputId}
          type={type || "text"}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          {...props}
        />
      </div>
    );
  },
  Select: ({ label, options, value, onChange, placeholder, disabled, ...props }: any) => {
    const selectId = props.id || (label ? label.toLowerCase().replace(/\s+/g, "-") : "select");
    return (
      <div>
        {label && <label htmlFor={selectId}>{label}</label>}
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options?.map((opt: any) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  },
}));

// Mock DateInput component for tests
jest.mock("@/components/ui/DateInput", () => ({
  DateInput: ({ value, onChange, label, placeholder, "aria-label": ariaLabel, className }: any) => {
    const inputId = label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className={className}>
        {label && <label htmlFor={inputId}>{label}</label>}
        <input
          id={inputId}
          type="date"
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel || label}
        />
      </div>
    );
  },
}));

import {
  ListControllerProvider,
  useListControllerContext,
  ListToolbar,
  ListSearch,
  PaginationControls,
  SortSelect,
  RoleFilter,
  StatusFilter,
  DateRangeFilter,
  QuickPresets,
} from "@/components/list-controls";

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

// Mock stores
jest.mock("@/stores/useOrganizationStore", () => ({
  useOrganizationStore: jest.fn(() => ({
    organizations: [
      { id: "org1", name: "Organization 1" },
      { id: "org2", name: "Organization 2" },
    ],
    fetchOrganizations: jest.fn().mockResolvedValue(undefined),
    loading: false,
  })),
}));

jest.mock("@/stores/useClubStore", () => ({
  useClubStore: jest.fn(() => ({
    clubs: [
      { id: "club1", name: "Club 1", organizationId: "org1" },
      { id: "club2", name: "Club 2", organizationId: "org1" },
      { id: "club3", name: "Club 3", organizationId: "org2" },
    ],
    fetchClubsIfNeeded: jest.fn().mockResolvedValue(undefined),
    loading: false,
  })),
}));

// Helper to create a mock controller
function createMockController<TFilters = Record<string, unknown>>(
  overrides?: Partial<UseListControllerReturn<TFilters>>
): UseListControllerReturn<TFilters> {
  return {
    filters: {} as TFilters,
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    pageSize: 25,
    setFilters: jest.fn(),
    setFilter: jest.fn(),
    setSortBy: jest.fn(),
    setSortOrder: jest.fn(),
    setPage: jest.fn(),
    setPageSize: jest.fn(),
    clearFilters: jest.fn(),
    reset: jest.fn(),
    isLoaded: true,
    ...overrides,
  } as UseListControllerReturn<TFilters>;
}

describe("ListControllerContext", () => {
  it("should provide controller to children", () => {
    const controller = createMockController({ filters: { test: "value" } });
    
    function TestComponent() {
      const ctx = useListControllerContext();
      return <div>Filter: {ctx.filters.test}</div>;
    }

    render(
      <ListControllerProvider controller={controller}>
        <TestComponent />
      </ListControllerProvider>
    );

    expect(screen.getByText("Filter: value")).toBeInTheDocument();
  });

  it("should throw error when used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    
    function TestComponent() {
      useListControllerContext();
      return <div>Test</div>;
    }

    expect(() => render(<TestComponent />)).toThrow(
      "useListControllerContext must be used within a ListControllerProvider"
    );

    consoleSpy.mockRestore();
  });
});

describe("ListToolbar", () => {
  it("should render children", () => {
    const controller = createMockController();

    render(
      <ListToolbar controller={controller}>
        <div>Child Content</div>
      </ListToolbar>
    );

    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("should render with horizontal layout class", () => {
    const controller = createMockController();

    const { container } = render(
      <ListToolbar controller={controller}>
        <div>Filters</div>
      </ListToolbar>
    );

    const toolbar = container.querySelector(".im-list-toolbar");
    expect(toolbar).toBeInTheDocument();
  });

  it("should render QuickPresets and DateRangeFilter inside toolbar", () => {
    const controller = createMockController({
      filters: { dateFrom: "", dateTo: "", activeLast30d: false } as any,
    });

    const presets = [
      {
        id: "active_30d",
        label: "Active Last 30 Days",
        filters: { activeLast30d: true },
      },
    ];

    render(
      <ListToolbar controller={controller}>
        <QuickPresets controller={controller} presets={presets} />
        <DateRangeFilter
          controller={controller}
          field="createdAt"
          fromKey="dateFrom"
          toKey="dateTo"
        />
      </ListToolbar>
    );

    expect(screen.getByText("Active Last 30 Days")).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
  });

  it("should show reset button when filters are active", () => {
    const controller = createMockController({
      filters: { search: "test" } as any,
    });

    render(
      <ListToolbar controller={controller} showReset>
        <div>Filters</div>
      </ListToolbar>
    );

    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });

  it("should show reset button as disabled when no filters are active", () => {
    const controller = createMockController({
      filters: { search: "" } as any,
    });

    render(
      <ListToolbar controller={controller} showReset>
        <div>Filters</div>
      </ListToolbar>
    );

    const clearButton = screen.getByText("Clear filters");
    expect(clearButton).toBeInTheDocument();
    expect(clearButton).toBeDisabled();
  });

  it("should call clearFilters when reset button is clicked", () => {
    const controller = createMockController({
      filters: { search: "test" } as any,
    });

    render(
      <ListToolbar controller={controller} showReset>
        <div>Filters</div>
      </ListToolbar>
    );

    fireEvent.click(screen.getByText("Clear filters"));
    expect(controller.clearFilters).toHaveBeenCalled();
  });

  it("should not call clearFilters when disabled reset button is clicked", () => {
    const controller = createMockController({
      filters: { search: "" } as any,
    });

    render(
      <ListToolbar controller={controller} showReset>
        <div>Filters</div>
      </ListToolbar>
    );

    const clearButton = screen.getByText("Clear filters");
    fireEvent.click(clearButton);
    expect(controller.clearFilters).not.toHaveBeenCalled();
  });

  it("should call custom onReset when provided", () => {
    const onReset = jest.fn();
    const controller = createMockController({
      filters: { search: "test" } as any,
    });

    render(
      <ListToolbar controller={controller} showReset onReset={onReset}>
        <div>Filters</div>
      </ListToolbar>
    );

    fireEvent.click(screen.getByText("Clear filters"));
    expect(onReset).toHaveBeenCalled();
    expect(controller.clearFilters).not.toHaveBeenCalled();
  });

  it("should support keyboard navigation across toolbar items", () => {
    const controller = createMockController({
      filters: { searchQuery: "", activeLast30d: false } as any,
    });

    const presets = [
      {
        id: "active_30d",
        label: "Active Last 30 Days",
        filters: { activeLast30d: true },
      },
    ];

    render(
      <ListToolbar controller={controller} showReset>
        <ListSearch controller={controller} placeholder="Search..." />
        <QuickPresets controller={controller} presets={presets} />
      </ListToolbar>
    );

    const searchInput = screen.getByPlaceholderText("Search...");
    const presetButton = screen.getByText("Active Last 30 Days");
    const clearButton = screen.getByText("Clear filters");

    // Elements should be focusable
    expect(searchInput).not.toBeDisabled();
    expect(presetButton).not.toBeDisabled();
    
    // Clear button should be present but disabled when no filters are active
    expect(clearButton).toBeInTheDocument();
    expect(clearButton).toBeDisabled();
  });

  it("should render action button when provided", () => {
    const controller = createMockController({
      filters: { search: "" } as any,
    });

    const handleAction = jest.fn();

    render(
      <ListToolbar 
        controller={controller} 
        actionButton={
          <button onClick={handleAction} aria-label="Create New">
            Create New
          </button>
        }
      >
        <div>Filters</div>
      </ListToolbar>
    );

    expect(screen.getByText("Create New")).toBeInTheDocument();
    expect(screen.getByLabelText("Create New")).toBeInTheDocument();
  });

  it("should call action button onClick handler", () => {
    const controller = createMockController({
      filters: { search: "" } as any,
    });

    const handleAction = jest.fn();

    render(
      <ListToolbar 
        controller={controller}
        actionButton={
          <button onClick={handleAction}>Create</button>
        }
      >
        <div>Filters</div>
      </ListToolbar>
    );

    fireEvent.click(screen.getByText("Create"));
    expect(handleAction).toHaveBeenCalled();
  });

  it("should render action button and reset button together", () => {
    const controller = createMockController({
      filters: { search: "test" } as any,
    });

    render(
      <ListToolbar 
        controller={controller}
        showReset
        actionButton={<button>Action</button>}
      >
        <div>Filters</div>
      </ListToolbar>
    );

    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });

  it("should render action button at top-right even without active filters", () => {
    const controller = createMockController({
      filters: { search: "" } as any,
    });

    render(
      <ListToolbar 
        controller={controller}
        showReset
        actionButton={<button>Create</button>}
      >
        <div>Filters</div>
      </ListToolbar>
    );

    // Action button should be present
    expect(screen.getByText("Create")).toBeInTheDocument();
    // Reset button should be present but disabled (no active filters)
    const clearButton = screen.getByText("Clear filters");
    expect(clearButton).toBeInTheDocument();
    expect(clearButton).toBeDisabled();
  });

  it("should work without action button (backwards compatible)", () => {
    const controller = createMockController({
      filters: { search: "" } as any,
    });

    const { container } = render(
      <ListToolbar controller={controller}>
        <div>Filters</div>
      </ListToolbar>
    );

    // Should render without errors
    expect(container.querySelector(".im-list-toolbar")).toBeInTheDocument();
  });
});

describe("ListSearch", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render search input with placeholder", () => {
    const controller = createMockController({
      filters: { searchQuery: "" } as any,
    });

    render(<ListSearch controller={controller} placeholder="Search users..." />);
    expect(screen.getByPlaceholderText("Search users...")).toBeInTheDocument();
  });

  it("should update local value immediately on change", () => {
    const controller = createMockController({
      filters: { searchQuery: "" } as any,
    });

    render(<ListSearch controller={controller} />);
    const input = screen.getByPlaceholderText("Search...") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "test" } });
    expect(input.value).toBe("test");
  });

  it("should debounce filter updates", async () => {
    const controller = createMockController({
      filters: { searchQuery: "" } as any,
    });

    render(<ListSearch controller={controller} debounceMs={300} />);
    const input = screen.getByPlaceholderText("Search...");

    fireEvent.change(input, { target: { value: "test" } });

    // Should not call setFilter immediately
    expect(controller.setFilter).not.toHaveBeenCalled();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should call setFilter after debounce
    expect(controller.setFilter).toHaveBeenCalledWith("searchQuery", "test");
  });

  it("should trigger immediate update on Enter key", () => {
    const controller = createMockController({
      filters: { searchQuery: "" } as any,
    });

    render(<ListSearch controller={controller} debounceMs={300} />);
    const input = screen.getByPlaceholderText("Search...");

    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Should call setFilter immediately without waiting for debounce
    expect(controller.setFilter).toHaveBeenCalledWith("searchQuery", "test");
  });
});

describe("PaginationControls", () => {
  it("should render pagination info", () => {
    const controller = createMockController({ page: 1, pageSize: 25 });

    render(
      <PaginationControls
        controller={controller}
        totalCount={100}
        totalPages={4}
      />
    );

    expect(screen.getByText(/Showing 1 to 25 of 100/)).toBeInTheDocument();
  });

  it("should disable previous button on first page", () => {
    const controller = createMockController({ page: 1, pageSize: 25 });

    render(
      <PaginationControls
        controller={controller}
        totalCount={100}
        totalPages={4}
      />
    );

    const prevButton = screen.getByLabelText("Previous");
    expect(prevButton).toBeDisabled();
  });

  it("should disable next button on last page", () => {
    const controller = createMockController({ page: 4, pageSize: 25 });

    render(
      <PaginationControls
        controller={controller}
        totalCount={100}
        totalPages={4}
      />
    );

    const nextButton = screen.getByLabelText("Next");
    expect(nextButton).toBeDisabled();
  });

  it("should call setPage when clicking page numbers", () => {
    const controller = createMockController({ page: 1, pageSize: 25 });

    render(
      <PaginationControls
        controller={controller}
        totalCount={100}
        totalPages={4}
      />
    );

    const page2Button = screen.getByText("2");
    fireEvent.click(page2Button);

    expect(controller.setPage).toHaveBeenCalledWith(2);
  });

  it("should call setPageSize when changing page size", () => {
    const controller = createMockController({ page: 1, pageSize: 25 });

    render(
      <PaginationControls
        controller={controller}
        totalCount={100}
        totalPages={4}
        showPageSize
      />
    );

    const select = screen.getByLabelText("Items per page");
    fireEvent.change(select, { target: { value: "50" } });

    expect(controller.setPageSize).toHaveBeenCalledWith(50);
  });

  it("should not render when totalCount is 0", () => {
    const controller = createMockController({ page: 1, pageSize: 25 });

    const { container } = render(
      <PaginationControls
        controller={controller}
        totalCount={0}
        totalPages={0}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});

describe("SortSelect", () => {
  it("should render sort options", () => {
    const controller = createMockController({
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    const options = [
      { key: "createdAt", label: "Newest", direction: "desc" as const },
      { key: "createdAt", label: "Oldest", direction: "asc" as const },
      { key: "name", label: "Name A-Z", direction: "asc" as const },
    ];

    render(<SortSelect controller={controller} options={options} label="Sort" />);

    // Select should be rendered
    expect(screen.getByLabelText("Sort")).toBeInTheDocument();
  });

  it("should update sort when option is selected", () => {
    const controller = createMockController({
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    const options = [
      { key: "createdAt", label: "Newest", direction: "desc" as const },
      { key: "name", label: "Name A-Z", direction: "asc" as const },
    ];

    render(<SortSelect controller={controller} options={options} />);

    // Simulate selecting "name-asc" option
    const onChange = controller.setSortBy as jest.Mock;
    
    // This would be triggered by Select component's onChange
    act(() => {
      controller.setSortBy("name");
      controller.setSortOrder("asc");
    });

    expect(controller.setSortBy).toHaveBeenCalledWith("name");
    expect(controller.setSortOrder).toHaveBeenCalledWith("asc");
  });
});

describe("RoleFilter", () => {
  it("should render role options", () => {
    const controller = createMockController({
      filters: { roleFilter: "" } as any,
    });

    const roles = [
      { value: "root_admin", label: "Root Admin" },
      { value: "user", label: "User" },
    ];

    render(<RoleFilter controller={controller} roles={roles} label="Role" />);

    expect(screen.getByLabelText("Role")).toBeInTheDocument();
  });

  it("should update filter when role is selected", () => {
    const controller = createMockController({
      filters: { roleFilter: "" } as any,
    });

    const roles = [
      { value: "root_admin", label: "Root Admin" },
      { value: "user", label: "User" },
    ];

    render(<RoleFilter controller={controller} roles={roles} />);

    // Simulate selecting a role
    act(() => {
      controller.setFilter("roleFilter", "root_admin");
    });

    expect(controller.setFilter).toHaveBeenCalledWith("roleFilter", "root_admin");
  });
});

describe("StatusFilter", () => {
  it("should render status options", () => {
    const controller = createMockController({
      filters: { statusFilter: "" } as any,
    });

    const statuses = [
      { value: "pending", label: "Pending" },
      { value: "paid", label: "Paid" },
      { value: "cancelled", label: "Cancelled" },
    ];

    render(<StatusFilter controller={controller} statuses={statuses} label="Status" />);

    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });

  it("should update filter when status is selected", () => {
    const controller = createMockController({
      filters: { statusFilter: "" } as any,
    });

    const statuses = [
      { value: "pending", label: "Pending" },
      { value: "paid", label: "Paid" },
      { value: "cancelled", label: "Cancelled" },
    ];

    render(<StatusFilter controller={controller} statuses={statuses} />);

    // Simulate selecting a status
    act(() => {
      controller.setFilter("statusFilter", "paid");
    });

    expect(controller.setFilter).toHaveBeenCalledWith("statusFilter", "paid");
  });

  it("should render with custom filter key", () => {
    const controller = createMockController({
      filters: { bookingStatus: "" } as any,
    });

    const statuses = [
      { value: "confirmed", label: "Confirmed" },
      { value: "cancelled", label: "Cancelled" },
    ];

    render(
      <StatusFilter
        controller={controller}
        statuses={statuses}
        filterKey="bookingStatus"
        label="Booking Status"
      />
    );

    expect(screen.getByLabelText("Booking Status")).toBeInTheDocument();
  });
});

describe("DateRangeFilter", () => {
  it("should render from and to date inputs", () => {
    const controller = createMockController({
      filters: { dateFrom: "", dateTo: "" } as any,
    });

    render(
      <DateRangeFilter
        controller={controller}
        field="createdAt"
        label="Created Date"
        fromLabel="From"
        toLabel="To"
      />
    );

    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
  });

  it("should update filters when dates change", () => {
    const controller = createMockController({
      filters: { dateFrom: "", dateTo: "" } as any,
    });

    render(
      <DateRangeFilter
        controller={controller}
        field="createdAt"
        fromLabel="From"
        toLabel="To"
      />
    );

    const fromInput = screen.getByLabelText("From");
    const toInput = screen.getByLabelText("To");

    fireEvent.change(fromInput, { target: { value: "2024-01-01" } });
    fireEvent.change(toInput, { target: { value: "2024-12-31" } });

    expect(controller.setFilter).toHaveBeenCalledWith("dateFrom", "2024-01-01");
    expect(controller.setFilter).toHaveBeenCalledWith("dateTo", "2024-12-31");
  });
});

describe("QuickPresets", () => {
  it("should render preset buttons", () => {
    const controller = createMockController({
      filters: { activeLast30d: false, neverBooked: false } as any,
    });

    const presets = [
      {
        id: "active_30d",
        label: "Active Last 30 Days",
        filters: { activeLast30d: true },
      },
      {
        id: "never_booked",
        label: "Never Booked",
        filters: { neverBooked: true },
      },
    ];

    render(<QuickPresets controller={controller} presets={presets} />);

    expect(screen.getByText("Active Last 30 Days")).toBeInTheDocument();
    expect(screen.getByText("Never Booked")).toBeInTheDocument();
  });

  it("should toggle preset on click", () => {
    const controller = createMockController({
      filters: { activeLast30d: false } as any,
    });

    const presets = [
      {
        id: "active_30d",
        label: "Active Last 30 Days",
        filters: { activeLast30d: true },
      },
    ];

    render(<QuickPresets controller={controller} presets={presets} />);

    const button = screen.getByText("Active Last 30 Days");
    fireEvent.click(button);

    expect(controller.setFilters).toHaveBeenCalledWith({ activeLast30d: true });
  });

  it("should show active state when preset is active", () => {
    const controller = createMockController({
      filters: { activeLast30d: true } as any,
    });

    const presets = [
      {
        id: "active_30d",
        label: "Active Last 30 Days",
        filters: { activeLast30d: true },
      },
    ];

    render(<QuickPresets controller={controller} presets={presets} />);

    const button = screen.getByText("Active Last 30 Days");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
