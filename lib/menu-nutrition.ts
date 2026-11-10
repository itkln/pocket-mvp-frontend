export type MenuNutrition = {
  portion_weight_g?: number | null;
  energy_kcal?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  carbs_g?: number | null;
};

export const nutritionFields = [
  { name: "portion_weight_g", label: "Вес порции, г", min: 1, max: 2147483647, step: 1 },
  { name: "energy_kcal", label: "Калории, ккал", min: 0, max: 999999.99, step: 0.01 },
  { name: "protein_g", label: "Белки, г", min: 0, max: 100, step: 0.01 },
  { name: "fat_g", label: "Жиры, г", min: 0, max: 100, step: 0.01 },
  { name: "carbs_g", label: "Углеводы, г", min: 0, max: 100, step: 0.01 },
] as const;

export function readMenuNutrition(data: FormData): MenuNutrition {
  const result: MenuNutrition = {};
  for (const field of nutritionFields) {
    const raw = String(data.get(field.name) ?? "").trim();
    const value = raw === "" ? null : Number(raw);
    if (
      value !== null &&
      (!Number.isFinite(value) ||
        value < field.min ||
        value > field.max ||
        (field.step === 1 && !Number.isInteger(value)))
    ) {
      throw new RangeError(`Invalid ${field.name}`);
    }
    result[field.name] = value;
  }
  return result;
}

export function copyMenuNutrition(item: MenuNutrition): MenuNutrition {
  return Object.fromEntries(nutritionFields.map(({ name }) => [name, item[name] ?? null]));
}
