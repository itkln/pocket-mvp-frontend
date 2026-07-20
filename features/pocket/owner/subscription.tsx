"use client";

import { useState } from "react";
import { Check, CreditCard, Plus, ShieldCheck, Sparkles, Store } from "lucide-react";
import { money, Button, PageHeader, PanelTitle, Field } from "../ui";

export const subscriptionPlans = [
  { id: "start", name: "Start", price: 29, description: "Для небольшого заведения", venues: "1 заведение", venueLimit: 1, features: ["Онлайн-меню и QR-коды", "Заказы и счета столов", "До 5 сотрудников"] },
  { id: "business", name: "Business", price: 69, description: "Для растущей команды", venues: "До 3 заведений", venueLimit: 3, features: ["Все возможности Start", "Аналитика и роли команды", "Брони и предзаказы"] },
  { id: "pro", name: "Pro", price: 129, description: "Для сети заведений", venues: "Без ограничений", venueLimit: Number.POSITIVE_INFINITY, features: ["Все возможности Business", "Расширенная аналитика", "Приоритетная поддержка"] },
] as const;

export function SubscriptionScreen({ venueCount, notify }: { venueCount: number; notify: (message: string) => void }) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [planId, setPlanId] = useState<(typeof subscriptionPlans)[number]["id"]>("business");
  const [method, setMethod] = useState<"card" | "new">("card");
  const [activated, setActivated] = useState(false);
  const plan = subscriptionPlans.find((item) => item.id === planId) ?? subscriptionPlans[1];
  const planFitsVenueCount = plan.venueLimit >= venueCount;
  const subtotal = billing === "yearly" ? plan.price * 10 : plan.price;
  const tax = subtotal * 0.2;
  const total = subtotal + tax;
  const activate = () => {
    if (!planFitsVenueCount) {
      notify(`Тариф ${plan.name} не поддерживает ${venueCount} заведения`);
      return;
    }
    setActivated(true);
    notify(`Подписка Pocket ${plan.name} подключена`);
  };
  return <><PageHeader title="Подписка" subtitle="Выберите тариф для всего рабочего пространства Pocket." /><section className={`subscription-status ${activated ? "active" : ""}`}><span><Sparkles size={22} /></span><div><strong>{activated ? `Pocket ${plan.name} активен` : "Пробный период активен"}</strong><p>{activated ? `Следующее списание ${billing === "yearly" ? "19 июля 2027" : "19 августа 2026"}.` : "Все возможности Business доступны до 28 июля без списаний."}</p></div><b>{activated ? "Оплачено" : "9 дней"}</b></section><div className="subscription-heading"><div><h2>Выберите тариф</h2><p>Тариф можно изменить или отменить в любой момент.</p></div><div className="segmented billing-toggle"><button className={billing === "monthly" ? "active" : ""} onClick={() => { setBilling("monthly"); setActivated(false); }}>Ежемесячно</button><button className={billing === "yearly" ? "active" : ""} onClick={() => { setBilling("yearly"); setActivated(false); }}>Ежегодно <b>−17%</b></button></div></div><section className="subscription-plans">{subscriptionPlans.map((item) => { const incompatible = item.venueLimit < venueCount; return <button className={`subscription-plan ${planId === item.id ? "selected" : ""} ${incompatible ? "incompatible" : ""}`} key={item.id} disabled={incompatible} onClick={() => { setPlanId(item.id); setActivated(false); }}><div className="plan-title"><div><strong>{item.name}</strong><span>{item.description}</span></div>{planId === item.id && <Check size={18} />}</div><div className="plan-price"><strong>{money(item.price)}</strong><span>/ месяц</span></div><p>{billing === "yearly" ? `€${item.price * 10} в год · 2 месяца бесплатно` : "Оплата каждый месяц"}</p><ul>{item.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul><small className={incompatible ? "plan-limit-warning" : ""}><Store size={14} />{incompatible ? `Не подходит для ${venueCount} заведений` : item.venues}</small></button>; })}</section><div className="subscription-checkout"><section className="panel subscription-details"><PanelTitle title="Данные для оплаты" subtitle="Счет будет оформлен на владельца рабочего пространства." /><div className="subscription-methods"><button className={method === "card" ? "active" : ""} onClick={() => setMethod("card")}><span><CreditCard size={19} /></span><div><strong>Visa •••• 4242</strong><small>Срок действия 08/29</small></div><i /></button><button className={method === "new" ? "active" : ""} onClick={() => setMethod("new")}><span><Plus size={19} /></span><div><strong>Новая карта</strong><small>Добавить другой способ оплаты</small></div><i /></button></div>{method === "new" && <div className="form-grid subscription-card-form"><Field label="Номер карты" wide><input placeholder="0000 0000 0000 0000" /></Field><Field label="Срок действия"><input placeholder="ММ / ГГ" /></Field><Field label="CVC"><input placeholder="123" /></Field></div>}<hr /><PanelTitle title="Платежные реквизиты" /><div className="form-grid"><Field label="Компания"><input defaultValue="Pocket Hospitality s.r.o." /></Field><Field label="VAT ID"><input defaultValue="SK2026123456" /></Field><Field label="E-mail для счетов" wide><input defaultValue="billing@pocket.app" /></Field></div></section><aside className="panel subscription-summary"><PanelTitle title="Ваш заказ" /><div className="subscription-summary-plan"><span><Sparkles size={18} /></span><div><strong>Pocket {plan.name}</strong><small>{billing === "yearly" ? "Ежегодная оплата" : "Ежемесячная оплата"}</small></div><b>{money(subtotal)}</b></div><dl><div><dt>Заведений в аккаунте</dt><dd>{venueCount}</dd></div><div><dt>Стоимость</dt><dd>{money(subtotal)}</dd></div><div><dt>VAT 20%</dt><dd>{money(tax)}</dd></div></dl><div className="subscription-total"><span>К оплате сегодня</span><strong>{money(total)}</strong></div><Button className="full" icon={ShieldCheck} disabled={activated || !planFitsVenueCount} onClick={activate}>{activated ? "Подписка подключена" : !planFitsVenueCount ? "Выберите подходящий тариф" : `Оплатить ${money(total)}`}</Button><p className="secure-note"><ShieldCheck size={14} />Безопасная оплата. Отмена в любой момент.</p></aside></div></>;
}


