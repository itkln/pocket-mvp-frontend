"use client";

import { CalendarDays, CircleDollarSign, Download, ReceiptText, Star, TrendingUp, Users } from "lucide-react";
import { menuItems } from "../model";
import { money, Button, FoodImage, PageHeader, PanelTitle } from "../ui";
import { Metric } from "./dashboard";

export function AnalyticsScreen() {
  const popular = menuItems.slice(0, 5);
  return <><PageHeader title="Аналитика" subtitle="Продажи, загрузка и предпочтения гостей." actions={<><Button kind="secondary" icon={CalendarDays}>1–19 июля</Button><Button kind="secondary" icon={Download}>Экспорт</Button></>} /><section className="metric-grid"><Metric label="Чистая выручка" value="€42,680" change="+14.2%" icon={CircleDollarSign} tone="coral" /><Metric label="Заказов" value="1,284" change="+9.8%" icon={ReceiptText} tone="green" /><Metric label="Средний чек" value="€33.24" change="+4.1%" icon={TrendingUp} tone="blue" /><Metric label="Новых гостей" value="318" change="+18.6%" icon={Users} tone="gold" /></section><section className="analytics-grid"><div className="panel analytics-revenue"><PanelTitle title="Динамика выручки" subtitle="Июль 2026" action={<div className="segmented tiny"><button className="active">День</button><button>Неделя</button></div>} /><AreaChart /></div><div className="panel"><PanelTitle title="Загрузка по времени" subtitle="Средняя за неделю" /><HeatMap /></div><div className="panel popular-list"><PanelTitle title="Популярные позиции" subtitle="По количеству продаж" />{popular.map((item, index) => <div key={item.id}><span>{index + 1}</span><FoodImage item={item} /><p><strong>{item.name}</strong><small>{[184, 156, 142, 121, 98][index]} продано</small></p><b>{money([3404, 3744, 1917, 2057, 833][index])}</b></div>)}</div><div className="panel reviews-panel"><PanelTitle title="Отзывы гостей" subtitle="Последние 30 дней" /><div className="rating-main"><strong>4.8</strong><div><div className="stars">★★★★★</div><small>На основе 128 отзывов</small></div></div>{[5, 4, 3, 2, 1].map((value, index) => <div className="rating-row" key={value}><span>{value}</span><Star size={12} /><i><b style={{ width: `${[82, 14, 3, 1, 0][index]}%` }} /></i><small>{[105, 18, 4, 1, 0][index]}</small></div>)}</div></section></>;
}

export function AreaChart() {
  const values = [38, 44, 36, 57, 52, 64, 61, 75, 68, 86, 78, 92, 88, 98];
  return <div className="area-chart"><div className="area-grid"><i /><i /><i /><i /></div><div className="area-columns">{values.map((v, i) => <span key={i} style={{ height: `${v}%` }} />)}</div><div className="area-labels"><span>1 июл</span><span>7 июл</span><span>13 июл</span><span>19 июл</span></div></div>;
}

export function HeatMap() {
  const values = [1,1,2,3,4,3, 1,2,2,4,4,3, 1,2,3,4,5,4, 1,2,3,5,5,4, 1,1,2,4,5,3, 1,2,3,4,4,2, 1,1,2,3,4,2];
  return <div className="heatmap"><div className="heat-times"><span>12:00</span><span>14:00</span><span>16:00</span><span>18:00</span><span>20:00</span><span>22:00</span></div><div className="heat-grid">{values.map((v, i) => <i className={`heat-${v}`} key={i} />)}</div><div className="heat-days">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((d) => <span key={d}>{d}</span>)}</div></div>;
}

