"use client";

import { Check, Clock3, PackageCheck } from "lucide-react";
import { liveOrders } from "../model";
import { Button, PageHeader } from "../ui";

export function KitchenScreen({ notify }: { notify: (message: string) => void }) {
  const tickets = liveOrders.filter((o)=>o.status !== "Подан");
  return <><PageHeader title="Кухня" subtitle="Очередь блюд по времени приготовления." actions={<div className="kitchen-clock"><Clock3 size={17} />14:32</div>} /><div className="kitchen-grid">{tickets.map((order,index) => <article className={`kitchen-ticket ${index === 0 ? "urgent" : ""}`} key={order.id}><header><div><strong>{order.source}</strong><span>{order.id}</span></div><b>{order.time}</b></header><div className="kitchen-lines">{(index%2 ? [[1,"Сибас на гриле"],[1,"Тирамису"]] : [[2,"Тальятелле"],[1,"Буррата и томаты"],[3,"Красный апельсин"]]).map((line) => <p key={String(line[1])}><b>{line[0]}×</b><span>{line[1]}</span><button><Check size={15} /></button></p>)}</div><Button className="full" kind={index === 0 ? "primary" : "secondary"} onClick={() => notify(`${order.id} готов к выдаче`)} icon={PackageCheck}>Заказ готов</Button></article>)}</div></>;
}

