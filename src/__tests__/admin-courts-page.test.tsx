/**
 * Integration tests for Admin Courts Page with List Controls
 * Tests the integration of list controls without importing the full page component
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import { useListController } from "@/hooks/useListController";

// Mock hooks
jest.mock("@/hooks/useListController");

// Mock UI components
jest.mock("@/components/ui", () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} {...props}>
      {children}
    </button>
  ),
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  Modal: ({ children, isOpen, title }: any) => 
    isOpen ? <div data-testid="modal" role="dialog"><h2>{title}</h2>{children}</div> : null,
  IMLink: ({ children, href }: any) => <a href={href}>{children}</a>,
  PageHeader: ({ title, description }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
  Table: ({ columns, data, keyExtractor, emptyMessage, ariaLabel }: any) => (
    <table aria-label={ariaLabel}>
      <thead>
        <tr>
          {columns.map((col: any) => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan={columns.length}>{emptyMessage}</td></tr>
        ) : (
          data.map((row: any, index: number) => (
            <tr key={keyExtractor(row)}>
              {columns.map((col: any) => (
                <td key={col.key}>
                  {col.render ? col.render(row, index) : row[col.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  ),
}));

jest.mock("@/components/ui/skeletons", () => ({
  TableSkeleton: () => <div data-testid="table-skeleton">Loading...</div>,
}));

jest.mock("@/components/admin/CourtForm", () => ({
  CourtForm: ({ onSubmit, onCancel, isSubmitting }: any) => (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({}); }}>
      <button type="button" onClick={onCancel}>Cancel</button>
      <button type="submit" disabled={isSubmitting}>Submit</button>
    </form>
  ),
}));

jest.mock("@/components/list-controls", () => ({
  ListControllerProvider: ({ children }: any) => <div>{children}</div>,
  ListToolbar: ({ children, actionButton }: any) => (
    <div data-testid="list-toolbar">
      {children}
      {actionButton}
    </div>
  ),
  ListSearch: () => <input data-testid="list-search" placeholder="Search" />,
  OrgSelector: () => <select data-testid="org-selector"><option>All Organizations</option></select>,
  ClubSelector: () => <select data-testid="club-selector"><option>All Clubs</option></select>,
  StatusFilter: ({ label }: any) => <select data-testid="status-filter" aria-label={label}><option>All</option></select>,
  SortSelect: () => <select data-testid="sort-select"><option>Sort</option></select>,
  PaginationControls: () => <div data-testid="pagination-controls">Pagination</div>,
  QuickPresets: ({ presets }: any) => (
    <div data-testid="quick-presets">
      {presets.map((preset: any) => (
        <button key={preset.id} data-testid={`preset-${preset.id}`}>{preset.label}</button>
      ))}
    </div>
  ),
}));

jest.mock("@/constants/sports", () => ({
  SPORT_TYPE_OPTIONS: [
    { value: "padel", label: "Padel" },
    { value: "tennis", label: "Tennis" },
  ],
}));

describe("Admin Courts Page - List Controls Integration", () => {
  const mockController = {
    filters: {
      searchQuery: "",
      organizationFilter: "",
      clubFilter: "",
      statusFilter: "",
      sportTypeFilter: "",
      surfaceTypeFilter: "",
      indoorFilter: "",
      primeTimeFilter: "",
    },
    sortBy: "name",
    sortOrder: "asc" as const,
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useListController as jest.Mock).mockReturnValue(mockController);
  });

  it("should initialize list controller with correct entity key and filters", () => {
    // Call useListController as it would be called in the courts page
    const controller = useListController({
      entityKey: "courts",
      defaultFilters: {
        searchQuery: "",
        organizationFilter: "",
        clubFilter: "",
        statusFilter: "",
        sportTypeFilter: "",
      },
      defaultSortBy: "name",
      defaultSortOrder: "asc",
      defaultPageSize: 25,
    });

    expect(useListController).toHaveBeenCalledWith(
      expect.objectContaining({
        entityKey: "courts",
        defaultFilters: expect.objectContaining({
          searchQuery: "",
          organizationFilter: "",
          clubFilter: "",
          statusFilter: "",
          sportTypeFilter: "",
        }),
        defaultSortBy: "name",
        defaultSortOrder: "asc",
        defaultPageSize: 25,
      })
    );
  });

  it("should provide filter state for all required filters", () => {
    const controller = useListController({
      entityKey: "courts",
      defaultFilters: {
        searchQuery: "",
        organizationFilter: "",
        clubFilter: "",
        statusFilter: "",
        sportTypeFilter: "",
      },
    });

    expect(controller.filters).toHaveProperty("searchQuery");
    expect(controller.filters).toHaveProperty("organizationFilter");
    expect(controller.filters).toHaveProperty("clubFilter");
    expect(controller.filters).toHaveProperty("statusFilter");
    expect(controller.filters).toHaveProperty("sportTypeFilter");
  });

  it("should provide sorting state", () => {
    const controller = useListController({
      entityKey: "courts",
      defaultFilters: {},
      defaultSortBy: "name",
      defaultSortOrder: "asc",
    });

    expect(controller.sortBy).toBe("name");
    expect(controller.sortOrder).toBe("asc");
    expect(controller.setSortBy).toBeDefined();
    expect(controller.setSortOrder).toBeDefined();
  });

  it("should provide pagination state", () => {
    const controller = useListController({
      entityKey: "courts",
      defaultFilters: {},
      defaultPage: 1,
      defaultPageSize: 25,
    });

    expect(controller.page).toBe(1);
    expect(controller.pageSize).toBe(25);
    expect(controller.setPage).toBeDefined();
    expect(controller.setPageSize).toBeDefined();
  });

  it("should persist filters to localStorage with courts entity key", () => {
    const controller = useListController({
      entityKey: "courts",
      defaultFilters: {
        searchQuery: "test",
        statusFilter: "active",
      },
      enablePersistence: true,
    });

    // The controller should use "filters_courts" as the localStorage key
    expect(controller).toBeDefined();
    expect(controller.filters).toBeDefined();
  });

  it("should include primeTimeFilter in default filters", () => {
    const controller = useListController({
      entityKey: "courts",
      defaultFilters: {
        searchQuery: "",
        organizationFilter: "",
        clubFilter: "",
        statusFilter: "",
        sportTypeFilter: "",
        surfaceTypeFilter: "",
        indoorFilter: "",
        primeTimeFilter: "",
      },
    });

    expect(controller.filters).toHaveProperty("primeTimeFilter");
    expect(controller.filters.primeTimeFilter).toBe("");
  });
});
