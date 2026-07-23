"use client";

import { ArrowLeft, Minus, Plus, ShoppingBag, Utensils } from "lucide-react";
import type { PublicMenuItem } from "../../../../lib/public-catalog-api";
import { useI18n } from "../../i18n";
import { BookingSummary } from "../booking/booking-summary";
import { BookingProgress } from "../booking/booking-progress";
import type { DesktopBookingSummary } from "../desktop-booking-flow";

// Side cart of the desktop preorder menu: the reservation being made and the chosen dishes.
export function PreorderCart({
  bookingSummary,
  venueName,
  venueAddress,
  onBack,
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
  venueName: string;
  venueAddress: string;
  onBack: () => void;
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
        <button
          className="venue-preorder-back"
          type="button"
          aria-label={t("Назад")}
          onClick={onBack}
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h2>{t("Предзаказ блюд")}</h2>
      </header>
      <BookingProgress step={2} />
      <div className="venue-preorder-cart-body">
        {bookingSummary && (
          <BookingSummary
            venueName={venueName}
            venueAddress={venueAddress}
            {...bookingSummary}
            onEdit={onBack}
          />
        )}
        <div className="venue-preorder-cart-heading">
          <h3>{t("Ваш предзаказ")}</h3>
          {count > 0 && (
            <button type="button" onClick={onClear}>
              {t("Очистить")}
            </button>
          )}
        </div>
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
            <ShoppingBag size={28} aria-hidden="true" />
            <strong>{t("В предзаказе пока пусто")}</strong>
            <p>{t("Добавьте блюда из меню или забронируйте без предзаказа")}</p>
          </div>
        )}
        {count > 0 && (
          <div className="desktop-booking-total">
            <span>{t("Итого к оплате")}</span>
            <strong>{totalLabel}</strong>
          </div>
        )}
        <div className="venue-preorder-cart-footer">
          {count > 0 ? (
            <button
              type="button"
              disabled={selectedItems.length !== Object.keys(quantities).length}
              onClick={onCheckout}
            >
              <span>{t("Продолжить к подтверждению")}</span>
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
      </div>
    </aside>
  );
}
