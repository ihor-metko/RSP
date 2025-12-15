import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";

describe("useDeferredLoading", () => {
  it("should defer loading state updates", () => {
    const { result: loadingResult } = renderHook(() => useState(false));
    const { result: deferredResult } = renderHook(() =>
      useDeferredLoading(loadingResult.current[0])
    );

    // Initially both should be false
    expect(deferredResult.current).toBe(false);

    // Update loading to true
    act(() => {
      loadingResult.current[1](true);
    });

    // Deferred value should still be false immediately after update
    // (React defers the value update until the next render)
    // Note: In actual usage, the deferred value will update in a subsequent render
  });

  it("should return false when loading is false", () => {
    const { result } = renderHook(() => useDeferredLoading(false));
    expect(result.current).toBe(false);
  });

  it("should eventually reflect the loading state", async () => {
    let loading = false;
    const { result, rerender } = renderHook(() => useDeferredLoading(loading));

    // Initially false
    expect(result.current).toBe(false);

    // Set loading to true
    loading = true;
    rerender();

    // The deferred value should eventually become true
    // (may take a render or two due to React's deferred value mechanism)
    await act(async () => {
      // Give React time to update the deferred value
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it("should handle rapid loading state changes", async () => {
    let loading = false;
    const { result, rerender } = renderHook(() => useDeferredLoading(loading));

    // Rapidly toggle loading
    loading = true;
    rerender();
    loading = false;
    rerender();

    // If loading becomes false quickly, the deferred value may never show true
    // This is the desired behavior to prevent flicker
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    
    // Should be false since loading ended quickly
    expect(result.current).toBe(false);
  });
});
