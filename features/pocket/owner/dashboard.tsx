"use client";

import { useState, type ReactNode } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
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
import { type OwnerOrder } from "../../../lib/owner-api";
import { Button, EmptyIllustration, PageHeader, PanelTitle, money } from "../ui";
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

const channelIcons: Record<string, LucideIcon> = {
  dine_in: Utensils,
  online: Globe2,
  pickup: ShoppingBag,
  preorder: CalendarClock,
};

const statusOptions: OwnerOrder["status"][] = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
];

function guestInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function OwnerOverview({ ownerName, onNavigate }: { ownerName: string; onNavigate: (screen: string) => void }) {
  const { dashboard, orders } = useOwnerWorkspace();
  const occupancy = dashboard?.total_tables ? Math.round((dashboard.active_tables / dashboard.total_tables) * 100) : 0;

  return <>
    <PageHeader title={`Добрый день, ${ownerName}`} actions={<Button icon={Download} kind="secondary" onClick={() => window.print()}>Отчет</Button>} />
    <section className="metric-grid">
      <Metric label="Выручка сегодня" value={money((dashboard?.revenue_minor ?? 0) / 100)} change="Оплаченные заказы" icon={CircleDollarSign} tone="coral" />
      <Metric label="Заказы" value={String(dashboard?.orders_today ?? 0)} change={`${dashboard?.new_orders ?? 0} новых`} icon={ShoppingBag} tone="green" />
      <Metric label="Средний чек" value={money((dashboard?.average_order_minor ?? 0) / 100)} change="За сегодня" icon={ReceiptText} tone="blue" />
      <Metric label="Загрузка зала" value={`${occupancy}%`} change={`${dashboard?.active_tables ?? 0} из ${dashboard?.total_tables ?? 0}`} icon={Table2} tone="gold" />
    </section>
    <section className="dashboard-grid">
      <div className="panel dashboard-orders">
        <PanelTitle title="Последние заказы" action={<Button kind="quiet" onClick={() => onNavigate("orders")}>Все заказы <ChevronRight size={18} /></Button>} />
        <OrderTable orders={orders.slice(0, 5)} />
      </div>
      <div className="panel reviews-panel">
        <PanelTitle title="Оценка гостей" />
        {dashboard?.average_rating
          ? <div className="rating-main"><strong>{dashboard.average_rating.toFixed(1)}</strong><div><div className="stars"><Star size={20} fill="currentColor" /></div><span>Средняя оценка</span></div></div>
          : <EmptyIllustration icon={Star} title="Оценок пока нет" text="Средняя оценка появится после первого отзыва." />}
      </div>
    </section>
  </>;
}

export function Metric({ label, value, change, icon: Icon, tone }: { label: string; value: string; change: string; icon: LucideIcon; tone: string }) {
  return <article className="metric"><span className={`metric-icon ${tone}`}><Icon size={20} /></span><div className="metric-copy"><p>{label}</p><strong>{value}</strong><small>{change}</small></div></article>;
}

export function OrderTable({ orders }: { orders: OwnerOrder[] }) {
  const { setOrderStatus } = useOwnerWorkspace();
  const [updating, setUpdating] = useState("");

  if (!orders.length) return <EmptyIllustration icon={CheckCircle2} title="Заказов пока нет" text="Новые онлайн-заказы появятся здесь автоматически." />;

  const change = async (order: OwnerOrder, status: OwnerOrder["status"]) => {
    setUpdating(order.id);
    try {
      await setOrderStatus(order.id, status);
    } finally {
      setUpdating("");
    }
  };

  return <div className="order-list" role="list">
    {orders.map((order) => {
      const ChannelIcon = channelIcons[order.channel] ?? ShoppingBag;
      const guest = order.guest_name || "Гость";
      return <article className="order-row" key={order.id} role="listitem">
        <div className="order-identity">
          <span className={`order-channel-icon channel-${order.channel}`}><ChannelIcon size={20} /></span>
          <div><strong>#{order.number}</strong><span>{order.source}</span></div>
        </div>
        <div className="order-guest">
          <span>{guestInitials(guest)}</span>
          <strong>{guest}</strong>
        </div>
        <div className="order-total">
          <strong>{money(order.total_minor / 100, order.currency)}</strong>
          <time dateTime={order.created_at}>{new Date(order.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</time>
        </div>
        <label className={`order-status-control status-${order.status}`}>
          <span className="visually-hidden">Статус</span>
          <select
            aria-label={`Изменить статус заказа #${order.number}`}
            disabled={updating === order.id}
            value={order.status}
            onChange={(event) => void change(order, event.target.value as OwnerOrder["status"])}
          >
            {statusOptions.map((status) => <option value={status} key={status}>{orderStatusLabel[status]}</option>)}
          </select>
        </label>
      </article>;
    })}
  </div>;
}

export function OrdersScreen() {
  const { orders } = useOwnerWorkspace();
  const [filter, setFilter] = useState<"all" | OwnerOrder["status"]>("all");
  const filtered = filter === "all" ? orders : orders.filter((order) => order.status === filter);
  const filters: Array<[typeof filter, string]> = [
    ["all", "Все"],
    ["new", "Новые"],
    ["preparing", "Готовятся"],
    ["ready", "Готовы"],
    ["completed", "Завершены"],
  ];

  const count = (id: typeof filter) => id === "all" ? orders.length : orders.filter((order) => order.status === id).length;

  return <>
    <PageHeader title="Заказы" />
    <div className="order-filters">
      {filters.map(([id, label]) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}<span>{count(id)}</span></button>)}
    </div>
    <section className="panel orders-list-panel"><OrderTable orders={filtered} /></section>
  </>;
}

export function OwnerAction({ children }: { children: ReactNode }) {
  return children;
}
