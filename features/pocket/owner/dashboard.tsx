"use client";

import { type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  ReceiptText,
  ShoppingBag,
  Star,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { type OwnerOrder } from "../../../lib/owner-api";
import { Button, EmptyIllustration, PageHeader, PanelTitle, StatusPill, money } from "../ui";
import { useOwnerWorkspace } from "./context";

const orderStatusLabel: Record<OwnerOrder["status"], string> = {
  new: "Новый",
  accepted: "Принят",
  preparing: "Готовится",
  ready: "Готов",
  served: "Подан",
  completed: "Завершен",
  cancelled: "Отменен",
};

export function OwnerOverview({
  ownerName,
  onNavigate,
}: {
  ownerName: string;
  onNavigate: (screen: string) => void;
}) {
  const { dashboard, orders, loading } = useOwnerWorkspace();
  const occupancy = dashboard?.total_tables
    ? Math.round((dashboard.active_tables / dashboard.total_tables) * 100)
    : 0;
  return (
    <>
      <PageHeader
        title={`Добрый день, ${ownerName}`}
        subtitle={loading ? "Обновляем показатели..." : "Актуальные данные выбранного заведения."}
        actions={
          <Button icon={Download} kind="secondary" onClick={() => window.print()}>
            Отчет
          </Button>
        }
      />
      <section className="metric-grid">
        <Metric
          label="Выручка сегодня"
          value={money((dashboard?.revenue_minor ?? 0) / 100)}
          change="Оплаченные заказы"
          icon={CircleDollarSign}
          tone="coral"
        />
        <Metric
          label="Заказы"
          value={String(dashboard?.orders_today ?? 0)}
          change={`${dashboard?.new_orders ?? 0} новых`}
          icon={ShoppingBag}
          tone="green"
        />
        <Metric
          label="Средний чек"
          value={money((dashboard?.average_order_minor ?? 0) / 100)}
          change="За сегодня"
          icon={ReceiptText}
          tone="blue"
        />
        <Metric
          label="Загрузка зала"
          value={`${occupancy}%`}
          change={`${dashboard?.active_tables ?? 0} из ${dashboard?.total_tables ?? 0}`}
          icon={Table2}
          tone="gold"
        />
      </section>
      <section className="dashboard-grid">
        <div className="panel dashboard-orders">
          <PanelTitle
            title="Последние заказы"
            subtitle="Обновляются из рабочего API"
            action={
              <Button kind="quiet" onClick={() => onNavigate("orders")}>
                Все заказы <ChevronRight size={16} />
              </Button>
            }
          />
          <OrderTable orders={orders.slice(0, 5)} />
        </div>
        <div className="panel reviews-panel">
          <PanelTitle title="Оценка гостей" subtitle="По опубликованным отзывам" />
          {dashboard?.average_rating ? (
            <div className="rating-main">
              <strong>{dashboard.average_rating.toFixed(1)}</strong>
              <div>
                <div className="stars">
                  <Star size={18} fill="currentColor" />
                </div>
                <small>Средняя оценка</small>
              </div>
            </div>
          ) : (
            <EmptyIllustration
              icon={Star}
              title="Оценок пока нет"
              text="Средняя оценка появится после первого отзыва."
            />
          )}
        </div>
      </section>
    </>
  );
}

export function Metric({
  label,
  value,
  change,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <article className="metric">
      <span className={`metric-icon ${tone}`}>
        <Icon size={20} />
      </span>
      <div className="metric-copy">
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{change}</small>
      </div>
    </article>
  );
}

export function OrderTable({ orders }: { orders: OwnerOrder[] }) {
  if (!orders.length)
    return (
      <EmptyIllustration
        icon={CheckCircle2}
        title="Заказов пока нет"
        text="Новые онлайн-заказы появятся здесь автоматически."
      />
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Заказ</th>
            <th>Источник</th>
            <th>Гость</th>
            <th>Сумма</th>
            <th>Статус</th>
            <th>Создан</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <strong>#{order.number}</strong>
                {order.reservation_code && (
                  <small className="order-reservation-code">Бронь {order.reservation_code}</small>
                )}
              </td>
              <td>
                {order.source}
                {order.reservation_starts_at && (
                  <small className="order-reservation-code">
                    {new Date(order.reservation_starts_at).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </small>
                )}
              </td>
              <td>
                {order.guest_name || "Гость"}
                {order.guest_phone && (
                  <small className="order-reservation-code">{order.guest_phone}</small>
                )}
                {order.guest_count ? (
                  <small className="order-reservation-code">Гостей: {order.guest_count}</small>
                ) : null}
                {order.items?.length ? (
                  <details className="order-preorder-items">
                    <summary>
                      Блюда ({order.items.reduce((sum, item) => sum + item.quantity, 0)})
                    </summary>
                    <ul>
                      {order.items.map((item, index) => (
                        <li key={index}>
                          {item.quantity} × {item.name} ·{" "}
                          {money((item.unit_price_minor * item.quantity) / 100)}
                        </li>
                      ))}
                    </ul>
                    {order.notes && <p className="order-notes">{order.notes}</p>}
                  </details>
                ) : null}
              </td>
              <td>
                <strong>{money(order.total_minor / 100)}</strong>
                {Boolean(order.tip_minor) && (
                  <small className="order-reservation-code">
                    Чаевые: {money(order.tip_minor! / 100)}
                  </small>
                )}
              </td>
              <td>
                <StatusPill status={orderStatusLabel[order.status]} />
              </td>
              <td>
                {new Date(order.created_at).toLocaleTimeString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OwnerAction({ children }: { children: ReactNode }) {
  return children;
}
