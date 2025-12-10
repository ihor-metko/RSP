import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Generic list state interface
 */
export interface ListState<TFilters = Record<string, unknown>> {
  filters: TFilters;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

/**
 * Options for useListController hook
 */
export interface UseListControllerOptions<TFilters = Record<string, unknown>> {
  /** Unique entity key for localStorage (e.g., 'users', 'clubs', 'bookings') */
  entityKey: string;
  /** Default filters state */
  defaultFilters: TFilters;
  /** Default sort field */
  defaultSortBy?: string;
  /** Default sort order */
  defaultSortOrder?: "asc" | "desc";
  /** Default page number */
  defaultPage?: number;
  /** Default page size */
  defaultPageSize?: number;
  /** Debounce delay in milliseconds for localStorage writes */
  debounceDelay?: number;
  /** Enable/disable localStorage persistence */
  enablePersistence?: boolean;
}

/**
 * Return type for useListController hook
 */
export interface UseListControllerReturn<TFilters = Record<string, unknown>> {
  /** Current filters state */
  filters: TFilters;
  /** Current sort field */
  sortBy: string;
  /** Current sort order */
  sortOrder: "asc" | "desc";
  /** Current page number */
  page: number;
  /** Current page size */
  pageSize: number;
  /** Update filters (partial or complete) */
  setFilters: (filters: Partial<TFilters> | ((prev: TFilters) => TFilters)) => void;
  /** Update a single filter field */
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  /** Update sort field */
  setSortBy: (sortBy: string) => void;
  /** Update sort order */
  setSortOrder: (sortOrder: "asc" | "desc") => void;
  /** Update page number */
  setPage: (page: number) => void;
  /** Update page size */
  setPageSize: (pageSize: number) => void;
  /** Clear all filters and reset to defaults */
  clearFilters: () => void;
  /** Reset all state to defaults */
  reset: () => void;
  /** Check if state has been loaded from localStorage */
  isLoaded: boolean;
}

/**
 * Custom hook for managing list state with localStorage persistence
 * 
 * This hook manages filters, sorting, and pagination state for admin list pages,
 * with automatic localStorage persistence. State survives page reloads and
 * navigation between tabs.
 * 
 * @example
 * ```tsx
 * const { filters, setFilter, sortBy, setSortBy, page, setPage } = useListController({
 *   entityKey: 'users',
 *   defaultFilters: { search: '', role: '', status: '' },
 *   defaultSortBy: 'createdAt',
 *   defaultSortOrder: 'desc',
 * });
 * ```
 */
export function useListController<TFilters = Record<string, unknown>>({
  entityKey,
  defaultFilters,
  defaultSortBy = "createdAt",
  defaultSortOrder = "desc",
  defaultPage = 1,
  defaultPageSize = 10,
  debounceDelay = 300,
  enablePersistence = true,
}: UseListControllerOptions<TFilters>): UseListControllerReturn<TFilters> {
  const storageKey = `filters_${entityKey}`;
  
  // Track if state has been loaded from localStorage
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Initialize state from localStorage or defaults
  const getInitialState = useCallback((): ListState<TFilters> => {
    if (!enablePersistence || typeof window === "undefined") {
      return {
        filters: defaultFilters,
        sortBy: defaultSortBy,
        sortOrder: defaultSortOrder,
        page: defaultPage,
        pageSize: defaultPageSize,
      };
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as ListState<TFilters>;
        // Merge stored filters with defaults to ensure all fields exist
        return {
          ...parsed,
          filters: { ...defaultFilters, ...parsed.filters },
        };
      }
    } catch (error) {
      console.warn(`Failed to load ${entityKey} state from localStorage:`, error);
    }

    return {
      filters: defaultFilters,
      sortBy: defaultSortBy,
      sortOrder: defaultSortOrder,
      page: defaultPage,
      pageSize: defaultPageSize,
    };
  }, [storageKey, entityKey, defaultFilters, defaultSortBy, defaultSortOrder, defaultPage, defaultPageSize, enablePersistence]);

  // State - initialize directly from getInitialState
  const [state, setState] = useState<ListState<TFilters>>(() => getInitialState());
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mark as loaded after mount
  useEffect(() => {
    setIsLoaded(true);
  }, []);
  
  // Save state to localStorage (debounced)
  const saveToStorage = useCallback((newState: ListState<TFilters>) => {
    if (!enablePersistence || typeof window === "undefined") return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newState));
      } catch (error) {
        console.warn(`Failed to save ${entityKey} state to localStorage:`, error);
      }
    }, debounceDelay);
  }, [enablePersistence, storageKey, entityKey, debounceDelay]);

  // Update state and trigger save
  const updateState = useCallback((updater: (prev: ListState<TFilters>) => ListState<TFilters>) => {
    setState((prev) => {
      const newState = updater(prev);
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  // Setters
  const setFilters = useCallback((filters: Partial<TFilters> | ((prev: TFilters) => TFilters)) => {
    updateState((prev) => ({
      ...prev,
      filters: typeof filters === "function" ? filters(prev.filters) : { ...prev.filters, ...filters },
      page: 1, // Reset to first page when filters change
    }));
  }, [updateState]);

  const setFilter = useCallback(<K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    updateState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
      page: 1, // Reset to first page when filters change
    }));
  }, [updateState]);

  const setSortBy = useCallback((sortBy: string) => {
    updateState((prev) => ({ ...prev, sortBy }));
  }, [updateState]);

  const setSortOrder = useCallback((sortOrder: "asc" | "desc") => {
    updateState((prev) => ({ ...prev, sortOrder }));
  }, [updateState]);

  const setPage = useCallback((page: number) => {
    updateState((prev) => ({ ...prev, page }));
  }, [updateState]);

  const setPageSize = useCallback((pageSize: number) => {
    updateState((prev) => ({ ...prev, pageSize, page: 1 })); // Reset to first page when page size changes
  }, [updateState]);

  const clearFilters = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      filters: defaultFilters,
      page: 1,
    }));
  }, [updateState, defaultFilters]);

  const reset = useCallback(() => {
    updateState(() => ({
      filters: defaultFilters,
      sortBy: defaultSortBy,
      sortOrder: defaultSortOrder,
      page: defaultPage,
      pageSize: defaultPageSize,
    }));
  }, [defaultFilters, defaultSortBy, defaultSortOrder, defaultPage, defaultPageSize, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    filters: state.filters,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    page: state.page,
    pageSize: state.pageSize,
    setFilters,
    setFilter,
    setSortBy,
    setSortOrder,
    setPage,
    setPageSize,
    clearFilters,
    reset,
    isLoaded,
  };
}
