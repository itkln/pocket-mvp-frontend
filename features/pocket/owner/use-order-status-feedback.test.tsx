import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { OwnerOrder } from "../../../lib/owner-api";
import { useOrderStatusFeedback } from "./use-order-status-feedback";
const order: OwnerOrder = {
  id: "a",
  number: 1,
  channel: "dine_in",
  source: "Table 1",
  status: "new",
  total_minor: 0,
  currency: "EUR",
  created_at: "2026-11-02T00:00:00Z",
};
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
it("does not report the first load or new arrivals as transitions", () => {
  const view = renderHook(({ orders }) => useOrderStatusFeedback(orders), {
    initialProps: { orders: [] as OwnerOrder[] },
  });
  view.rerender({ orders: [order] });
  expect(view.result.current).toEqual({});
  view.rerender({ orders: [{ ...order }, { ...order, id: "b", status: "preparing" }] });
  expect(view.result.current).toEqual({});
});
it("ignores repeated snapshots and expires feedback after five seconds", () => {
  const view = renderHook(({ orders }) => useOrderStatusFeedback(orders), {
    initialProps: { orders: [order] },
  });
  view.rerender({ orders: [{ ...order, status: "preparing" }] });
  const change = view.result.current.a;
  expect(change).toMatchObject({ from: "new", to: "preparing" });
  act(() => vi.advanceTimersByTime(4000));
  view.rerender({ orders: [{ ...order, status: "preparing" }] });
  expect(view.result.current.a).toEqual(change);
  act(() => vi.advanceTimersByTime(1000));
  expect(view.result.current).toEqual({});
});
it("restarts feedback for rapid transitions without allowing the older timer to clear it", () => {
  const view = renderHook(({ orders }) => useOrderStatusFeedback(orders), {
    initialProps: { orders: [order] },
  });
  view.rerender({ orders: [{ ...order, status: "preparing" }] });
  const first = view.result.current.a.version;
  act(() => vi.advanceTimersByTime(4000));
  view.rerender({ orders: [{ ...order, status: "served" }] });
  expect(view.result.current.a).toMatchObject({ from: "preparing", to: "served" });
  expect(view.result.current.a.version).toBeGreaterThan(first);
  act(() => vi.advanceTimersByTime(1000));
  expect(view.result.current.a.to).toBe("served");
  act(() => vi.advanceTimersByTime(4000));
  expect(view.result.current).toEqual({});
});
it("cleans timers when leaving the screen", () => {
  const view = renderHook(({ orders }) => useOrderStatusFeedback(orders), {
    initialProps: { orders: [order] },
  });
  view.rerender({ orders: [{ ...order, status: "preparing" }] });
  expect(vi.getTimerCount()).toBe(1);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
