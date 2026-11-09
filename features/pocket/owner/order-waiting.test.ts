import { describe, it, expect } from "vitest";
import { orderWaiting, defaultOrderAlerts, textOnColor } from "./order-waiting";
import type { OwnerOrder } from "../../../lib/owner-api";
const now = Date.parse("2026-11-06T12:00:00Z");
const order = { status: "new", created_at: new Date(now).toISOString() } as OwnerOrder;
describe("kitchen waiting", () => {
  it("uses the highest reached threshold and does not reset accepted orders", () => {
    expect(orderWaiting(order, now + 9 * 60000)?.color).toBeUndefined();
    expect(orderWaiting(order, now + 10 * 60000)?.color).toBe(defaultOrderAlerts.warning_color);
    expect(orderWaiting({ ...order, status: "accepted" }, now + 20 * 60000)?.color).toBe(
      defaultOrderAlerts.critical_color,
    );
  });
  it("stops highlighting when preparation starts or order is final", () => {
    for (const status of ["preparing", "ready", "served", "completed", "cancelled"] as const)
      expect(orderWaiting({ ...order, status }, now + 3600000)).toBeNull();
  });
  it("waits until scheduled preparation and never starts before receipt", () => {
    const preorder = { ...order, reservation_starts_at: new Date(now + 3600000).toISOString() };
    expect(orderWaiting(preorder, now)).toBeNull();
    expect(orderWaiting(preorder, now + 40 * 60000)?.minutes).toBe(10);
    expect(
      orderWaiting(
        { ...preorder, created_at: new Date(now + 50 * 60000).toISOString() },
        now + 50 * 60000,
      )?.minutes,
    ).toBe(0);
  });
  it("uses receipt time and venue-specific colours", () => {
    expect(
      orderWaiting(
        { ...order, placed_at: new Date(now + 5 * 60000).toISOString() },
        now + 10 * 60000,
        { ...defaultOrderAlerts, warning_minutes: 5, warning_color: "#123456" },
      ),
    ).toEqual({ minutes: 5, color: "#123456" });
    expect(textOnColor("#000000")).toBe("#ffffff");
    expect(textOnColor("#ffffff")).toBe("#17212b");
  });
});
