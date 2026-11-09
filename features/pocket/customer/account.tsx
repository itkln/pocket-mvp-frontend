"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ShoppingBag } from "lucide-react";
import { listCustomerPreorders, type CustomerPreorder } from "../../../lib/preorders-api";
import { PageHeader, StatusPill } from "../ui";
import { localeTags, useI18n } from "../i18n";

const statusLabels: Record<string, string> = {
  new: "Новый",
  accepted: "Принят",
  preparing: "Готовится",
  ready: "Готов",
  served: "Подан",
  completed: "Завершён",
  cancelled: "Отменён",
};

export function HistoryScreen() {
  const { locale, t } = useI18n();
  const [preorders, setPreorders] = useState<CustomerPreorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listCustomerPreorders(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setPreorders(items);
        setLoading(false);
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setError(true);
        }
      });
    return () => controller.abort();
  }, [retry]);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(value),
    );
  const formatMoney = (minor: number, currency: string) =>
    new Intl.NumberFormat(localeTags[locale], { style: "currency", currency }).format(minor / 100);

  return (
    <div className="history-screen">
      <PageHeader
        title={t("Мои предзаказы")}
        subtitle={t("Предзаказы, добавленные к бронированию.")}
      />
      {loading ? (
        <div className="spots-catalog-status" role="status">
          {t("Загружаем предзаказы...")}
        </div>
      ) : error ? (
        <div className="spots-catalog-status" role="alert">
          {t("Не удалось загрузить предзаказы")}
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setRetry((value) => value + 1);
            }}
          >
            {t("Повторить")}
          </button>
        </div>
      ) : preorders.length ? (
        <div className="history-list">
          {preorders.map((preorder) => (
            <article className="panel customer-preorder" key={preorder.id}>
              <div className="customer-preorder-heading">
                <span className="customer-preorder-icon">
                  <ShoppingBag size={23} />
                </span>
                <div>
                  <small>{formatDate(preorder.created_at)}</small>
                  <h3>{preorder.venue_name}</h3>
                  <p>{t("Предзаказ №{number}", { number: preorder.number })}</p>
                </div>
                <StatusPill status={t(statusLabels[preorder.status] ?? preorder.status)} />
              </div>
              <p className="customer-preorder-reservation">
                <CalendarDays size={16} />
                {t("Бронь №{code}", { code: preorder.reservation_code })} ·{" "}
                {formatDate(preorder.reservation_starts_at)}
              </p>
              <div className="customer-preorder-items">
                {(preorder.items ?? []).map((item, index) => (
                  <span key={`${item.name}-${index}`}>
                    {item.name} × {item.quantity}
                  </span>
                ))}
              </div>
              <strong>{formatMoney(preorder.total_minor, preorder.currency)}</strong>
            </article>
          ))}
        </div>
      ) : (
        <div className="spots-search-empty">
          <ShoppingBag size={30} />
          <strong>{t("Предзаказов пока нет")}</strong>
          <p>{t("Предзаказы к вашим бронированиям появятся здесь.")}</p>
        </div>
      )}
    </div>
  );
}
