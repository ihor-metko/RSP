import { useDeferredValue } from "react";

/**
 * Hook to defer loading state updates to prevent UI flicker on fast responses.
 * 
 * When server responses are very fast (< 100-200ms), showing a loading state
 * causes a brief flicker that degrades UX. This hook defers the loading state
 * update, so if the data loads quickly, the UI never shows the loading state.
 * 
 * For slower responses, the loading state will eventually show, providing
 * appropriate feedback to the user.
 * 
 * @param loading - The actual loading state from data fetching
 * @returns A deferred loading state that prevents flicker on fast responses
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [loading, setLoading] = useState(false);
 *   const deferredLoading = useDeferredLoading(loading);
 *   
 *   // Use deferredLoading for UI rendering
 *   if (deferredLoading) {
 *     return <Skeleton />;
 *   }
 *   
 *   return <ActualContent />;
 * }
 * ```
 */
export function useDeferredLoading(loading: boolean): boolean {
  return useDeferredValue(loading);
}
