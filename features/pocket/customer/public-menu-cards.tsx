"use client";

import { Minus, Plus, Utensils } from "lucide-react";
import type { PublicMenuItem } from "../../../lib/public-catalog-api";
import { useI18n } from "../i18n";

export function PublicMenuCards({
  items,
  quantities,
  onQuantityChange,
  onOpenDetails,
  view = "grid",
}: {
  items: PublicMenuItem[];
  view?: "grid" | "list";
  quantities?: Record<string, number>;
  onQuantityChange?: (id: string, delta: number) => void;
  onOpenDetails?: (item: PublicMenuItem, trigger: HTMLButtonElement) => void;
}) {
  const { locale, t } = useI18n();
  return (
    <div className={`venue-public-menu-grid ${view === "list" ? "venue-public-menu-list" : ""}`}>
      {items.map((item) => {
        const quantity = quantities?.[item.id] ?? 0;
        return (
          <article className="venue-public-menu-card" key={item.id}>
            <div
              className="venue-public-menu-photo"
              style={
                item.image_url
                  ? { backgroundImage: `url(${JSON.stringify(item.image_url)})` }
                  : undefined
              }
              role={item.image_url && !onQuantityChange ? "img" : undefined}
              aria-label={item.image_url && !onQuantityChange ? item.name : undefined}
            >
              {item.image_url && onQuantityChange && (
                <span className="venue-public-menu-image-label" role="img" aria-label={item.name} />
              )}
              {!item.image_url && <Utensils size={34} aria-hidden="true" />}
              {onQuantityChange && (
                <div className={`venue-preorder-card-control ${quantity ? "has-items" : ""}`}>
                  {quantity > 0 && (
                    <>
                      <button
                        type="button"
                        aria-label={`${t("Убрать")} ${item.name}`}
                        onClick={() => onQuantityChange(item.id, -1)}
                      >
                        <Minus size={18} />
                      </button>
                      <b aria-label={`${item.name}: ${quantity}`}>{quantity}</b>
                    </>
                  )}
                  <button
                    type="button"
                    aria-label={`${t("Добавить")} ${item.name}`}
                    disabled={quantity >= 30}
                    onClick={() => onQuantityChange(item.id, 1)}
                  >
                    <Plus size={quantity ? 18 : 20} />
                  </button>
                </div>
              )}
            </div>
            <div className="venue-public-menu-copy">
              <div className="venue-public-menu-price">
                <strong>
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: item.currency,
                  }).format(item.price_minor / 100)}
                </strong>
                {item.portion_weight_g != null && (
                  <small>
                    {item.portion_weight_g} {t("г")}
                  </small>
                )}
              </div>
              <h3>{item.name}</h3>
              {item.description && <p>{item.description}</p>}
            </div>
            {onOpenDetails && (
              <button
                type="button"
                className="venue-preorder-product-open"
                aria-label={`${t("Подробнее о блюде")}: ${item.name}`}
                onClick={(event) => onOpenDetails(item, event.currentTarget)}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}
