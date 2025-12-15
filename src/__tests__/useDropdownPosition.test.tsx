/**
 * Test for useDropdownPosition hook
 * Verifies dropdown positioning using @floating-ui/react
 */

import { renderHook } from "@testing-library/react";
import { useDropdownPosition } from "@/hooks/useDropdownPosition";

// Mock @floating-ui/react
jest.mock("@floating-ui/react", () => ({
  useFloating: jest.fn(() => ({
    x: 50,
    y: 144,
    refs: {
      setReference: jest.fn(),
      setFloating: jest.fn(),
    },
    placement: "bottom-start",
  })),
  offset: jest.fn((value) => value),
  flip: jest.fn((config) => config),
  shift: jest.fn((config) => config),
  size: jest.fn((config) => config),
  autoUpdate: jest.fn(),
}));

describe("useDropdownPosition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("should return position data when isOpen is true", () => {
    const trigger = document.createElement("div");
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
    expect(result.current).toEqual({
      top: 144,
      left: 50,
      width: 200,
      maxHeight: 300,
      placement: "bottom",
    });
  });

  it("should detect top placement from floating placement", () => {
    const { useFloating } = require("@floating-ui/react");
    useFloating.mockReturnValueOnce({
      x: 50,
      y: 500,
      refs: {
        setReference: jest.fn(),
        setFloating: jest.fn(),
      },
      placement: "top-start",
    });

    const trigger = document.createElement("div");
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

  it("should use floating UI coordinates", () => {
    const { useFloating } = require("@floating-ui/react");
    useFloating.mockReturnValueOnce({
      x: 100,
      y: 200,
      refs: {
        setReference: jest.fn(),
        setFloating: jest.fn(),
      },
      placement: "bottom-start",
    });

    const trigger = document.createElement("div");
    trigger.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      left: 100,
      right: 300,
      bottom: 140,
      width: 200,
      height: 40,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    }));

    const triggerRef = { current: trigger };
    const { result } = renderHook(() =>
      useDropdownPosition({
        triggerRef,
        isOpen: true,
      })
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.top).toBe(200);
    expect(result.current?.left).toBe(100);
  });
});
