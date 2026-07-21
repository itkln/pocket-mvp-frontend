"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, Store } from "lucide-react";
import { getSubscription, updateSubscription, type OwnerSubscription } from "../../../lib/owner-api";
import { Button, PageHeader, money } from "../ui";

const plans = [
  { id: "start", name: "Start", price: 29, description: "Для небольшого заведения", limit: 1, features: ["Онлайн-меню", "QR-коды столов", "До 5 сотрудников"] },
  { id: "business", name: "Business", price: 69, description: "Для растущей команды", limit: 3, features: ["Все возможности Start", "Аналитика и отзывы", "Брони и предзаказы"] },
  { id: "pro", name: "Pro", price: 129, description: "Для сети заведений", limit: Number.POSITIVE_INFINITY, features: ["Все возможности Business", "Без ограничения заведений", "Приоритетная поддержка"] },
] as const;

export function SubscriptionScreen({ venueCount, notify }: { venueCount: number; notify: (message: string) => void }) {
  const [subscription, setSubscription] = useState<OwnerSubscription | null>(null);
  const [plan, setPlan] = useState<OwnerSubscription["plan"]>("business");
  const [billing, setBilling] = useState<OwnerSubscription["billing_cycle"]>("yearly");
  const [saving, setSaving] = useState(false);
  useEffect(() => { const timeout = window.setTimeout(() => void getSubscription().then((item) => { setSubscription(item); if (item) { setPlan(item.plan); setBilling(item.billing_cycle); } }).catch((error) => notify(error instanceof Error ? error.message : "Не удалось загрузить подписку")), 0); return () => window.clearTimeout(timeout); }, [notify]);
  const activate = async () => { setSaving(true); try { const item = await updateSubscription(plan, billing); setSubscription(item); notify("Тариф сохранен"); } finally { setSaving(false); } };
  const selected = plans.find((item) => item.id === plan) ?? plans[1];
  return <><PageHeader title="Подписка" subtitle="Тариф рабочего пространства Pocket." /><section className={"subscription-status " + (subscription ? "active" : "")}><span><Sparkles size={22} /></span><div><strong>{subscription ? "Pocket " + selected.name : "Подписка не выбрана"}</strong><p>{subscription?.trial_ends_at ? "Пробный период до " + new Date(subscription.trial_ends_at).toLocaleDateString("ru-RU") : "Выберите тариф и начните 14-дневный пробный период."}</p></div>{subscription && <b>{subscription.status === "trialing" ? "Пробный период" : subscription.status}</b>}</section><div className="subscription-heading"><div><h2>Выберите тариф</h2><p>Тариф можно изменить по мере роста команды.</p></div><div className="segmented billing-toggle"><button className={billing === "monthly" ? "active" : ""} onClick={() => setBilling("monthly")}>Ежемесячно</button><button className={billing === "yearly" ? "active" : ""} onClick={() => setBilling("yearly")}>Ежегодно</button></div></div><section className="subscription-plans">{plans.map((item) => { const incompatible = item.limit < venueCount; return <button className={"subscription-plan " + (plan === item.id ? "selected" : "") + (incompatible ? " incompatible" : "")} key={item.id} disabled={incompatible} onClick={() => setPlan(item.id)}><div className="plan-title"><div><strong>{item.name}</strong><span>{item.description}</span></div>{plan === item.id && <Check size={18} />}</div><div className="plan-price"><strong>{money(item.price)}</strong><span>/ месяц</span></div><ul>{item.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul><small><Store size={14} />{Number.isFinite(item.limit) ? "До " + item.limit + " заведений" : "Без ограничений"}</small></button>; })}</section><div className="subscription-actions"><p>{billing === "yearly" ? "При ежегодной оплате два месяца бесплатно." : "Списание один раз в месяц."}</p><Button icon={Sparkles} disabled={saving || selected.limit < venueCount} onClick={() => void activate()}>{saving ? "Сохраняем..." : subscription ? "Изменить тариф" : "Начать пробный период"}</Button></div></>;
}
