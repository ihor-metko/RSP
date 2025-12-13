"use client";

import { useEffect, useState, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: ReactNode;
  /** Element to render into - defaults to document.body */
  container?: Element;
}

/**
 * Portal component for rendering children outside the parent DOM hierarchy.
 * 
 * Renders children into a specified container (defaults to document.body).
 * Useful for modals, dropdowns, tooltips, and other overlays that need to
 * break out of overflow:hidden containers and appear above other content.
 * 
 * @example
 * ```tsx
 * <Portal>
 *   <div className="dropdown-menu">Menu content</div>
 * </Portal>
 * ```
 */
export function Portal({ children, container }: PortalProps) {
  const [mounted, setMounted] = useState(false);
  const defaultContainer = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Create or get the portal container
    if (!defaultContainer.current) {
      defaultContainer.current = document.body;
    }
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    children,
    container || defaultContainer.current!
  );
}
