import { describe, expect, it } from "vitest";
import { maxOrderTotal, restoredTip, tipAmount, tipSelection } from "./gratuity";

describe("optional tips in minor units", () => {
  it("rounds once per order and supports exact custom amounts in either decimal format", () => {
    expect(tipAmount(1090, { mode: "percent", percent: 5 })).toBe(55);
    expect(tipAmount(30, { mode: "percent", percent: 5 })).toBe(2);
    expect(tipAmount(1090, { mode: "none" })).toBe(0);
    for (const value of ["1,23", "1.23", " 1.23 "])
      expect(tipSelection({ mode: "custom", value })).toEqual({
        mode: "custom",
        amount_minor: 123,
      });
    expect(tipSelection({ mode: "custom", value: "0" })).toEqual({
      mode: "custom",
      amount_minor: 0,
    });
  });
  it("rejects invalid amounts, fractional percentages and overflowing totals", () => {
    for (const value of ["", "-1", "1e3", "2.345", "NaN", "1,2.3", "20000000.01"])
      expect(tipSelection({ mode: "custom", value })).toBeNull();
    expect(tipAmount(maxOrderTotal, { mode: "custom", amount_minor: 1 })).toBeNull();
    expect(tipAmount(0, { mode: "custom", amount_minor: 1 })).toBeNull();
    for (const percent of [-1, 101, 5.5])
      expect(tipAmount(1000, { mode: "percent", percent })).toBeNull();
  });
  it("restores legacy drafts with no tip and checks stored selections", () => {
    expect(restoredTip(undefined)).toEqual({ mode: "none" });
    expect(restoredTip({ mode: "percent", percent: -20 })).toEqual({ mode: "none" });
    expect(restoredTip({ mode: "custom", value: "1,50" })).toEqual({
      mode: "custom",
      value: "1,50",
    });
  });
});
