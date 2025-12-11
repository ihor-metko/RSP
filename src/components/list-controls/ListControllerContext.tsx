"use client";

import { createContext, useContext, ReactNode } from "react";
import type { UseListControllerReturn } from "@/hooks/useListController";

/**
 * Context for sharing a list controller across multiple child components.
 * This allows filter controls, pagination, and sort components to access
 * the same controller without prop drilling.
 */
export const ListControllerContext = createContext<UseListControllerReturn | null>(null);

interface ListControllerProviderProps {
  controller: UseListControllerReturn;
  children: ReactNode;
}

/**
 * Provider component that wraps list controls and provides controller access
 * 
 * @example
 * ```tsx
 * const controller = useListController({ entityKey: 'users', defaultFilters: {} });
 * 
 * <ListControllerProvider controller={controller}>
 *   <ListToolbar />
 *   <ListSearch />
 *   <PaginationControls />
 * </ListControllerProvider>
 * ```
 */
export function ListControllerProvider({ controller, children }: ListControllerProviderProps) {
  return (
    <ListControllerContext.Provider value={controller}>
      {children}
    </ListControllerContext.Provider>
  );
}

/**
 * Hook to access the list controller from context.
 * Components can use this or accept a controller prop directly.
 * 
 * @throws {Error} If used outside of ListControllerProvider
 * 
 * @example
 * ```tsx
 * function MyFilterComponent() {
 *   const controller = useListControllerContext();
 *   return <input onChange={(e) => controller.setFilter('search', e.target.value)} />;
 * }
 * ```
 */
export function useListControllerContext<TFilters = Record<string, unknown>>(): UseListControllerReturn<TFilters> {
  const context = useContext(ListControllerContext);
  
  if (!context) {
    throw new Error("useListControllerContext must be used within a ListControllerProvider");
  }
  
  return context as UseListControllerReturn<TFilters>;
}

/**
 * Helper hook to get controller from either prop or context.
 * Always calls hooks unconditionally to satisfy React rules.
 * 
 * @param controllerProp - Optional controller passed as prop
 * @returns The controller to use
 * @throws {Error} If neither prop nor context provides a controller
 */
export function useControllerOrContext<TFilters = Record<string, unknown>>(
  controllerProp?: UseListControllerReturn<TFilters>
): UseListControllerReturn<TFilters> {
  // Always call context hook unconditionally
  const context = useContext(ListControllerContext);
  
  // Use prop if provided, otherwise use context
  const controller = controllerProp || context;
  
  if (!controller) {
    throw new Error("Component requires either a controller prop or ListControllerProvider");
  }
  
  return controller as UseListControllerReturn<TFilters>;
}
