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
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Offset from trigger element in pixels */
  offset?: number;
  /** Maximum dropdown height in pixels */
  maxHeight?: number;
  /** Whether to match trigger width */
  matchWidth?: boolean;
}

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
 * const position = useDropdownPosition({ triggerRef, isOpen: true });
 * 
 * <Portal>
 *   <div style={{ 
 *     position: 'fixed',
 *     top: `${position.top}px`,
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
      const actualMaxHeight = Math.min(maxHeight, availableSpace - 20); // 20px buffer

      // Calculate position
      const top = placement === "bottom"
        ? rect.bottom + offset
        : rect.top - actualMaxHeight - offset;

      const left = Math.max(8, Math.min(rect.left, viewportWidth - rect.width - 8));
      const width = matchWidth ? rect.width : Math.min(rect.width, viewportWidth - 16);

      setPosition({
        top: Math.max(8, top),
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
  }, [isOpen, triggerRef, offset, maxHeight, matchWidth]);

  return position;
}
