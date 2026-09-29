"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag } from "lucide-react";
import type { AuthUser } from "../../../lib/auth-api";
import { APIError } from "../../../lib/api-client";
import { createPublicReservation, getPublicVenueMenu, getVenueAvailability, type CreatedReservation, type PublicMenuCategory, type VenueAvailability } from "../../../lib/public-catalog-api";
import { localeTags, useI18n } from "../i18n";

type Step = "schedule" | "preorder" | "checkout" | "guest-contact";
type Period = "day" | "evening";
const asDay = (value: string) => new Date(`${value}T12:00:00Z`);
const isoDay = (value: Date) => value.toISOString().slice(0, 10);
const addDays = (value: string, count: number) => {
  const result = asDay(value);
  result.setUTCDate(result.getUTCDate() + count);
  return isoDay(result);
};
const monthStart = (value: string) => `${value.slice(0, 7)}-01`;
const moveMonth = (value: string, count: number) => {
  const result = asDay(value);
  result.setUTCMonth(result.getUTCMonth() + count, 1);
  return isoDay(result);
};
const calendarDays = (month: string) => {
  const offset = (asDay(month).getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => addDays(month, index - offset));
};

export function DesktopBookingFlow({ venueID, venueName, menu, preorderEnabled, user, quantities, onQuantityChange, menuModeOpen, onMenuModeChange, onMenuUpdated }: {
  venueID: string;
  venueName: string;
  menu: PublicMenuCategory[];
  preorderEnabled: boolean;
  user: AuthUser | null;
  quantities: Record<string, number>;
  onQuantityChange: (id: string, delta: number) => void;
  menuModeOpen: boolean;
  onMenuModeChange: (open: boolean) => void;
  onMenuUpdated: (categories: PublicMenuCategory[]) => void;
}) {
  const { locale, t } = useI18n();
  const [step, setStep] = useState<Step>("schedule");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState("");
  const [period, setPeriod] = useState<Period>("day");
  const [availability, setAvailability] = useState<VenueAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState<CreatedReservation | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const wasMenuOpen = useRef(false);
  const submissionKey = useRef(crypto.randomUUID());

  useEffect(() => {
    const controller = new AbortController();
    getVenueAvailability(venueID, date, guests, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setAvailability(result);
        if (!date) { setDate(result.date); setMonth(monthStart(result.date)); }
        setLoading(false);
        setAvailabilityError(false);
      })
      .catch(() => { if (!controller.signal.aborted) { setLoading(false); setAvailabilityError(true); } });
    return () => controller.abort();
  }, [venueID, date, guests, revision]);

  useEffect(() => {
    if (!calendarOpen) return;
    const outside = (event: PointerEvent) => { if (!calendarRef.current?.contains(event.target as Node)) setCalendarOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setCalendarOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [calendarOpen]);

  useEffect(() => {
    if (wasMenuOpen.current && !menuModeOpen) menuTriggerRef.current?.focus();
    wasMenuOpen.current = menuModeOpen;
  }, [menuModeOpen]);

  useEffect(() => { submissionKey.current = crypto.randomUUID(); }, [date, guests, time, quantities, guestName, guestEmail, comment, menu, user?.id]);

  const current = availability?.date === date ? availability : null;
  const daySlots = current?.slots.filter((slot) => slot.time < "18:00") ?? [];
  const eveningSlots = current?.slots.filter((slot) => slot.time >= "18:00") ?? [];
  const activePeriod = period === "day" && !daySlots.length ? "evening" : period === "evening" && !eveningSlots.length ? "day" : period;
  const selectedSlot = current?.slots.find((slot) => slot.time === time);
  const today = current ? (() => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: current.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  })() : date;
  const latest = today ? addDays(today, 30) : date;
  const catalog = menu.flatMap((category) => category.items);
  const selectedItems = Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ id, quantity, item: catalog.find((candidate) => candidate.id === id) }));
  const missingItems = selectedItems.some(({ item }) => !item);
  const totalMinor = selectedItems.reduce((sum, { item, quantity }) => sum + (item?.price_minor ?? 0) * quantity, 0);
  const validGuestContact = guestName.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());
  const currency = selectedItems.find(({ item }) => item)?.item?.currency ?? "EUR";
  const formatMoney = (minor: number, code = currency) => new Intl.NumberFormat(localeTags[locale], { style: "currency", currency: code }).format(minor / 100);
  const dateLabel = date ? new Intl.DateTimeFormat(localeTags[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(asDay(date)) : "";
  const changeQuantity = (id: string, delta: number) => { onQuantityChange(id, delta); setSubmitError(""); };
  const changeDate = (value: string) => {
    if (value < today || value > latest) return;
    setDate(value); setTime(""); setAvailability(null); setLoading(true);
    setMonth(monthStart(value)); setCalendarOpen(false);
  };
  const changeGuests = (value: number) => {
    setGuests(value); setTime(""); setAvailability(null); setLoading(true);
  };
  const submit = async (withPreorder: boolean) => {
    if (!selectedSlot || submitting || (withPreorder && (selectedItems.length === 0 || missingItems)) || (!user && !validGuestContact)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await createPublicReservation(venueID, {
        starts_at: selectedSlot.starts_at, guests,
        guest_name: user ? "" : guestName.trim(), guest_email: user ? "" : guestEmail.trim(), guest_phone: "", notes: comment.trim(),
        items: withPreorder ? selectedItems.flatMap(({ item, quantity }) => item ? [{ menu_item_id: item.id, quantity, expected_price_minor: item.price_minor }] : []) : [],
        idempotency_key: submissionKey.current,
      });
      setConfirmed(result);
    } catch (caught) {
      if (caught instanceof APIError && (caught.code === "price_changed" || caught.code === "item_unavailable")) {
        try {
          onMenuUpdated(await getPublicVenueMenu(venueID));
          setSubmitError(caught.code === "price_changed" ? t("Цена изменилась. Проверьте новую сумму и подтвердите ещё раз") : t("Одно из блюд больше недоступно. Уберите его из предзаказа"));
          if (caught.code === "item_unavailable") setStep("preorder");
        } catch { setSubmitError(t("Не удалось обновить меню. Попробуйте ещё раз")); }
      } else if (caught instanceof APIError && caught.code === "slot_unavailable") {
        setStep("schedule"); setTime(""); setRevision((value) => value + 1);
        setSubmitError(t("Это время уже занято. Выберите другое"));
      } else {
        setSubmitError(t("Не удалось сохранить бронь. Попробуйте ещё раз"));
      }
    } finally { setSubmitting(false); }
  };

  const goBack = () => {
    if (step === "checkout" || step === "guest-contact") setStep(preorderEnabled ? "preorder" : "schedule");
    else if (step === "preorder") setStep("schedule");
    setSubmitError("");
  };
  const selectedList = selectedItems.length ? <div className="desktop-booking-selected-list">{selectedItems.map(({ id, quantity, item }) => <article key={id}>
    {item?.image_url ? <div className="desktop-booking-item-image" style={{ backgroundImage: `url(${JSON.stringify(item.image_url)})` }} /> : <div className="desktop-booking-item-image placeholder"><ShoppingBag size={20} /></div>}
    <div><strong>{item?.name ?? t("Блюдо недоступно")}</strong><small>{item ? formatMoney(item.price_minor * quantity, item.currency) : ""}</small></div>
    <div className="desktop-booking-quantity"><button type="button" aria-label={`${t("Убрать")} ${item?.name ?? id}`} onClick={() => changeQuantity(id, -1)}><Minus size={15} /></button><b>{quantity}</b><button type="button" aria-label={`${t("Добавить")} ${item?.name ?? id}`} disabled={!item} onClick={() => changeQuantity(id, 1)}><Plus size={15} /></button></div>
  </article>)}</div> : <div className="desktop-booking-empty"><ShoppingBag size={30} aria-hidden="true" /><strong>{t("В предзаказе пока пусто")}</strong><p>{t("Добавьте блюда из меню или забронируйте без предзаказа")}</p></div>;

  return <aside className="venue-booking-card venue-public-booking desktop-booking-flow" aria-labelledby="venue-desktop-booking-title">
    <header className="desktop-booking-header">{step !== "schedule" && !confirmed && <button type="button" aria-label={t("Назад")} onClick={goBack}><ArrowLeft size={19} /></button>}<h2 id="venue-desktop-booking-title">{confirmed ? t("Бронь подтверждена") : step === "schedule" ? t("Бронирование") : step === "preorder" ? t("Предзаказ") : step === "guest-contact" ? t("Контакты") : t("Подтверждение брони")}</h2></header>
    {confirmed ? <div className="venue-booking-confirmed" role="status"><strong>{venueName}</strong><p>{t("Номер брони")}: {confirmed.code}</p><p>{new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "full", timeStyle: "short", timeZone: availability?.timezone ?? "Europe/Bratislava" }).format(new Date(confirmed.starts_at))}</p><p>{t("Гостей: {count}", { count: confirmed.guest_count })}</p>{confirmed.preorder_total_minor > 0 && <p>{t("Предзаказ")}: {formatMoney(confirmed.preorder_total_minor, confirmed.currency)} · {t("Оплата в заведении")}</p>}</div> : <>
      {step === "schedule" && <>
        <div className="venue-booking-toolbar"><div className="venue-date-picker" ref={calendarRef}>
          <button type="button" className={`venue-date-trigger ${calendarOpen ? "active" : ""}`} aria-label={t("Выбрать дату")} aria-expanded={calendarOpen} aria-haspopup="dialog" disabled={!date} onClick={() => setCalendarOpen((value) => !value)}><CalendarDays size={17} /><span>{date ? new Intl.DateTimeFormat(localeTags[locale], { day: "numeric", month: "short", timeZone: "UTC" }).format(asDay(date)) : t("Дата")}</span><ChevronDown size={16} /></button>
          {calendarOpen && month && <div className="venue-calendar-popover" role="dialog" aria-label={t("Выбор даты")}><div className="venue-calendar-header"><strong>{new Intl.DateTimeFormat(localeTags[locale], { month: "long", year: "numeric", timeZone: "UTC" }).format(asDay(month))}</strong><div><button type="button" aria-label={t("Предыдущий месяц")} disabled={month <= monthStart(today)} onClick={() => setMonth(moveMonth(month, -1))}><ChevronLeft size={17} /></button><button type="button" aria-label={t("Следующий месяц")} disabled={moveMonth(month, 1) > monthStart(latest)} onClick={() => setMonth(moveMonth(month, 1))}><ChevronRight size={17} /></button></div></div><div className="venue-calendar-weekdays" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(localeTags[locale], { weekday: "short", timeZone: "UTC" }).format(asDay(addDays("2026-09-28", index)))).map((label, index) => <span key={index}>{label}</span>)}</div><div className="venue-calendar-grid">{calendarDays(month).map((value) => <button type="button" key={value} className={`${value.slice(0, 7) !== month.slice(0, 7) ? "outside" : ""} ${value === date ? "selected" : ""}`} aria-label={new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "full", timeZone: "UTC" }).format(asDay(value))} aria-pressed={value === date} disabled={value < today || value > latest} onClick={() => changeDate(value)}>{Number(value.slice(8))}</button>)}</div></div>}
        </div><div className="venue-guests"><button type="button" aria-label={t("Уменьшить количество гостей")} disabled={guests === 1} onClick={() => changeGuests(guests - 1)}><Minus size={16} /></button><strong>{t("Гостей: {count}", { count: guests })}</strong><button type="button" aria-label={t("Увеличить количество гостей")} disabled={guests === 20} onClick={() => changeGuests(guests + 1)}><Plus size={16} /></button></div></div>
        <div className="venue-booking-scroll">{loading ? <p role="status">{t("Ищем свободные столы...")}</p> : availabilityError ? <div role="alert"><p>{t("Не удалось проверить свободные столы")}</p><button type="button" onClick={() => { setLoading(true); setAvailabilityError(false); setRevision((value) => value + 1); }}>{t("Повторить")}</button></div> : current?.slots.length ? <><div className="venue-time-periods" role="group" aria-label={t("Свободное время")}><button type="button" aria-pressed={activePeriod === "day"} disabled={!daySlots.length} className={activePeriod === "day" ? "active" : ""} onClick={() => { setPeriod("day"); setTime(""); }}>{t("День")}</button><button type="button" aria-pressed={activePeriod === "evening"} disabled={!eveningSlots.length} className={activePeriod === "evening" ? "active" : ""} onClick={() => { setPeriod("evening"); setTime(""); }}>{t("Вечер")}</button></div><div className="venue-time-grid">{(activePeriod === "day" ? daySlots : eveningSlots).map((slot) => <button type="button" key={slot.time} className={time === slot.time ? "active" : ""} aria-pressed={time === slot.time} onClick={() => { setTime(slot.time); setSubmitError(""); }}>{slot.time}</button>)}</div></> : <p role="status">{t("На эту дату свободных столов нет")}</p>}</div>
        {submitError && <p className="venue-booking-submit-error" role="alert">{submitError}</p>}
        <button type="button" className="venue-booking-submit desktop-booking-footer" disabled={!selectedSlot} onClick={() => { if (preorderEnabled) setStep("preorder"); else if (user) void submit(false); else setStep("guest-contact"); setSubmitError(""); }}>{t("Продолжить")}</button>
      </>}
      {step === "preorder" && <><div className="desktop-booking-summary"><strong>{venueName}</strong><span>{dateLabel} · {time} · {t("Гостей: {count}", { count: guests })}</span></div><div className="desktop-booking-preorder-content"><div className="desktop-booking-preorder-heading"><h3>{t("Предзаказ блюд")}</h3><button ref={menuTriggerRef} type="button" onClick={() => onMenuModeChange(true)}><Plus size={17} />{t("Добавить блюда")}</button></div>{selectedList}</div>{submitError && <p className="venue-booking-submit-error" role="alert">{submitError}</p>}<div className="desktop-booking-actions">{selectedItems.length ? <button type="button" className="venue-booking-submit" disabled={missingItems} onClick={() => { setStep("checkout"); setSubmitError(""); }}>{t("Далее")} {formatMoney(totalMinor)}</button> : <button type="button" className="venue-booking-submit" disabled={submitting} onClick={() => user ? void submit(false) : setStep("guest-contact")}>{submitting ? t("Сохраняем бронь...") : t("Забронировать без предзаказа")}</button>}</div></>}
      {(step === "checkout" || step === "guest-contact") && <div className="desktop-booking-checkout"><div className="desktop-booking-summary"><strong>{venueName}</strong><span>{dateLabel} · {time} · {t("Гостей: {count}", { count: guests })}</span></div>{step === "checkout" && <><h3>{t("Ваш заказ")}</h3>{selectedList}<div className="desktop-booking-total"><span>{t("Итого к оплате")}</span><strong>{formatMoney(totalMinor)}</strong></div></>}{user ? <div className="desktop-booking-account"><h3>{t("Контакты")}</h3><strong>{[user.first_name, user.last_name].filter(Boolean).join(" ")}</strong><span>{user.email}</span>{user.phone && <span>{user.phone}</span>}</div> : <div className="venue-booking-contact"><h3>{t("Контакты")}</h3><label>{t("Имя")}<input value={guestName} autoComplete="name" maxLength={120} onChange={(event) => setGuestName(event.target.value)} /></label><label>{t("Эл. почта")}<input value={guestEmail} type="email" autoComplete="email" maxLength={254} onChange={(event) => setGuestEmail(event.target.value)} /></label></div>}<label className="desktop-booking-comment">{t("Комментарий к ресторану")}<textarea value={comment} maxLength={500} placeholder={t("Комментарий к ресторану")} onChange={(event) => setComment(event.target.value)} /></label>{step === "checkout" && <div className="desktop-booking-payment"><h3>{t("Оплата предзаказа")}</h3><strong>{t("Оплата в заведении")}</strong><p>{t("Онлайн-оплата пока недоступна. Предзаказ сохранится вместе с бронью.")}</p></div>}{submitError && <p className="venue-booking-submit-error" role="alert">{submitError}</p>}<button type="button" className="venue-booking-submit" disabled={submitting || (!user && !validGuestContact) || (step === "checkout" && (missingItems || selectedItems.length === 0))} onClick={() => void submit(step === "checkout")}>{submitting ? t("Сохраняем бронь...") : submitError.includes(t("Цена изменилась")) ? t("Подтвердить новую сумму") : step === "guest-contact" ? t("Забронировать без предзаказа") : t("Подтвердить бронь и предзаказ")}</button></div>}
    </>}
  </aside>;
}
