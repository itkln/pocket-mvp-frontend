"use client";

import { Minus, Plus, Utensils } from "lucide-react";
import { repeatedQuantities, type RepeatPlan } from "../../../../lib/table-order-history";
import { useI18n } from "../../i18n";

// Review step of "repeat order": current prices, quantities and what cannot be repeated.
export function RepeatReview({
  repeatPlan,
  images,
  cartQuantities,
  money,
  onQuantityChange,
}: {
  repeatPlan: RepeatPlan;
  images: Map<string, string | undefined>;
  cartQuantities: Record<string, number>;
  money: (amount: number, currency?: string) => string;
  onQuantityChange: (id: string, delta: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="venue-table-repeat-review">
      {repeatPlan.lines.map((line) => {
        const image = images.get(line.id);
        return (
          <article key={line.id}>
            <div
              className="venue-table-cart-image"
              role="img"
              aria-label={line.name}
              style={image ? { backgroundImage: `url(${JSON.stringify(image)})` } : undefined}
            >
              {!image && <Utensils size={20} aria-hidden="true" />}
            </div>
            <div className="venue-table-repeat-copy">
              <strong>{line.name}</strong>
              <b className="venue-table-repeat-price">
                {money(line.price * line.quantity, repeatPlan.currency)}
              </b>
              {line.changed && (
                <small>
                  {t("Цена изменилась")}: {money(line.previousPrice, repeatPlan.order.currency)} →{" "}
                  {money(line.price, repeatPlan.currency)}
                </small>
              )}
            </div>
            <div className="venue-preorder-cart-quantity">
              <button
                type="button"
                aria-label={`${t("Убрать")} ${line.name}`}
                onClick={() => onQuantityChange(line.id, -1)}
              >
                <Minus size={16} />
              </button>
              <b aria-label={`${line.name}: ${line.quantity}`} aria-live="polite">
                {line.quantity}
              </b>
              <button
                type="button"
                aria-label={`${t("Добавить")} ${line.name}`}
                disabled={line.quantity >= 30}
                onClick={() => onQuantityChange(line.id, 1)}
              >
                <Plus size={16} />
              </button>
            </div>
          </article>
        );
      })}
      {repeatPlan.unavailable.length > 0 && (
        <div className="venue-table-repeat-notice" role="status">
          <strong>{t("Не будут добавлены в корзину")}</strong>
          {repeatPlan.unavailable.map((line, index) => (
            <p key={index}>
              {line.name} —{" "}
              {t(
                line.reason === "options"
                  ? "Варианты блюда нужно выбрать заново"
                  : "Блюдо недоступно",
              )}
            </p>
          ))}
        </div>
      )}
      {(repeatPlan.quantityLimited ||
        repeatPlan.lines.some((line) => (cartQuantities[line.id] ?? 0) + line.quantity > 30)) && (
        <p className="venue-table-repeat-notice">
          {t("Не больше 30 порций одного блюда. Количество будет уменьшено до 30.")}
        </p>
      )}
      {repeatPlan.order.currency !== repeatPlan.currency && (
        <p className="venue-table-repeat-notice">
          {t("Валюта изменилась")}: {repeatPlan.order.currency} → {repeatPlan.currency}
        </p>
      )}
      {!repeatPlan.lines.length && (
        <div className="venue-table-cart-empty">
          <Utensils size={32} aria-hidden="true" />
          <p role="status">{t("Нет блюд для повтора")}</p>
        </div>
      )}
      {Object.keys(repeatedQuantities(repeatPlan, cartQuantities, true)).length > 100 && (
        <p className="venue-table-repeat-notice">
          {t(
            "В корзине не может быть больше 100 разных блюд. Замените корзину или уберите лишние позиции.",
          )}
        </p>
      )}
    </div>
  );
}
