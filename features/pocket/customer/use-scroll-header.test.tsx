import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useScrollHeader } from "./use-scroll-header";

afterEach(() => vi.restoreAllMocks());

it("hides downwards, ignores jitter, reveals upwards and clamps overscroll", () => {
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(2000);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
  const offset = vi.spyOn(window, "scrollY", "get").mockReturnValue(0);
  const { result } = renderHook(() => useScrollHeader());
  const scroll = (y: number) =>
    act(() => {
      offset.mockReturnValue(y);
      window.dispatchEvent(new Event("scroll"));
    });
  scroll(100);
  expect(result.current).toBe(true);
  scroll(97);
  expect(result.current).toBe(true);
  scroll(85);
  expect(result.current).toBe(false);
  scroll(1200);
  expect(result.current).toBe(true);
  scroll(1230);
  scroll(1200);
  expect(result.current).toBe(true);
  scroll(-20);
  expect(result.current).toBe(false);
});
