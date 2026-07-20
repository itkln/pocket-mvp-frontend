"use client";

import { ArrowRight, CheckCircle2, QrCode } from "lucide-react";
import { type Status, liveOrders } from "../model";
import { money, Button, EmptyIllustration, PageHeader } from "../ui";

export function ServiceBoard({ notify }: { notify: (message: string) => void }) {
  const columns: { title: string; status: Status; orders: typeof liveOrders }[] = [
    { title: "Новые", status: "Новый", orders: liveOrders.filter((o)=>o.status==="Новый") },
    { title: "Готовятся", status: "Готовится", orders: liveOrders.filter((o)=>o.status==="Готовится") },
    { title: "Готовы", status: "Готов", orders: liveOrders.filter((o)=>o.status==="Готов") },
  ];
  return <><PageHeader title="Сервис" subtitle="Ваша смена · 12:00–22:30" actions={<Button kind="secondary" icon={QrCode}>Сканировать стол</Button>} /><div className="shift-strip"><div><span className="live-indicator" />Смена активна</div><p><strong>София Марек</strong> · Столы 02, 03, 06, 08</p><Button kind="quiet">Завершить смену</Button></div><div className="kanban">{columns.map((column) => <section key={column.title}><header><h2>{column.title}</h2><span>{column.orders.length}</span></header>{column.orders.map((order) => <article className="ticket" key={order.id}><div><strong>{order.source}</strong><span>{order.time}</span></div><p>{order.id} · {order.guest}</p><ul>{order.id === "#1048" ? <><li><b>2×</b> Тальятелле</li><li><b>1×</b> Буррата</li><li><b>3×</b> Красный апельсин</li></> : <><li><b>1×</b> Сибас на гриле</li><li><b>1×</b> Тирамису</li></>}</ul><footer><strong>{money(order.total)}</strong><Button onClick={() => notify(column.status === "Готов" ? "Заказ отмечен как поданный" : "Заказ передан на следующий этап")}>{column.status === "Новый" ? "Принять" : column.status === "Готовится" ? "Проверить" : "Подано"}<ArrowRight size={15} /></Button></footer></article>)}{!column.orders.length && <EmptyIllustration icon={CheckCircle2} title="Все готово" text="В этой колонке нет заказов." />}</section>)}</div></>;
}

