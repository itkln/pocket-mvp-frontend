"use client";

import type { Ref } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { TableOrder } from "../../../../lib/table-orders-api";
import { localeTags, useI18n } from "../../i18n";
import { TipBreakdown } from "../tip-picker";

export const statusLabels: Record<string, string> = {
  new: "Заказ отправлен",
  accepted: "Заказ принят",
  preparing: "Готовится",
  ready: "Готов",
  served: "Подано",
  completed: "Завершен",
  cancelled: "Отменен",
};

export function TableOrderReceipt({
  order,
  titleRef,
}: {
  order: TableOrder;
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  const { locale, t } = useI18n();
  const money = (amount: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: order.currency }).format(
      amount / 100,
    );
  return (
    <section className="venue-table-order-result" aria-label={t("Чек заказа")}>
      <div
        className={`venue-table-receipt-status ${order.status === "cancelled" ? "cancelled" : ""}`}
        role="status"
      >
        {order.status === "cancelled" ? (
          <X size={24} aria-hidden="true" />
        ) : (
          <CheckCircle2 size={28} aria-hidden="true" />
        )}
        <h3 ref={titleRef} tabIndex={-1}>
          {t(statusLabels[order.status] ?? "Заказ отправлен")} №{order.number}
        </h3>
        {order.status === "new" && <p>{t("Ваш заказ отправлен в обработку")}</p>}
      </div>
      <div className="venue-table-receipt-meta">
        <span>{t("Стол {number}", { number: order.table_identifier })}</span>
        <time dateTime={order.created_at}>
          {new Intl.DateTimeFormat(localeTags[locale], {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(order.created_at))}
        </time>
      </div>
      <ul>
        {order.items.map((item, index) => (
          <li key={index}>
            <div>
              <span>{item.name}</span>
              <small>
                {item.quantity} × {money(item.unit_price_minor)}
              </small>
            </div>
            <strong>{money(item.unit_price_minor * item.quantity)}</strong>
          </li>
        ))}
      </ul>
      <TipBreakdown
        subtotal={
          order.subtotal_minor ??
          order.items.reduce((sum, item) => sum + item.unit_price_minor * item.quantity, 0)
        }
        tip={order.tip_minor ?? 0}
        currency={order.currency}
      />
      <div className="venue-table-receipt-total">
        <span>{t("Итого")}</span>
        <strong>{money(order.total_minor)}</strong>
      </div>
      <p className="venue-table-receipt-payment">{t("Оплата в заведении")}</p>
      {order.notes && (
        <div className="venue-table-order-result-notes">
          <strong>{t("Комментарий к заказу")}</strong>
          <p>{order.notes}</p>
        </div>
      )}
    </section>
  );
}
