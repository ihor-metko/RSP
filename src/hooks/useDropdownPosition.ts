import { useEffect, useState, RefObject } from "react";

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
      const actualMaxHeight = Math.min(maxHeight, availableSpace - SAFE_ZONE_BUFFER);

      // Get actual dropdown height if listboxRef is available
      let dropdownHeight = actualMaxHeight;
      if (listboxRef?.current) {
        const listboxRect = listboxRef.current.getBoundingClientRect();
        // Use the actual rendered height, but cap it at actualMaxHeight
        dropdownHeight = Math.min(listboxRect.height, actualMaxHeight);
      }

      // Calculate position
      const top = placement === "bottom"
        ? rect.bottom + offset
        : rect.top - dropdownHeight - offset;

      const left = Math.max(VIEWPORT_PADDING, Math.min(rect.left, viewportWidth - rect.width - VIEWPORT_PADDING));
      const width = matchWidth ? rect.width : Math.min(rect.width, viewportWidth - (VIEWPORT_PADDING * 2));

      setPosition({
        top: Math.max(VIEWPORT_PADDING, top),
        left,
        width,
        maxHeight: actualMaxHeight,
        placement,
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
  }, [isOpen, triggerRef, listboxRef, offset, maxHeight, matchWidth]);

  return position;
}
