"use client";

import {
  CalendarDays,
  Minus,
  Plus,
  ShoppingBag,
  UserRound,
  UsersRound,
  Utensils,
} from "lucide-react";
import type { PublicMenuItem } from "../../../../lib/public-catalog-api";
import { useI18n } from "../../i18n";
import type { DesktopBookingSummary } from "../desktop-booking-flow";

// Side cart of the desktop preorder menu: the reservation being made and the chosen dishes.
export function PreorderCart({
  bookingSummary,
  quantities,
  selectedItems,
  unavailableItems,
  allMenuItems,
  count,
  totalLabel,
  onQuantityChange,
  onClear,
  onCheckout,
  onBookWithoutPreorder,
}: {
  bookingSummary: DesktopBookingSummary | null;
  quantities: Record<string, number>;
  selectedItems: PublicMenuItem[];
  // Dishes still in the cart that are no longer offered for preorder: [id, quantity].
  unavailableItems: [string, number][];
  allMenuItems: PublicMenuItem[];
  count: number;
  totalLabel: string;
  onQuantityChange: (id: string, delta: number) => void;
  onClear: () => void;
  onCheckout: () => void;
  onBookWithoutPreorder: () => void;
}) {
  const { locale, t } = useI18n();
  return (
    <aside className="venue-preorder-cart" aria-label={t("Предзаказ")}>
      <header>
        <h2>{t("Предзаказ")}</h2>
        {count > 0 && (
          <button type="button" onClick={onClear}>
            {t("Очистить")}
          </button>
        )}
      </header>
      <div className="venue-preorder-cart-body">
        {bookingSummary && (
          <section className="venue-preorder-reservation-summary" aria-label={t("Бронирование")}>
            <h3>{t("Бронирование")}</h3>
            <div>
              <CalendarDays size={17} aria-hidden="true" />
              <span>
                {bookingSummary.dateLabel} · {bookingSummary.time}
              </span>
            </div>
            <div>
              <UsersRound size={17} aria-hidden="true" />
              <span>{t("Гостей: {count}", { count: bookingSummary.guests })}</span>
            </div>
            <div>
              <UserRound size={17} aria-hidden="true" />
              <span>
                {bookingSummary.name}
                <small>
                  {bookingSummary.phone}
                  {bookingSummary.email && <> · {bookingSummary.email}</>}
                </small>
              </span>
            </div>
            {bookingSummary.comment && <p>{bookingSummary.comment}</p>}
          </section>
        )}
        {count > 0 ? (
          <div className="venue-preorder-cart-items">
            {selectedItems.map((item) => (
              <article key={item.id}>
                <div
                  className="venue-preorder-cart-image"
                  style={
                    item.image_url
                      ? { backgroundImage: `url(${JSON.stringify(item.image_url)})` }
                      : undefined
                  }
                >
                  {!item.image_url && <Utensils size={20} aria-hidden="true" />}
                </div>
                <div className="venue-preorder-cart-copy">
                  <strong>{item.name}</strong>
                  <span>
                    {new Intl.NumberFormat(locale, {
                      style: "currency",
                      currency: item.currency,
                    }).format((item.price_minor * quantities[item.id]) / 100)}
                  </span>
                </div>
                <div className="venue-preorder-cart-quantity">
                  <button
                    type="button"
                    aria-label={`${t("Убрать")} ${item.name}`}
                    onClick={() => onQuantityChange(item.id, -1)}
                  >
                    <Minus size={16} />
                  </button>
                  <b>{quantities[item.id]}</b>
                  <button
                    type="button"
                    aria-label={`${t("Добавить")} ${item.name}`}
                    disabled={quantities[item.id] >= 30}
                    onClick={() => onQuantityChange(item.id, 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </article>
            ))}
            {unavailableItems.map(([id, quantity]) => (
              <article key={id}>
                <div className="venue-preorder-cart-image">
                  <Utensils size={20} aria-hidden="true" />
                </div>
                <div className="venue-preorder-cart-copy">
                  <strong>
                    {allMenuItems.find((item) => item.id === id)?.name ?? t("Блюдо недоступно")}
                  </strong>
                  <span>
                    {t("Блюдо недоступно")} · {quantity}
                  </span>
                </div>
                <button type="button" onClick={() => onQuantityChange(id, -quantity)}>
                  {t("Убрать")}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="venue-preorder-cart-empty">
            <ShoppingBag size={46} aria-hidden="true" />
            <h3>{t("В предзаказе пока пусто")}</h3>
            <p>{t("Добавьте блюда из меню")}</p>
          </div>
        )}
      </div>
      <div className="venue-preorder-cart-footer">
        {count > 0 ? (
          <button
            type="button"
            disabled={selectedItems.length !== Object.keys(quantities).length}
            onClick={onCheckout}
          >
            <span>{t("Продолжить к оплате")}</span>
            <strong>{totalLabel}</strong>
          </button>
        ) : (
          <button
            type="button"
            className="venue-preorder-book-without"
            onClick={onBookWithoutPreorder}
          >
            <span>{t("Забронировать без предзаказа")}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
