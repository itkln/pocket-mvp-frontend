"use client";

import { Check, ChevronRight, Coffee, Eye, MessageSquareText, PackageCheck, Share2 } from "lucide-react";
import { Button, IconButton, StatusPill, PageHeader } from "../ui";

export function HistoryScreen({ notify }: { notify: (message: string) => void }) {
  return <><PageHeader title="Мои заказы" subtitle="История визитов, заказов и оплат." /><div className="history-list"><article className="panel active-order"><div className="order-venue"><span className="venue-mini" /><div><small>СЕГОДНЯ · В ЗАЛЕ</small><h3>North & Vine</h3><p>Заказ #1049 · Стол 08</p></div><StatusPill status="Готовится" /></div><div className="progress-track"><i className="done"><Check size={13} /></i><span /><i className="done"><Check size={13} /></i><span /><i className="current"><Coffee size={13} /></i><span /><i><PackageCheck size={13} /></i></div><div className="progress-labels"><span>Принят</span><span>Подтвержден</span><span>Готовится</span><span>Готов</span></div><footer><div><strong>€58.50</strong><span>3 позиции</span></div><Button kind="secondary" icon={Share2} onClick={() => notify("Ссылка на заказ скопирована")}>Поделиться</Button><Button icon={Eye}>Следить за заказом</Button></footer></article>{[["14 июля","North & Vine","€76.50","5 позиций"],["8 июля","Casa Forma","€41.20","3 позиции"],["28 июня","Mizu Table","€64.00","4 позиции"]].map((row,index) => <article className="panel past-order" key={row[0]}><span className={`past-thumb pos-${index}`} /><div><small>{row[0]} · ОПЛАЧЕН</small><h3>{row[1]}</h3><p>{row[3]} · Карта •••• 4242</p></div><strong>{row[2]}</strong><Button kind="quiet" icon={MessageSquareText} onClick={() => notify("Форма отзыва открыта")}>Оставить отзыв</Button><IconButton icon={ChevronRight} label="Подробнее" /></article>)}</div></>;
}

