"use client";

import { CircleDollarSign, Download, ReceiptText, Star, Table2 } from "lucide-react";
import { Button, EmptyIllustration, PageHeader, PanelTitle, money } from "../ui";
import { Metric } from "./dashboard";
import { useOwnerWorkspace } from "./context";

export function AnalyticsScreen() {
  const { dashboard, items, orders, reviews } = useOwnerWorkspace();
  const completed = orders.filter((order)=>order.status==="completed");
  const occupancy = dashboard?.total_tables ? Math.round((dashboard.active_tables/dashboard.total_tables)*100) : 0;
  return <><PageHeader title="Аналитика" subtitle="Показатели рассчитаны по данным выбранного заведения." actions={<Button kind="secondary" icon={Download} onClick={()=>window.print()}>Экспорт</Button>} /><section className="metric-grid"><Metric label="Выручка сегодня" value={money((dashboard?.revenue_minor??0)/100)} change="За текущий день" icon={CircleDollarSign} tone="coral" /><Metric label="Заказов сегодня" value={String(dashboard?.orders_today??0)} change={`${completed.length} завершено`} icon={ReceiptText} tone="green" /><Metric label="Загрузка зала" value={`${occupancy}%`} change={`${dashboard?.active_tables??0} активных столов`} icon={Table2} tone="blue" /><Metric label="Средняя оценка" value={dashboard?.average_rating?dashboard.average_rating.toFixed(1):"—"} change={`${reviews.length} отзывов`} icon={Star} tone="gold" /></section><section className="analytics-grid"><div className="panel popular-list"><PanelTitle title="Меню" subtitle="Активные и популярные позиции" />{items.length?items.slice(0,8).map((item,index)=><div key={item.id}><span>{index+1}</span><p><strong>{item.name}</strong><small>{item.category} · {item.is_available?"Доступно":"Скрыто"}</small></p><b>{money(item.price_minor/100)}</b></div>):<EmptyIllustration icon={ReceiptText} title="Недостаточно данных" text="Добавьте позиции меню, чтобы видеть сводку." />}</div><div className="panel"><PanelTitle title="Заказы по каналам" />{orders.length?<div className="setting-toggles">{["dine_in","online","pickup","preorder"].map((channel)=><div key={channel}><strong>{channel==="dine_in"?"В зале":channel==="online"?"Онлайн":channel==="pickup"?"Самовывоз":"Предзаказ"}</strong><b>{orders.filter((order)=>order.channel===channel).length}</b></div>)}</div>:<EmptyIllustration icon={ReceiptText} title="Заказов пока нет" text="Статистика появится после первого заказа." />}</div></section></>;
}
