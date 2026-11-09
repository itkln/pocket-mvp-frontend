"use client";

import { SlidersHorizontal } from "lucide-react";
import { useI18n } from "../i18n";

type FilterOption = { value: string; label: string; active: boolean };

export function CategoryFilterStrip({
  options,
  filtersActive,
  ariaLabel,
  onSelect,
  onOpenFilters,
}: {
  options: FilterOption[];
  filtersActive: boolean;
  ariaLabel: string;
  onSelect: (value: string) => void;
  onOpenFilters: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="cuisine-section spots-category-filters" aria-label={ariaLabel}>
      <div className="cuisine-strip">
        <button
          type="button"
          className={`spots-filter-trigger ${filtersActive ? "active" : ""}`}
          aria-label={t("Фильтры")}
          aria-haspopup="dialog"
          onClick={onOpenFilters}
        >
          <SlidersHorizontal size={17} />
        </button>
        {options.map(({ value, label, active }) => (
          <button
            type="button"
            key={value}
            aria-pressed={active}
            className={active ? "active" : ""}
            onClick={() => onSelect(value)}
          >
            <strong>{t(label)}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
