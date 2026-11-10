"use client";

import { History, Utensils } from "lucide-react";
import type { TableOrder } from "../../../../lib/table-orders-api";
import { localeTags, useI18n } from "../../i18n";
import { statusLabels } from "./table-order-receipt";

export function TableHistoryList({
  orders,
  images,
  loading,
  error,
  cursor,
  money,
  onRetry,
  onOpen,
  onLoadMore,
}: {
  orders: TableOrder[];
  images: Map<string, string | undefined>;
  loading: boolean;
  error: boolean;
  cursor: string;
  money: (amount: number, currency?: string) => string;
  onRetry: () => void;
  onOpen: (id: string) => void;
  onLoadMore: () => void;
}) {
  const { locale, t } = useI18n();
  return (
    <>
      {error && (
        <p className="form-error" role="alert">
          {t("Не удалось обновить историю заказов")}{" "}
          <button type="button" disabled={loading} onClick={onRetry}>
            {t("Повторить")}
          </button>
        </p>
      )}
      {orders.length ? (
        <ul className="venue-table-history-list">
          {orders.map((entry) => (
            <li key={entry.id}>
              <button type="button" onClick={() => onOpen(entry.id)}>
                <span className="venue-table-history-copy">
                  <strong>
                    {t("Заказ")} №{entry.number}
                  </strong>
                  <time dateTime={entry.created_at}>
                    {new Intl.DateTimeFormat(localeTags[locale], {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(entry.created_at))}
                  </time>
                </span>
                <span className="venue-table-history-amount">
                  <b>{money(entry.total_minor, entry.currency)}</b>
                  <span className={`venue-table-history-status ${entry.status}`}>
                    {t(statusLabels[entry.status] ?? "Заказ отправлен")}
                  </span>
                </span>
                {entry.items.length > 0 && (
                  <span className="venue-table-history-images" aria-hidden="true">
                    {entry.items.slice(0, 4).map((item, index) => {
                      const image = item.menu_item_id ? images.get(item.menu_item_id) : undefined;
                      return (
                        <span
                          key={index}
                          className="venue-table-history-image"
                          title={item.name}
                          style={
                            image ? { backgroundImage: `url(${JSON.stringify(image)})` } : undefined
                          }
                        >
                          {!image && <Utensils size={17} />}
                        </span>
                      );
                    })}
                    {entry.items.length > 4 && (
                      <span className="venue-table-history-image venue-table-history-extra">
                        +{entry.items.length - 4}
                      </span>
                    )}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="venue-table-cart-empty">
          <History size={36} aria-hidden="true" />
          <p role="status">{t(loading ? "Загружаем заказы..." : "Вы ещё не отправили заказ")}</p>
        </div>
      )}
      {cursor && (
        <button
          type="button"
          className="button secondary venue-table-history-more"
          disabled={loading}
          onClick={onLoadMore}
        >
          {t(loading ? "Загружаем заказы..." : "Показать ещё")}
        </button>
      )}
    </>
  );
}
