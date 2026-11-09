import { describe, expect, it } from "vitest";
import { copyMenuNutrition, readMenuNutrition } from "./menu-nutrition";

describe("menu nutrition", () => {
  it("keeps an explicit zero and clears empty fields", () => {
    const data = new FormData();
    data.set("portion_weight_g", "250");
    data.set("energy_kcal", "196.5");
    data.set("fat_g", "0");
    expect(readMenuNutrition(data)).toEqual({
      portion_weight_g: 250,
      energy_kcal: 196.5,
      protein_g: null,
      fat_g: 0,
      carbs_g: null,
    });
    expect(copyMenuNutrition({ fat_g: 0 })).toMatchObject({ fat_g: 0, energy_kcal: null });
  });

  it.each([
    ["protein_g", "101"],
    ["fat_g", "-1"],
    ["energy_kcal", "NaN"],
    ["carbs_g", "Infinity"],
    ["portion_weight_g", "0"],
    ["portion_weight_g", "1.5"],
  ])("rejects invalid %s=%s", (key, value) => {
    const data = new FormData();
    data.set(key, value);
    expect(() => readMenuNutrition(data)).toThrow(RangeError);
  });
});
