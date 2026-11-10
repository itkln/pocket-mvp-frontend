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
import { useI18n } from "../i18n";
import { orderStatusLabels } from "./order-workflow";

export function OwnerOverview({
  ownerName,
  onNavigate,
}: {
  ownerName: string;
  onNavigate: (screen: string) => void;
}) {
  const { t } = useI18n();
  const { dashboard, orders, loading } = useOwnerWorkspace();
  const occupancy = dashboard?.total_tables
    ? Math.round((dashboard.active_tables / dashboard.total_tables) * 100)
    : 0;
  return (
    <>
      <PageHeader
        title={t("Добрый день, {name}", { name: ownerName })}
        subtitle={
          loading ? t("Обновляем показатели...") : t("Актуальные данные выбранного заведения.")
        }
        actions={
          <Button icon={Download} kind="secondary" onClick={() => window.print()}>
            {t("Отчет")}
          </Button>
        }
      />
      <section className="metric-grid">
        <Metric
          label={t("Выручка сегодня")}
          value={money((dashboard?.revenue_minor ?? 0) / 100)}
          change={t("Оплаченные заказы")}
          icon={CircleDollarSign}
          tone="coral"
        />
        <Metric
          label={t("Заказы")}
          value={String(dashboard?.orders_today ?? 0)}
          change={t(`${dashboard?.new_orders ?? 0} новых`)}
          icon={ShoppingBag}
          tone="green"
        />
        <Metric
          label={t("Средний чек")}
          value={money((dashboard?.average_order_minor ?? 0) / 100)}
          change={t("За сегодня")}
          icon={ReceiptText}
          tone="blue"
        />
        <Metric
          label={t("Загрузка зала")}
          value={`${occupancy}%`}
          change={t(`${dashboard?.active_tables ?? 0} из ${dashboard?.total_tables ?? 0}`)}
          icon={Table2}
          tone="gold"
        />
      </section>
      <section className="dashboard-grid">
        <div className="panel dashboard-orders">
          <PanelTitle
            title={t("Последние заказы")}
            subtitle={t("Обновляются из рабочего API")}
            action={
              <Button kind="quiet" onClick={() => onNavigate("orders")}>
                {t("Все заказы")} <ChevronRight size={16} />
              </Button>
            }
          />
          <OrderTable orders={orders.slice(0, 5)} />
        </div>
        <div className="panel reviews-panel">
          <PanelTitle title={t("Оценка гостей")} subtitle={t("По опубликованным отзывам")} />
          {dashboard?.average_rating ? (
            <div className="rating-main">
              <strong>{dashboard.average_rating.toFixed(1)}</strong>
              <div>
                <div className="stars">
                  <Star size={18} fill="currentColor" />
                </div>
                <small>{t("Средняя оценка")}</small>
              </div>
            </div>
          ) : (
            <EmptyIllustration
              icon={Star}
              title={t("Оценок пока нет")}
              text={t("Средняя оценка появится после первого отзыва.")}
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
  const { t } = useI18n();
  if (!orders.length)
    return (
      <EmptyIllustration
        icon={CheckCircle2}
        title={t("Заказов пока нет")}
        text={t("Новые онлайн-заказы появятся здесь автоматически.")}
      />
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{t("Заказ")}</th>
            <th>{t("Источник")}</th>
            <th>{t("Гость")}</th>
            <th>{t("Сумма")}</th>
            <th>{t("Статус")}</th>
            <th>{t("Создан")}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <strong>#{order.number}</strong>
                {order.reservation_code && (
                  <small className="order-reservation-code">
                    {t("Бронь")} {order.reservation_code}
                  </small>
                )}
              </td>
              <td>
                {t(order.source)}
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
                {order.guest_name || t("Гость")}
                {order.guest_phone && (
                  <small className="order-reservation-code">{order.guest_phone}</small>
                )}
                {order.guest_count ? (
                  <small className="order-reservation-code">
                    {t("Гостей:")} {order.guest_count}
                  </small>
                ) : null}
                {order.items?.length ? (
                  <details className="order-preorder-items">
                    <summary>
                      {t("Блюда (")}
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)})
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
                    {t("Чаевые:")} {money(order.tip_minor! / 100)}
                  </small>
                )}
              </td>
              <td>
                <StatusPill status={orderStatusLabels[order.status]} />
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
