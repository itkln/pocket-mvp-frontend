"use client";

import { CheckCircle2, ChevronRight, Download, Star } from "lucide-react";
import { type OwnerOrder } from "../../../lib/owner-api";
import { Button, EmptyIllustration, PageHeader, StatCard, StatusPill, money } from "../ui";
import { useOwnerWorkspace } from "./context";
import { localeTags, useI18n } from "../i18n";
import { isFinalOrder, orderStatusLabels } from "./order-workflow";

// The owner's start screen: today's numbers, the latest orders and what needs attention now.
export function OwnerOverview({
  ownerName,
  venueName,
  onNavigate,
}: {
  ownerName: string;
  venueName: string;
  onNavigate: (screen: string) => void;
}) {
  const { t, locale } = useI18n();
  const { dashboard, orders, reviews, items, staff, loading } = useOwnerWorkspace();
  const occupancy = dashboard?.total_tables
    ? Math.round((dashboard.active_tables / dashboard.total_tables) * 100)
    : 0;
  const activeOrders = orders.filter((order) => !isFinalOrder(order));
  const today = new Date().toLocaleDateString(localeTags[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <div className="owner-overview">
      <PageHeader
        title={t("Добрый день, {name}", { name: ownerName })}
        subtitle={loading ? t("Обновляем показатели...") : `${venueName} · ${today}`}
        actions={
          <Button icon={Download} kind="secondary" onClick={() => window.print()}>
            {t("Отчет")}
          </Button>
        }
      />
      <section className="vendor-stat-grid overview-stats">
        <StatCard
          title={t("Выручка сегодня")}
          value={money((dashboard?.revenue_minor ?? 0) / 100)}
          caption={t("Оплаченные заказы")}
          onClick={() => onNavigate("payments")}
        />
        <StatCard
          title={t("Заказы сегодня")}
          value={dashboard?.orders_today ?? 0}
          caption={
            activeOrders.length
              ? t("В работе: {count}", { count: activeOrders.length })
              : t("Нет заказов в работе")
          }
          onClick={() => onNavigate("orders")}
        />
        <StatCard
          title={t("Средний чек")}
          value={money((dashboard?.average_order_minor ?? 0) / 100)}
          caption={t("За сегодня")}
        />
        <StatCard
          title={t("Загрузка зала")}
          value={`${occupancy}%`}
          progress={occupancy}
          caption={t("Занято столов: {active} из {total}", {
            active: dashboard?.active_tables ?? 0,
            total: dashboard?.total_tables ?? 0,
          })}
        />
      </section>
      <section className="overview-grid">
        <div className="vendor-block overview-orders">
          <header>
            <div>
              <h2>{t("Последние заказы")}</h2>
              <p>{t("Обновляются автоматически")}</p>
            </div>
            <Button kind="secondary" onClick={() => onNavigate("orders")}>
              {t("Все заказы")}
            </Button>
          </header>
          <OrderTable orders={orders.slice(0, 6)} />
        </div>
        <aside className="overview-side">
          <AttentionList
            newOrders={orders.filter((order) => order.status === "new").length}
            unanswered={reviews.filter((review) => !review.owner_reply).length}
            stopped={items.filter((item) => !item.is_available).length}
            invited={staff.filter((member) => member.status === "invited").length}
            onNavigate={onNavigate}
          />
          <RatingSummary
            rating={dashboard?.average_rating ?? 0}
            ratings={reviews.map((review) => review.rating)}
            onOpen={() => onNavigate("reviews")}
          />
        </aside>
      </section>
    </div>
  );
}

function AttentionList({
  newOrders,
  unanswered,
  stopped,
  invited,
  onNavigate,
}: {
  newOrders: number;
  unanswered: number;
  stopped: number;
  invited: number;
  onNavigate: (screen: string) => void;
}) {
  const { t } = useI18n();
  const rows = [
    { label: t("Новые заказы"), count: newOrders, screen: "orders" },
    { label: t("Отзывы без ответа"), count: unanswered, screen: "reviews" },
    { label: t("Позиции в стоп-листе"), count: stopped, screen: "menu" },
    { label: t("Приглашения ждут ответа"), count: invited, screen: "team" },
  ].filter((row) => row.count > 0);
  return (
    <div className="vendor-block overview-attention">
      <header>
        <div>
          <h2>{t("Требует внимания")}</h2>
          <p>{rows.length ? t("Откройте раздел, чтобы разобраться") : t("Всё под контролем")}</p>
        </div>
      </header>
      {rows.length ? (
        <ul>
          {rows.map((row) => (
            <li key={row.screen}>
              <button type="button" onClick={() => onNavigate(row.screen)}>
                <span>{row.label}</span>
                <b>{row.count}</b>
                <ChevronRight size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="overview-all-clear">
          <CheckCircle2 size={20} />
          {t("Новых заказов и отзывов без ответа нет")}
        </p>
      )}
    </div>
  );
}

function RatingSummary({
  rating,
  ratings,
  onOpen,
}: {
  rating: number;
  ratings: number[];
  onOpen: () => void;
}) {
  const { t } = useI18n();
  if (!ratings.length && !rating)
    return (
      <div className="vendor-block overview-rating">
        <EmptyIllustration
          icon={Star}
          title={t("Оценок пока нет")}
          text={t("Средняя оценка появится после первого отзыва.")}
        />
      </div>
    );
  return (
    <button type="button" className="vendor-block overview-rating" onClick={onOpen}>
      <span className="vendor-stat-heading">
        {t("Оценка гостей")}
        <ChevronRight size={18} />
      </span>
      <div className="overview-rating-score">
        <strong>{rating.toFixed(1)}</strong>
        <div>
          <span className="overview-stars" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={18}
                fill={star <= Math.round(rating) ? "currentColor" : "none"}
              />
            ))}
          </span>
          <small>{t("{count} отзывов", { count: ratings.length })}</small>
        </div>
      </div>
      <ul className="overview-rating-bars">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = ratings.filter((value) => value === stars).length;
          return (
            <li key={stars}>
              <span>{stars}</span>
              <span className="vendor-stat-track">
                <i style={{ width: `${ratings.length ? (count / ratings.length) * 100 : 0}%` }} />
              </span>
              <span>{count}</span>
            </li>
          );
        })}
      </ul>
    </button>
  );
}

// A compact order list: the full ticket (items, notes, actions) lives on the orders screen.
export function OrderTable({ orders }: { orders: OwnerOrder[] }) {
  const { t, locale } = useI18n();
  if (!orders.length)
    return (
      <EmptyIllustration
        icon={CheckCircle2}
        title={t("Заказов пока нет")}
        text={t("Новые онлайн-заказы появятся здесь автоматически.")}
      />
    );
  return (
    <table className="vendor-table stack overview-order-table">
      <thead>
        <tr>
          <th>{t("Заказ")}</th>
          <th>{t("Гость")}</th>
          <th className="numeric">{t("Сумма")}</th>
          <th>{t("Статус")}</th>
          <th className="numeric">{t("Время")}</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => {
          const quantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
          const details = [
            t(order.source),
            order.reservation_starts_at
              ? t("бронь на {time}", {
                  time: new Date(order.reservation_starts_at).toLocaleString(localeTags[locale], {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })
              : "",
          ].filter(Boolean);
          return (
            <tr key={order.id}>
              <td>
                <span className="cell-main">#{order.number}</span>
                <span className="cell-sub">{details.join(" · ")}</span>
              </td>
              <td>
                <span className="cell-main">{order.guest_name || t("Гость")}</span>
                <span className="cell-sub">
                  {quantity ? t("Позиций: {count}", { count: quantity }) : t("Без позиций")}
                  {order.guest_count ? ` · ${t("Гостей:")} ${order.guest_count}` : ""}
                </span>
              </td>
              <td className="numeric">
                <span className="cell-main">{money(order.total_minor / 100, order.currency)}</span>
                {Boolean(order.tip_minor) && (
                  <span className="cell-sub">
                    {t("Чаевые:")} {money(order.tip_minor! / 100, order.currency)}
                  </span>
                )}
              </td>
              <td>
                <StatusPill status={orderStatusLabels[order.status]} />
              </td>
              <td className="numeric">
                {new Date(order.created_at).toLocaleTimeString(localeTags[locale], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
