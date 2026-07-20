"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, CircleDollarSign, Download, ListFilter, ReceiptText, Search, ShoppingBag, Table2, TrendingUp, type LucideIcon } from "lucide-react";
import { liveOrders } from "../model";
import { money, Button, IconButton, StatusPill, EmptyIllustration, PageHeader, PanelTitle } from "../ui";

export function OwnerOverview({ ownerName, onNavigate, onOrder }: { ownerName: string; onNavigate: (screen: string) => void; onOrder: () => void }) {
  return <>
    <PageHeader eyebrow="Воскресенье, 19 июля" title={`Добрый день, ${ownerName}`} subtitle="Зал открыт. Сейчас 7 активных столов и 3 онлайн-заказа." actions={<Button icon={Download} kind="secondary">Отчет</Button>} />
    <section className="metric-grid">
      <Metric label="Выручка сегодня" value="€2,846" change="+12.4%" icon={CircleDollarSign} tone="coral" />
      <Metric label="Заказы" value="84" change="+8 сегодня" icon={ShoppingBag} tone="green" />
      <Metric label="Средний чек" value="€33.88" change="+€2.14" icon={ReceiptText} tone="blue" />
      <Metric label="Загрузка зала" value="68%" change="12 из 18" icon={Table2} tone="gold" />
    </section>
    <section className="dashboard-grid">
      <div className="panel revenue-panel"><PanelTitle title="Выручка" subtitle="Последние 7 дней" action={<button className="text-button">Эта неделя <ChevronDown size={14} /></button>} /><RevenueChart /><div className="chart-legend"><span><i className="legend-current" />Эта неделя €15,280</span><span><i className="legend-past" />Прошлая €13,490</span></div></div>
      <div className="panel channel-panel"><PanelTitle title="Каналы продаж" subtitle="Сегодня" /><div className="donut-wrap"><div className="donut"><span><strong>84</strong><small>заказа</small></span></div><div className="donut-legend"><p><i className="dine" /><span>В зале</span><strong>61%</strong></p><p><i className="online" /><span>Онлайн</span><strong>27%</strong></p><p><i className="pickup" /><span>Самовывоз</span><strong>12%</strong></p></div></div></div>
    </section>
    <section className="panel orders-panel"><PanelTitle title="Текущие заказы" subtitle="Обновлено только что" action={<Button kind="quiet" onClick={() => onNavigate("orders")}>Все заказы <ArrowRight size={16} /></Button>} /><OrderTable orders={liveOrders.slice(0, 4)} onOrder={onOrder} /></section>
  </>;
}

export function Metric({ label, value, change, icon: Icon, tone }: { label: string; value: string; change: string; icon: LucideIcon; tone: string }) {
  return <div className="metric"><div className={`metric-icon ${tone}`}><Icon size={19} /></div><p>{label}</p><strong>{value}</strong><span><TrendingUp size={14} />{change}</span></div>;
}

export function RevenueChart() {
  const bars = [48, 64, 51, 78, 68, 88, 74];
  return <div className="bar-chart"><div className="axis-labels"><span>€3k</span><span>€2k</span><span>€1k</span><span>€0</span></div><div className="bars">{bars.map((height, index) => <div className="bar-column" key={index}><div className="bar-ghost" style={{ height: `${Math.max(30, height - 18)}%` }} /><div className="bar-current" style={{ height: `${height}%` }} /><span>{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][index]}</span></div>)}</div></div>;
}

export function OrderTable({ orders, onOrder }: { orders: typeof liveOrders; onOrder?: () => void }) {
  return <div className="table-wrap"><table><thead><tr><th>Заказ</th><th>Источник</th><th>Гость</th><th>Сумма</th><th>Статус</th><th>Время</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id} onClick={onOrder}><td><strong>{order.id}</strong></td><td>{order.source}</td><td>{order.guest}</td><td><strong>{money(order.total)}</strong></td><td><StatusPill status={order.status} /></td><td className="muted-cell">{order.time}</td><td><IconButton icon={ChevronRight} label="Открыть заказ" /></td></tr>)}</tbody></table></div>;
}

export function OrdersScreen({ onOrder }: { onOrder: () => void }) {
  const [filter, setFilter] = useState("Все");
  const filtered = filter === "Все" ? liveOrders : liveOrders.filter((order) => order.status === filter);
  return <><PageHeader title="Заказы" subtitle="Все заказы из зала, сайта и самовывоза." /><div className="toolbar"><div className="segmented">{["Все", "Новый", "Готовится", "Готов", "Подан"].map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? "active" : ""}>{item}{item === "Новый" && <b>1</b>}</button>)}</div><div className="toolbar-actions"><label className="search-field"><Search size={17} /><input placeholder="Номер или гость" /></label><IconButton icon={ListFilter} label="Фильтр" /></div></div><div className="panel"><OrderTable orders={filtered} onOrder={onOrder} />{filtered.length === 0 && <EmptyIllustration icon={ReceiptText} title="Таких заказов пока нет" text="Новые заказы появятся здесь автоматически." />}</div></>;
}


