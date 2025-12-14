import { useEffect, useState, RefObject } from "react";

export interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "bottom" | "top";
  /** For CSS bottom property calculation when placement is "top" */
  bottom?: number;
}

interface UseDropdownPositionOptions {
  /** Reference to the trigger element */
  triggerRef: RefObject<HTMLElement>;
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Offset from trigger element in pixels */
  offset?: number;
  /** Maximum dropdown height in pixels */
  maxHeight?: number;
  /** Whether to match trigger width */
  matchWidth?: boolean;
}

// Constants for viewport padding and spacing
const VIEWPORT_PADDING = 8; // Minimum distance from viewport edges
const SAFE_ZONE_BUFFER = 20; // Extra buffer for available space calculation

/**
 * Hook to calculate optimal positioning for a dropdown in a portal.
 * 
 * Calculates position based on trigger element's position and available space.
 * Automatically flips dropdown above trigger if not enough space below.
 * Recalculates on window resize and scroll.
 * 
 * When placement is "top", the returned `top` value represents where the dropdown's
 * BOTTOM edge should be positioned. Components should use CSS `bottom` property
 * calculated as `window.innerHeight - position.top`.
 * 
 * @example
 * ```tsx
 * const triggerRef = useRef<HTMLDivElement>(null);
 * const position = useDropdownPosition({ triggerRef, isOpen: true });
 * 
 * <Portal>
 *   <div style={{ 
 *     position: 'fixed',
 *     ...(position.placement === 'bottom'
 *       ? { top: `${position.top}px` }
 *       : { bottom: `${window.innerHeight - position.top}px` }
 *     ),
 *     left: `${position.left}px`,
 *     width: `${position.width}px`
 *   }}>
 *     Dropdown content
 *   </div>
 * </Portal>
 * ```
 */
export function useDropdownPosition({
  triggerRef,
  isOpen,
  offset = 4,
  maxHeight = 300,
  matchWidth = true,
}: UseDropdownPositionOptions): DropdownPosition | null {
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setPosition(null);
      return;
    }

    const calculatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Calculate available space above and below
      const spaceBelow = viewportHeight - rect.bottom - offset;
      const spaceAbove = rect.top - offset;

      // Determine placement
      const placement: "bottom" | "top" = spaceBelow >= maxHeight || spaceBelow > spaceAbove
        ? "bottom"
        : "top";

      // Calculate actual max height based on available space
      const availableSpace = placement === "bottom" ? spaceBelow : spaceAbove;
      const actualMaxHeight = Math.min(maxHeight, Math.max(0, availableSpace - SAFE_ZONE_BUFFER));

      // Calculate position
      // For bottom placement: top is where the dropdown top edge should be (below trigger)
      // For top placement: top is where the dropdown bottom edge should be (at trigger top)
      const top = placement === "bottom"
        ? rect.bottom + offset
        : rect.top - offset;

      const left = Math.max(VIEWPORT_PADDING, Math.min(rect.left, viewportWidth - rect.width - VIEWPORT_PADDING));
      const width = matchWidth ? rect.width : Math.min(rect.width, viewportWidth - (VIEWPORT_PADDING * 2));

      // Apply viewport padding constraint only for bottom placement
      // For top placement, the value represents bottom edge position and should not be constrained
      const constrainedTop = placement === "bottom"
        ? Math.max(VIEWPORT_PADDING, top)
        : top;

      // Calculate bottom property for top placement to avoid repeated window.innerHeight lookups
      const bottom = placement === "top"
        ? viewportHeight - constrainedTop
        : undefined;

      setPosition({
        top: constrainedTop,
        left,
        width,
        maxHeight: actualMaxHeight,
        placement,
        bottom,
      });
    };

    // Calculate initial position
    calculatePosition();

    // Recalculate on scroll and resize
    const handleUpdate = () => {
      requestAnimationFrame(calculatePosition);
    };

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isOpen, triggerRef, offset, maxHeight, matchWidth]);

  return position;
}
