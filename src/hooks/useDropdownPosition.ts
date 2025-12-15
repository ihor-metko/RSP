import { useFloating, offset as floatingOffset, flip, shift, size, autoUpdate } from "@floating-ui/react";
import { RefObject } from "react";

export interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "bottom" | "top";
}

interface UseDropdownPositionOptions {
  /** Reference to the trigger element */
  triggerRef: RefObject<HTMLElement>;
  /** Reference to the dropdown list element (for measuring actual height) */
  listboxRef?: RefObject<HTMLElement>;
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Offset from trigger element in pixels */
  offset?: number;
  /** Maximum dropdown height in pixels */
  maxHeight?: number;
  /** Whether to match trigger width */
  matchWidth?: boolean;
}

// Constants for viewport padding
const VIEWPORT_PADDING = 8; // Minimum distance from viewport edges

/**
 * Hook to calculate optimal positioning for a dropdown in a portal using Floating UI.
 * 
 * Uses @floating-ui/react for robust positioning with automatic:
 * - Flip behavior when space is limited
 * - Shift to stay within viewport
 * - Size adjustments based on available space
 * - Updates on scroll, resize, and content changes
 * 
 * @example
 * ```tsx
 * const triggerRef = useRef<HTMLDivElement>(null);
 * const listboxRef = useRef<HTMLUListElement>(null);
 * const position = useDropdownPosition({ 
 *   triggerRef, 
 *   listboxRef, 
 *   isOpen: true 
 * });
 * 
 * <Portal>
 *   <div 
 *     ref={listboxRef}
 *     style={{ 
 *       position: 'fixed',
 *       top: `${position.top}px`,
 *       left: `${position.left}px`,
 *       width: `${position.width}px`
 *     }}
 *   >
 *     Dropdown content
 *   </div>
 * </Portal>
 * ```
 */
export function useDropdownPosition({
  triggerRef,
  listboxRef,
  isOpen,
  offset = 4,
  maxHeight = 300,
  matchWidth = true,
}: UseDropdownPositionOptions): DropdownPosition | null {
  const { x, y, refs, placement: floatingPlacement } = useFloating({
    open: isOpen,
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [
      floatingOffset(offset),
      flip({
        padding: VIEWPORT_PADDING,
        fallbackPlacements: ["top-start", "bottom-start"],
      }),
      shift({
        padding: VIEWPORT_PADDING,
      }),
      size({
        padding: VIEWPORT_PADDING,
        apply({ availableHeight, elements }) {
          // Apply max height constraint based on available space
          const constrainedHeight = Math.min(maxHeight, availableHeight);
          Object.assign(elements.floating.style, {
            maxHeight: `${constrainedHeight}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Set refs from props to Floating UI refs
  if (isOpen) {
    refs.setReference(triggerRef.current);
    refs.setFloating(listboxRef?.current ?? null);
  }

  if (!isOpen) {
    return null;
  }

  // Get trigger width for matchWidth functionality
  const triggerWidth = triggerRef.current?.getBoundingClientRect().width ?? 0;
  const width = matchWidth ? triggerWidth : undefined;

  // Determine simplified placement (top or bottom)
  const simplifiedPlacement = floatingPlacement?.startsWith("top") ? "top" : "bottom";

  return {
    top: y ?? 0,
    left: x ?? 0,
    width: width ?? triggerWidth,
    maxHeight,
    placement: simplifiedPlacement,
  };
}
