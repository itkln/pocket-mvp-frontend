"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Minus, Plus, ShoppingBag, Utensils, X } from "lucide-react";
import { APIError } from "../../../lib/api-client";
import { getPublicVenueMenu, type PublicMenuCategory, type PublicMenuItem } from "../../../lib/public-catalog-api";
import { quotePublicOrder, submitPublicOrder, type CustomerOrder, type OrderInput, type OrderQuote } from "../../../lib/public-orders-api";
import type { AuthUser } from "../../../lib/auth-api";
import { useI18n } from "../i18n";

const formatMoney = (minor: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(minor / 100);

export function PublicOrderDialog({ venueID, venueName, initialMenu, user, locale, onClose }: {
  venueID: string; venueName: string; initialMenu: PublicMenuCategory[];
  user: AuthUser | null; locale: string; onClose: () => void;
}) {
  const { t } = useI18n();
  const [menu, setMenu] = useState(initialMenu);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"menu" | "checkout" | "confirmed">("menu");
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [name, setName] = useState(`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim());
  const [email, setEmail] = useState(user?.email ?? "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key, setKey] = useState(() => crypto.randomUUID());
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    closeRef.current?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled)") ?? [])];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused.current instanceof HTMLElement) previouslyFocused.current.focus();
    };
  }, [onClose]);

  const items = menu.flatMap((category) => category.items);
  const selected = items.filter((item) => quantities[item.id] > 0);
  const total = selected.reduce((sum, item) => sum + item.price_minor * quantities[item.id], 0);
  const currency = selected[0]?.currency ?? "EUR";
  const changeQuantity = (id: string, delta: number) => {
    setQuantities((current) => {
      const next = { ...current };
      const count = Math.max(0, Math.min(30, (next[id] ?? 0) + delta));
      if (count) next[id] = count; else delete next[id];
      return next;
    });
    setQuote(null);
    setKey(crypto.randomUUID());
    setError("");
  };
  const input = (): OrderInput => ({
    guest_name: name, guest_email: email, notes,
    items: selected.map((item) => ({ menu_item_id: item.id, quantity: quantities[item.id], expected_price_minor: item.price_minor })),
    idempotency_key: key,
  });
  const refreshMenu = async () => {
    const latest = await getPublicVenueMenu(venueID);
    setMenu(latest);
    const validIDs = new Set(latest.flatMap((category) => category.items.map((item) => item.id)));
    setQuantities((current) => Object.fromEntries(Object.entries(current).filter(([id]) => validIDs.has(id))));
  };
  const errorMessage = (caught: unknown) => {
    if (caught instanceof APIError) {
      if (caught.code === "price_changed") return "Цена изменилась. Проверьте корзину и продолжите снова.";
      if (caught.code === "item_unavailable") return "Одно из блюд больше недоступно. Корзина обновлена.";
      if (caught.code === "idempotency_conflict") return "Заказ изменился. Проверьте корзину и отправьте его снова.";
      if (caught.code === "invalid_input") return "Проверьте имя, почту и выбранные блюда.";
    }
    return "Не удалось оформить заказ. Попробуйте ещё раз.";
  };
  const calculate = async () => {
    if (!selected.length || busy) return;
    setBusy(true); setError("");
    try { setQuote(await quotePublicOrder(venueID, input())); setPhase("checkout"); }
    catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof APIError && ["price_changed", "item_unavailable"].includes(caught.code)) {
        try { await refreshMenu(); } catch { /* Keep the server error visible. */ }
      }
    } finally { setBusy(false); }
  };
  const submit = async () => {
    if (!quote || busy || name.trim().length < 2 || !email.includes("@")) return;
    setBusy(true); setError("");
    try { setOrder(await submitPublicOrder(venueID, input(), !user)); setPhase("confirmed"); }
    catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof APIError && ["price_changed", "item_unavailable", "idempotency_conflict"].includes(caught.code)) {
        setPhase("menu"); setQuote(null); setKey(crypto.randomUUID());
        try { await refreshMenu(); } catch { /* Keep the server error visible. */ }
      }
    } finally { setBusy(false); }
  };
  const card = (item: PublicMenuItem) => <article className="public-order-product" key={item.id}>
    <div className="public-order-photo" style={item.image_url ? { backgroundImage: `url(${JSON.stringify(item.image_url)})` } : undefined}>{!item.image_url && <Utensils size={26} aria-hidden="true" />}</div>
    <div className="public-order-product-copy"><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}<b>{formatMoney(item.price_minor, item.currency, locale)}</b></div>
    <div className="public-order-quantity"><button type="button" aria-label={`Убрать ${item.name}`} disabled={!quantities[item.id]} onClick={() => changeQuantity(item.id, -1)}><Minus size={17} /></button><span>{quantities[item.id] ?? 0}</span><button type="button" aria-label={`Добавить ${item.name}`} disabled={quantities[item.id] >= 30} onClick={() => changeQuantity(item.id, 1)}><Plus size={17} /></button></div>
  </article>;

  return <div className="public-order-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section ref={dialogRef} className="public-order-dialog" role="dialog" aria-modal="true" aria-labelledby="public-order-title">
      <header className="public-order-header">
        {phase === "checkout" && <button type="button" aria-label="Назад к меню" onClick={() => { setPhase("menu"); setQuote(null); setKey(crypto.randomUUID()); }}><ArrowLeft size={22} /></button>}
        <div><h2 id="public-order-title">{phase === "confirmed" ? "Заказ оформлен" : phase === "checkout" ? "Проверьте заказ" : "Заказать блюда"}</h2><p>{venueName}</p></div>
        <button ref={closeRef} type="button" aria-label="Закрыть" disabled={busy} onClick={onClose}><X size={22} /></button>
      </header>
      {phase === "confirmed" && order ? <div className="public-order-confirmed" role="status"><ShoppingBag size={34} /><h3>{t("Заказ №{number} принят", { number: order.number })}</h3><p>{t("Заказ отправлен в {name}.", { name: venueName })}</p><strong>{formatMoney(order.total_minor, order.currency, locale)}</strong><p>Оплата в заведении.</p><a href={`/${locale}/history`}>Мои заказы</a><button type="button" onClick={onClose}>Вернуться к заведению</button></div> : phase === "menu" ? <div className="public-order-columns">
        <div className="public-order-menu"><nav aria-label="Категории меню">{menu.map((category) => <button type="button" key={category.id} onClick={() => document.getElementById(`order-category-${category.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{category.name}</button>)}</nav><div className="public-order-menu-list">{menu.map((category) => <section id={`order-category-${category.id}`} key={category.id}><h3>{category.name}</h3><div>{category.items.map(card)}</div></section>)}</div></div>
        <aside className="public-order-cart"><h3>Ваш заказ</h3>{selected.length ? <div className="public-order-cart-lines">{selected.map((item) => <div key={item.id}><span>{item.name} × {quantities[item.id]}</span><strong>{formatMoney(item.price_minor * quantities[item.id], item.currency, locale)}</strong></div>)}</div> : <p>Выберите блюда из меню.</p>}<div className="public-order-cart-footer"><strong>Итого: {formatMoney(total, currency, locale)}</strong>{error && <p role="alert">{error}</p>}<button type="button" disabled={!selected.length || busy} onClick={() => void calculate()}>{busy ? "Считаем..." : "Продолжить"}</button></div></aside>
      </div> : <div className="public-order-checkout"><div className="public-order-checkout-main"><h3>Блюда</h3>{quote?.items.map((item) => <div className="public-order-checkout-line" key={item.menu_item_id}><span>{item.name} × {item.quantity}</span><strong>{formatMoney(item.total_minor, quote.currency, locale)}</strong></div>)}<h3>Контакты</h3><label>Имя<input value={name} maxLength={120} onChange={(event) => { setName(event.target.value); setKey(crypto.randomUUID()); }} autoComplete="name" /></label><label>Почта<input type="email" value={email} maxLength={254} onChange={(event) => { setEmail(event.target.value); setKey(crypto.randomUUID()); }} autoComplete="email" /></label><label>Комментарий<textarea value={notes} maxLength={500} onChange={(event) => { setNotes(event.target.value); setKey(crypto.randomUUID()); }} /></label><p>Оплата в заведении.</p></div><aside className="public-order-cart"><h3>Итого</h3><strong>{formatMoney(quote?.total_minor ?? 0, quote?.currency ?? "EUR", locale)}</strong><div className="public-order-cart-footer">{error && <p role="alert">{error}</p>}<button type="button" disabled={busy || name.trim().length < 2 || !email.includes("@") || !quote} onClick={() => void submit()}>{busy ? "Отправляем..." : "Заказать"}</button></div></aside></div>}
    </section>
  </div>;
}
