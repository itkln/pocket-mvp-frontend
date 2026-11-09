"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Globe, Menu, ReceiptText, Utensils } from "lucide-react";
import { APIError } from "../../../lib/api-client";
import { getPublicVenue, type PublicVenue } from "../../../lib/public-catalog-api";
import { getTableBill, resolveTableQR, type TableBill, type TableContext } from "../../../lib/table-orders-api";
import { localeOptions, useI18n } from "../i18n";
import { VenueLogo } from "../venue-logo";

const qrError = (error: unknown) => error instanceof APIError && error.code === "qr_invalid"
  ? "QR-код недействителен. Попросите сотрудника заведения показать новый код."
  : "Не удалось открыть стол. Попробуйте ещё раз.";

export function TableEntry({ token, basePath, billPage = false, onSettings }: {
  token: string; basePath: string; billPage?: boolean; onSettings: (page: "menu" | "language") => void;
}) {
  const { locale, t } = useI18n();
  const [context, setContext] = useState<{ table: TableContext; venue: PublicVenue }>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const table = await resolveTableQR(token, controller.signal);
        const venue = await getPublicVenue(table.venue_id, controller.signal);
        if (!controller.signal.aborted) setContext({ table, venue });
      } catch (error) { if (!controller.signal.aborted) setError(qrError(error)); }
    };
    void load();
    return () => controller.abort();
  }, [token, retry]);
  const toolbar = <nav className="dish-table-toolbar" aria-label={t("Навигация")}>
    {billPage ? <Link className="dish-table-tool" href={basePath} aria-label={t("Назад к столу")}><ArrowLeft size={22}/></Link>
      : <button className="dish-table-tool" type="button" aria-label={t("Настройки меню")} aria-haspopup="dialog" onClick={() => onSettings("menu")}><Menu size={22}/></button>}
    <button className="dish-table-tool dish-table-language" type="button" aria-label={t("Язык интерфейса")} aria-haspopup="dialog" onClick={() => onSettings("language")}><Globe size={19}/>{localeOptions.find(option => option.value === locale)?.short}</button>
  </nav>;
  if (error || !context) return <section className="dish-table-state">{toolbar}<div className="spots-catalog-status" role={error ? "alert" : "status"}>
    {error ? <><ReceiptText size={36}/><h1>{t("Не удалось открыть стол")}</h1><p>{t(error)}</p><button className="button primary" type="button" onClick={() => { setError(""); setRetry(value => value + 1); }}>{t("Повторить")}</button></> : t("Открываем ваш стол...")}
  </div></section>;
  const { table, venue } = context;
  if (billPage) return <article className="dish-table-bill">{toolbar}
    <CurrentTableBill token={token} basePath={basePath}/>
  </article>;
  return <article className="dish-table-home" aria-labelledby="dish-table-name">
    <div className={`dish-table-hero ${venue.image_url ? "has-photo" : ""}`}>
      {venue.image_url && <Image className="dish-table-cover" src={venue.image_url} alt="" fill unoptimized priority sizes="(max-width: 760px) 100vw, 960px"/>}
      <div className="dish-table-shade"/>{toolbar}
      <div className="dish-table-identity">
        <VenueLogo venueID={venue.id} name={venue.name} imageURL={venue.logo_url}/>
        <p className="dish-table-eyebrow">{t("Добро пожаловать")}</p>
        <h1 id="dish-table-name">{venue.name}</h1>
        <span className="dish-table-number"><Utensils size={17} aria-hidden="true"/>{t("Стол {number}", { number: table.table_identifier })}</span>
      </div>
    </div>
    <div className="dish-table-actions">
      <Link className="dish-table-action primary" href={`${basePath}/bill`}><ReceiptText size={24} aria-hidden="true"/><strong>{t("Оплатить счёт")}</strong><ArrowRight size={21} aria-hidden="true"/></Link>
      <Link className="dish-table-action secondary" href={`${basePath}/menu`}><Utensils size={24} aria-hidden="true"/><strong>{t("Заказать за стол")}</strong><ArrowRight size={21} aria-hidden="true"/></Link>
      <div className="dish-table-brand"><Image src="/logo.svg" width={22} height={22} alt=""/><span>Pocket Dish</span></div>
    </div>
  </article>;
}

function CurrentTableBill({ token, basePath }: { token: string; basePath: string }) {
  const { locale, t } = useI18n();
  const [bill, setBill] = useState<TableBill | null>();
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const result = await getTableBill(token, controller.signal);
        if (!controller.signal.aborted) { setBill(result); setError(""); }
      } catch (error) {
        if (!controller.signal.aborted) { setBill(undefined); setError(error instanceof APIError && error.code === "qr_invalid" ? qrError(error) : "Не удалось загрузить счёт. Попробуйте ещё раз."); }
      } finally { refreshing = false; }
    };
    void refresh();
    const onVisible = () => { if (document.visibilityState !== "hidden") void refresh(); };
    const timer = window.setInterval(onVisible, 15000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [token]);
  if (error) return <div className="dish-table-bill-card" role="alert"><p>{t(error)}</p></div>;
  if (bill === undefined) return <div className="dish-table-bill-card" role="status">{t("Загружаем счёт...")}</div>;
  if (!bill || !bill.items.length) return <section className="dish-table-bill-card dish-table-empty">
    <span className="dish-table-empty-icon"><ReceiptText size={34} aria-hidden="true"/></span><h2>{t("Пока нет заказов")}</h2><p>{t("Выберите блюда в меню — они появятся в общем счёте.")}</p>
    <Link className="dish-table-action primary" href={`${basePath}/menu`}><Utensils size={22}/><strong>{t("Заказать за стол")}</strong><ArrowRight size={20}/></Link>
    <button className="dish-table-action secondary" type="button" disabled><ReceiptText size={22}/><strong>{t("Оплатить счёт")}</strong></button>
  </section>;
  const money = (amount: number) => new Intl.NumberFormat(locale, { style: "currency", currency: bill.currency }).format(amount / 100);
  return <section className="dish-table-bill-card" aria-label={t("Общий счёт")}>
    <ul className="dish-table-bill-items">{bill.items.map((item, index) => <li key={`${item.order_id}-${index}`}><div><strong>{item.name}</strong><small>{t("Заказ №{number}", { number: item.order_number })} · {item.quantity} × {money(item.unit_price_minor)}</small></div><strong>{money(item.total_minor)}</strong></li>)}</ul>
    <dl className="dish-table-totals"><div><dt>{t("Блюда")}</dt><dd>{money(bill.subtotal_minor)}</dd></div>
      {([["Чаевые", bill.tip_minor], ["Налог", bill.tax_minor], ["Сервисный сбор", bill.service_fee_minor]] as const).filter(([, amount]) => amount !== 0).map(([label, amount]) => <div key={label}><dt>{t(label)}</dt><dd>{money(amount)}</dd></div>)}
      <div className="dish-table-total"><dt>{t("Итого")}</dt><dd>{money(bill.total_minor)}</dd></div>
    </dl>
  </section>;
}
