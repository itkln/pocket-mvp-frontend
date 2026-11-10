"use client";

import { nutritionFields, type MenuNutrition } from "../../lib/menu-nutrition";
import { useI18n } from "./i18n";

export function MenuNutritionFields({ item = {} }: { item?: MenuNutrition }) {
  const { t } = useI18n();
  return (
    <fieldset className="menu-nutrition-fields wide">
      <legend>{t("Вес и пищевая ценность")}</legend>
      <p>{t("КБЖУ на 100 г. Необязательные поля.")}</p>
      <div className="form-grid">
        {nutritionFields.map((field) => (
          <label
            className={`field ${field.name === "portion_weight_g" ? "wide" : ""}`}
            key={field.name}
          >
            <span>{t(field.label)}</span>
            <input
              name={field.name}
              type="number"
              inputMode={field.step === 1 ? "numeric" : "decimal"}
              min={field.min}
              max={field.max}
              step={field.step}
              defaultValue={item[field.name] ?? ""}
              placeholder="—"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
