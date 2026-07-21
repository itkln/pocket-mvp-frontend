"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, ChevronRight, CircleDollarSign, Download, ReceiptText, ShoppingBag, Star, Table2, type LucideIcon } from "lucide-react";
import { type OwnerOrder } from "../../../lib/owner-api";
import { Button, EmptyIllustration, PageHeader, PanelTitle, StatusPill, money } from "../ui";
import { useOwnerWorkspace } from "./context";

const orderStatusLabel: Record<OwnerOrder["status"], string> = {
  new: "Новый", accepted: "Принят", preparing: "Готовится", ready: "Готов",
  served: "Подан", completed: "Завершен", cancelled: "Отменен",
};

export function OwnerOverview({ ownerName, onNavigate }: { ownerName: string; onNavigate: (screen: string) => void }) {
  const { dashboard, orders, loading } = useOwnerWorkspace();
  const occupancy = dashboard?.total_tables ? Math.round((dashboard.active_tables / dashboard.total_tables) * 100) : 0;
  return <>
    <PageHeader title={`Добрый день, ${ownerName}`} subtitle={loading ? "Обновляем показатели..." : "Актуальные данные выбранного заведения."} actions={<Button icon={Download} kind="secondary" onClick={() => window.print()}>Отчет</Button>} />
    <section className="metric-grid">
      <Metric label="Выручка сегодня" value={money((dashboard?.revenue_minor ?? 0) / 100)} change="Оплаченные заказы" icon={CircleDollarSign} tone="coral" />
      <Metric label="Заказы" value={String(dashboard?.orders_today ?? 0)} change={`${dashboard?.new_orders ?? 0} новых`} icon={ShoppingBag} tone="green" />
      <Metric label="Средний чек" value={money((dashboard?.average_order_minor ?? 0) / 100)} change="За сегодня" icon={ReceiptText} tone="blue" />
      <Metric label="Загрузка зала" value={`${occupancy}%`} change={`${dashboard?.active_tables ?? 0} из ${dashboard?.total_tables ?? 0}`} icon={Table2} tone="gold" />
    </section>
    <section className="dashboard-grid">
      <div className="panel dashboard-orders"><PanelTitle title="Последние заказы" subtitle="Обновляются из рабочего API" action={<Button kind="quiet" onClick={() => onNavigate("orders")}>Все заказы <ChevronRight size={16} /></Button>} /><OrderTable orders={orders.slice(0, 5)} /></div>
      <div className="panel reviews-panel"><PanelTitle title="Оценка гостей" subtitle="По опубликованным отзывам" />{dashboard?.average_rating ? <div className="rating-main"><strong>{dashboard.average_rating.toFixed(1)}</strong><div><div className="stars"><Star size={18} fill="currentColor" /></div><small>Средняя оценка</small></div></div> : <EmptyIllustration icon={Star} title="Оценок пока нет" text="Средняя оценка появится после первого отзыва." />}</div>
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
    try { await setOrderStatus(order.id, status); } finally { setUpdating(""); }
  };
  return <div className="table-scroll"><table><thead><tr><th>Заказ</th><th>Источник</th><th>Гость</th><th>Сумма</th><th>Статус</th><th>Создан</th><th /></tr></thead><tbody>{orders.map((order)=><tr key={order.id}><td><strong>#{order.number}</strong></td><td>{order.source}</td><td>{order.guest_name || "Гость"}</td><td><strong>{money(order.total_minor/100)}</strong></td><td><StatusPill status={orderStatusLabel[order.status]} /></td><td>{new Date(order.created_at).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</td><td><select aria-label={`Изменить статус заказа #${order.number}`} disabled={updating===order.id} value={order.status} onChange={(event)=>void change(order,event.target.value as OwnerOrder["status"])}><option value="new">Новый</option><option value="accepted">Принят</option><option value="preparing">Готовится</option><option value="ready">Готов</option><option value="served">Подан</option><option value="completed">Завершен</option><option value="cancelled">Отменен</option></select></td></tr>)}</tbody></table></div>;
}

export function OrdersScreen() {
  const { orders } = useOwnerWorkspace();
  const [filter, setFilter] = useState<"all" | OwnerOrder["status"]>("all");
  const filtered = filter === "all" ? orders : orders.filter((order)=>order.status===filter);
  const filters: Array<[typeof filter,string]> = [["all","Все"],["new","Новые"],["preparing","Готовятся"],["ready","Готовы"],["completed","Завершены"]];
  return <><PageHeader title="Заказы" subtitle="Заказы из зала, сайта и предзаказов." /><div className="order-filters">{filters.map(([id,label])=><button key={id} className={filter===id?"active":""} onClick={()=>setFilter(id)}>{label}{id==="new"&&orders.filter((order)=>order.status==="new").length>0&&<b>{orders.filter((order)=>order.status==="new").length}</b>}</button>)}</div><section className="panel"><OrderTable orders={filtered} /></section></>;
}

export function OwnerAction({ children }: { children: ReactNode }) { return children; }
