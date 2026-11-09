"use client";

import {
  CalendarClock,
  CircleDollarSign,
  Download,
  Globe2,
  ReceiptText,
  ShoppingBag,
  Star,
  Table2,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { Button, EmptyIllustration, PageHeader, PanelTitle, money } from "../ui";
import { Metric } from "./dashboard";
import { useOwnerWorkspace } from "./context";
import { useI18n } from "../i18n";

const channels: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: "dine_in", label: "В зале", icon: Utensils },
  { id: "online", label: "Онлайн", icon: Globe2 },
  { id: "pickup", label: "Самовывоз", icon: ShoppingBag },
  { id: "preorder", label: "Предзаказ", icon: CalendarClock },
];

export function AnalyticsScreen() {
  const { t } = useI18n();
  const { dashboard, items, orders, reviews } = useOwnerWorkspace();
  const completed = orders.filter((order) => order.status === "completed");
  const occupancy = dashboard?.total_tables
    ? Math.round((dashboard.active_tables / dashboard.total_tables) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title={t("Аналитика")}
        actions={
          <Button kind="secondary" icon={Download} onClick={() => window.print()}>
            {t("Экспорт")}
          </Button>
        }
      />
      <section className="metric-grid">
        <Metric
          label={t("Выручка сегодня")}
          value={money((dashboard?.revenue_minor ?? 0) / 100)}
          change={t("За текущий день")}
          icon={CircleDollarSign}
          tone="coral"
        />
        <Metric
          label={t("Заказов сегодня")}
          value={String(dashboard?.orders_today ?? 0)}
          change={t(`Завершено: ${completed.length}`)}
          icon={ReceiptText}
          tone="green"
        />
        <Metric
          label={t("Загрузка зала")}
          value={`${occupancy}%`}
          change={t(`Активных столов: ${dashboard?.active_tables ?? 0}`)}
          icon={Table2}
          tone="blue"
        />
        <Metric
          label={t("Средняя оценка")}
          value={dashboard?.average_rating ? dashboard.average_rating.toFixed(1) : "—"}
          change={t(`Отзывов: ${reviews.length}`)}
          icon={Star}
          tone="gold"
        />
      </section>
      <section className="analytics-grid">
        <div className="panel popular-list">
          <PanelTitle title={t("Меню")} />
          {items.length ? (
            items.slice(0, 8).map((item, index) => (
              <div className="popular-row" key={item.id}>
                <span>{index + 1}</span>
                <p>
                  <strong>{item.name}</strong>
                  <small>
                    {item.category} · {item.is_available ? t("Доступно") : t("Скрыто")}
                  </small>
                </p>
                <b>{money(item.price_minor / 100)}</b>
              </div>
            ))
          ) : (
            <EmptyIllustration
              icon={ReceiptText}
              title={t("Недостаточно данных")}
              text={t("Добавьте позиции меню, чтобы видеть сводку.")}
            />
          )}
        </div>
        <div className="panel channel-summary">
          <PanelTitle title={t("Заказы по каналам")} />
          {orders.length ? (
            <div className="channel-summary-list">
              {channels.map(({ id, label, icon: Icon }) => {
                const value = orders.filter((order) => order.channel === id).length;
                const percentage = Math.round((value / orders.length) * 100);
                return (
                  <div className="channel-summary-row" key={id}>
                    <span className={`channel-summary-icon channel-${id}`}>
                      <Icon size={21} />
                    </span>
                    <strong>{t(label)}</strong>
                    <span
                      className="channel-summary-progress"
                      role="progressbar"
                      aria-label={t(label)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                    >
                      <i style={{ width: `${percentage}%` }} />
                    </span>
                    <b>{value}</b>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyIllustration
              icon={ReceiptText}
              title={t("Заказов пока нет")}
              text={t("Статистика появится после первого заказа.")}
            />
          )}
        </div>
      </section>
    </>
  );
}
