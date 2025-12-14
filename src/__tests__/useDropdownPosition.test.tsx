/**
 * Test for useDropdownPosition hook
 * Verifies dropdown positioning with actual content height measurement
 */

import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { useDropdownPosition } from "@/hooks/useDropdownPosition";

describe("useDropdownPosition", () => {
  beforeEach(() => {
    // Mock window dimensions
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1000,
    });
  });

  it("should return null when isOpen is false", () => {
    const triggerRef = { current: document.createElement("div") };
    const { result } = renderHook(() =>
      useDropdownPosition({
        triggerRef,
        isOpen: false,
      })
    );

    expect(result.current).toBeNull();
  });

  it("should calculate position for bottom placement", () => {
    const trigger = document.createElement("div");
    // Mock trigger position near top of viewport (lots of space below)
    trigger.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      left: 50,
      right: 250,
      bottom: 140,
      width: 200,
      height: 40,
      x: 50,
      y: 100,
      toJSON: () => ({}),
    }));

    const triggerRef = { current: trigger };
    const { result } = renderHook(() =>
      useDropdownPosition({
        triggerRef,
        isOpen: true,
        offset: 4,
        maxHeight: 300,
      })
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.placement).toBe("bottom");
    // Should be positioned just below the trigger (140 + 4 = 144)
    expect(result.current?.top).toBe(144);
  });

  it("should calculate position for top placement without listboxRef", () => {
    const trigger = document.createElement("div");
    // Mock trigger position near bottom of viewport (little space below)
    trigger.getBoundingClientRect = jest.fn(() => ({
      top: 850,
      left: 50,
      right: 250,
      bottom: 890,
      width: 200,
      height: 40,
      x: 50,
      y: 850,
      toJSON: () => ({}),
    }));

    const triggerRef = { current: trigger };
    const { result } = renderHook(() =>
      useDropdownPosition({
        triggerRef,
        isOpen: true,
        offset: 4,
        maxHeight: 300,
      })
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.placement).toBe("top");
    // When no listboxRef, should use actualMaxHeight for calculation
    // Available space above = 850 - 4 = 846
    // actualMaxHeight = min(300, 846 - 20) = 300
    // top = 850 - 300 - 4 = 546
    expect(result.current?.top).toBe(546);
  });

  it("should use actual listbox height for top placement when listboxRef is provided", () => {
    const trigger = document.createElement("div");
    // Mock trigger position near bottom of viewport
    trigger.getBoundingClientRect = jest.fn(() => ({
      top: 850,
      left: 50,
      right: 250,
      bottom: 890,
      width: 200,
      height: 40,
      x: 50,
      y: 850,
      toJSON: () => ({}),
    }));

    const listbox = document.createElement("ul");
    // Mock listbox with smaller actual height (120px instead of maxHeight 300px)
    listbox.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      right: 200,
      bottom: 120,
      width: 200,
      height: 120, // Actual rendered height is much smaller than maxHeight
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));

    const triggerRef = { current: trigger };
    const listboxRef = { current: listbox };
    
    const { result } = renderHook(() =>
      useDropdownPosition({
        triggerRef,
        listboxRef,
        isOpen: true,
        offset: 4,
        maxHeight: 300,
      })
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.placement).toBe("top");
    // With listboxRef, should use actual height (120px) instead of maxHeight (300px)
    // top = 850 - 120 - 4 = 726 (much closer to trigger than without listboxRef)
    expect(result.current?.top).toBe(726);
  });

  it("should cap dropdown height at actualMaxHeight even when listbox is taller", () => {
    const trigger = document.createElement("div");
    // Mock trigger position near bottom of viewport with very little space
    trigger.getBoundingClientRect = jest.fn(() => ({
      top: 900,
      left: 50,
      right: 250,
      bottom: 940,
      width: 200,
      height: 40,
      x: 50,
      y: 900,
      toJSON: () => ({}),
    }));

    const listbox = document.createElement("ul");
    // Mock listbox with height that would exceed available space
    listbox.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      right: 200,
      bottom: 500,
      width: 200,
      height: 500, // Taller than available space
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));

    const triggerRef = { current: trigger };
    const listboxRef = { current: listbox };
    
    const { result } = renderHook(() =>
      useDropdownPosition({
        triggerRef,
        isOpen: true,
        listboxRef,
        offset: 4,
        maxHeight: 300,
      })
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.placement).toBe("top");
    // Available space = 900 - 4 = 896
    // actualMaxHeight = min(300, 896 - 20) = 300
    // Should use actualMaxHeight (300) not listbox height (500)
    // maxHeight in result should be 300
    expect(result.current?.maxHeight).toBe(300);
  });

  it("should match trigger width when matchWidth is true", () => {
    const trigger = document.createElement("div");
    trigger.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      left: 50,
      right: 350,
      bottom: 140,
      width: 300,
      height: 40,
      x: 50,
      y: 100,
      toJSON: () => ({}),
    }));

    const triggerRef = { current: trigger };
    const { result } = renderHook(() =>
      useDropdownPosition({
        triggerRef,
        isOpen: true,
        matchWidth: true,
      })
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.width).toBe(300);
  });

  it("should respect viewport padding", () => {
    const trigger = document.createElement("div");
    // Mock trigger at edge of viewport
    trigger.getBoundingClientRect = jest.fn(() => ({
      top: 2,
      left: 2,
      right: 202,
      bottom: 42,
      width: 200,
      height: 40,
      x: 2,
      y: 2,
      toJSON: () => ({}),
    }));

    const triggerRef = { current: trigger };
    const { result } = renderHook(() =>
      useDropdownPosition({
        triggerRef,
        isOpen: true,
        offset: 4,
        maxHeight: 300,
      })
    );

    expect(result.current).not.toBeNull();
    // Top should be at least VIEWPORT_PADDING (8px)
    expect(result.current?.top).toBeGreaterThanOrEqual(8);
  });
});
