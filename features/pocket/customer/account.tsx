"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { listCustomerOrders, listGuestOrders, type CustomerOrder } from "../../../lib/public-orders-api";
import { PageHeader, StatusPill } from "../ui";
import { useI18n } from "../i18n";

const statusLabels: Record<string, string> = {
  new: "Новый", accepted: "Принят", preparing: "Готовится", ready: "Готов",
  served: "Подан", completed: "Завершён", cancelled: "Отменён",
};

export function HistoryScreen({ signedIn }: { signedIn: boolean }) {
  const { locale, t } = useI18n();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    (signedIn ? listCustomerOrders() : listGuestOrders()).then((items) => {
      if (!alive) return;
      setOrders(items.sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setLoading(false);
      setError(false);
    }).catch(() => { if (alive) { setLoading(false); setError(true); } });
    return () => { alive = false; };
  }, [retry, signedIn]);

  return <div className="history-screen"><PageHeader title="Мои заказы" subtitle="История заказов и предзаказов." />
    {loading ? <div className="spots-catalog-status" role="status">Загружаем заказы...</div>
      : error ? <div className="spots-catalog-status" role="alert">Не удалось загрузить заказы. <button type="button" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Повторить</button></div>
        : orders.length ? <div className="history-list">{orders.map((order) => <article className="panel public-history-order" key={order.id}>
          <div className="public-history-order-heading"><span className="public-history-icon"><ShoppingBag size={23} /></span><div><small>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at))} · {order.channel === "preorder" ? "Предзаказ" : "Онлайн"}</small><h3>{order.venue_name || "Заведение"}</h3><p>{t("Заказ №{number}", { number: order.number })}{order.reservation_starts_at && <> · {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.reservation_starts_at))}</>}</p></div><StatusPill status={statusLabels[order.status] ?? order.status} /></div>
          <div className="public-history-items">{order.items.map((item, index) => <span key={`${item.menu_item_id}-${index}`}>{item.name} × {item.quantity}</span>)}</div>
          <strong>{new Intl.NumberFormat(locale, { style: "currency", currency: order.currency }).format(order.total_minor / 100)}</strong>
        </article>)}</div>
          : <div className="spots-search-empty"><ShoppingBag size={30} /><strong>Заказов пока нет</strong><p>Оформленные заказы появятся здесь.</p></div>}
  </div>;
}
