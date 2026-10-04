"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { APIError } from "../../../lib/api-client";
import { createPublicReservation, getPublicVenueMenu, getSavedPublicReservation, getVenueAvailability, type CreatedReservation, type PublicMenuCategory, type VenueAvailability } from "../../../lib/public-catalog-api";
import { localeTags, useI18n } from "../i18n";

const day = (value: string) => new Date(`${value}T12:00:00Z`);
const isoDay = (value: Date) => value.toISOString().slice(0, 10);
const addDays = (value: string, count: number) => {
  const date = day(value);
  date.setUTCDate(date.getUTCDate() + count);
  return isoDay(date);
};
const monthStart = (value: string) => `${value.slice(0, 7)}-01`;
const moveMonth = (value: string, count: number) => {
  const date = day(value);
  date.setUTCMonth(date.getUTCMonth() + count, 1);
  return isoDay(date);
};
const calendarDays = (month: string) => {
  const date = day(month);
  const offset = (date.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => addDays(month, index - offset));
};
const wishOptions = [
  { id: "date", icon: "🌹", label: "Свидание" },
  { id: "birthday", icon: "🎂", label: "День рождения" },
  { id: "children", icon: "🧸", label: "С детьми" },
] as const;
type TimePeriod = "day" | "evening";
const periodForTime = (time: string): TimePeriod => time < "18:00" ? "day" : "evening";

export function BookingPicker({ venueID, menu = [], preorderEnabled = false }: { venueID: string; menu?: PublicMenuCategory[]; preorderEnabled?: boolean }) {
  const { locale, t } = useI18n();
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState("");
  const [period, setPeriod] = useState<TimePeriod>("day");
  const [wishes, setWishes] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [availability, setAvailability] = useState<VenueAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [revision, setRevision] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [updatedMenu, setUpdatedMenu] = useState<PublicMenuCategory[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState<CreatedReservation | null>(null);
  const submissionKey = useRef(crypto.randomUUID());

  useEffect(() => {
    let active = true;
    void getSavedPublicReservation(venueID).then((saved) => { if (active && saved) setConfirmed(saved); });
    return () => { active = false; };
  }, [venueID]);
  const calendarRef = useRef<HTMLDivElement>(null);
  const formatter = new Intl.DateTimeFormat(localeTags[locale], { day: "numeric", month: "short", timeZone: "UTC" });
  const longFormatter = new Intl.DateTimeFormat(localeTags[locale], { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const monthFormatter = new Intl.DateTimeFormat(localeTags[locale], { month: "long", year: "numeric", timeZone: "UTC" });

  useEffect(() => {
    const controller = new AbortController();
    getVenueAvailability(venueID, date, guests, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setAvailability(result);
        if (!date) { setDate(result.date); setMonth(monthStart(result.date)); }
        setLoading(false);
        setError(false);
      })
      .catch(() => { if (!controller.signal.aborted) { setLoading(false); setError(true); } });
    return () => controller.abort();
  }, [venueID, date, guests, revision]);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visible); };
  }, []);

  useEffect(() => {
    if (!calendarOpen) return;
    const outside = (event: PointerEvent) => { if (!calendarRef.current?.contains(event.target as Node)) setCalendarOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setCalendarOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [calendarOpen]);

  const chooseDate = (value: string) => {
    if (!availability || value < today || value > latest) return;
    setDate(value);
    setTime("");
    setAvailability(null);
    setLoading(true);
    setMonth(monthStart(value));
    setCalendarOpen(false);
  };
  const changeGuests = (count: number) => {
    setGuests(count);
    setTime("");
    setAvailability(null);
    setLoading(true);
  };
  const current = availability?.date === date ? availability : null;
  const daySlots = current?.slots.filter((slot) => periodForTime(slot.time) === "day") ?? [];
  const eveningSlots = current?.slots.filter((slot) => periodForTime(slot.time) === "evening") ?? [];
  const activePeriod = period === "day" && !daySlots.length ? "evening" : period === "evening" && !eveningSlots.length ? "day" : period;
  const visibleSlots = activePeriod === "day" ? daySlots : eveningSlots;
  const selectedSlot = current?.slots.find((slot) => slot.time === time);
  const choosePeriod = (value: TimePeriod) => { if (value !== activePeriod) { setPeriod(value); setTime(""); } };
  const toggleWish = (id: string) => setWishes((selected) => selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  const today = current ? (() => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: current.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  })() : date;
  const latest = today ? addDays(today, 30) : date;
  const catalog = (updatedMenu ?? menu).flatMap((category) => category.items);
  const selectedItems = Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ item: catalog.find((item) => item.id === id), id, quantity }));
  const missingItems = selectedItems.some(({ item }) => !item);
  const preorderTotal = selectedItems.reduce((sum, { item, quantity }) => sum + (item?.price_minor ?? 0) * quantity, 0);
  const currency = selectedItems.find(({ item }) => item)?.item?.currency ?? "EUR";
  const formatMoney = (minor: number, moneyCurrency = currency) => new Intl.NumberFormat(localeTags[locale], { style: "currency", currency: moneyCurrency }).format(minor / 100);
  const changeQuantity = (id: string, delta: number) => {
    setQuantities((previous) => {
      const next = { ...previous };
      const quantity = Math.max(0, Math.min(30, (next[id] ?? 0) + delta));
      if (quantity) next[id] = quantity; else delete next[id];
      return next;
    });
    setSubmitError("");
  };
  useEffect(() => { submissionKey.current = crypto.randomUUID(); }, [date, guests, time]);
  const submit = async () => {
    if (!selectedSlot || !guestName.trim() || !guestPhone.trim() || missingItems || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const reservation = await createPublicReservation(venueID, {
        starts_at: selectedSlot.starts_at, guests, guest_name: guestName.trim(), guest_phone: guestPhone.trim(),
        guest_email: guestEmail.trim(), notes: [wishes.map((id) => wishOptions.find((wish) => wish.id === id)?.label).filter(Boolean).join(", "), comment.trim()].filter(Boolean).join(" · "),
        items: selectedItems.flatMap(({ item, quantity }) => item ? [{ menu_item_id: item.id, quantity, expected_price_minor: item.price_minor }] : []),
        idempotency_key: submissionKey.current,
      });
      setConfirmed(reservation);
    } catch (caught) {
      if (caught instanceof APIError && (caught.code === "price_changed" || caught.code === "item_unavailable")) {
        try {
          setUpdatedMenu(await getPublicVenueMenu(venueID));
          setSubmitError(caught.code === "price_changed" ? t("Цена изменилась. Проверьте новую сумму и подтвердите ещё раз") : t("Одно из блюд больше недоступно. Уберите его из предзаказа"));
        } catch { setSubmitError(t("Не удалось обновить меню. Попробуйте ещё раз")); }
      } else if (caught instanceof APIError && (caught.code === "slot_unavailable" || caught.code === "hold_expired")) {
        setTime(""); setRevision((value) => value + 1);
        setSubmitError(t("Это время уже занято. Выберите другое"));
      } else {
        setSubmitError(t("Не удалось сохранить бронь. Попробуйте ещё раз"));
      }
    } finally { setSubmitting(false); }
  };

  return <aside className="venue-booking-card venue-public-booking" aria-labelledby="venue-booking-title">
    <div className="venue-booking-heading"><h2 id="venue-booking-title">{t("Бронирование")}</h2></div>
    {confirmed ? <div className="venue-booking-confirmed" role="status"><strong>{t("Бронь подтверждена")}</strong><p>{t("Номер брони")}: {confirmed.code}</p>{confirmed.preorder_order_number ? <p>{t("Номер предзаказа")}: {confirmed.preorder_order_number}</p> : null}<p>{new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "full", timeStyle: "short", timeZone: availability?.timezone ?? "Europe/Bratislava" }).format(new Date(confirmed.starts_at))}</p>{confirmed.preorder_total_minor > 0 && <p>{t("Предзаказ")}: {formatMoney(confirmed.preorder_total_minor, confirmed.currency)}</p>}</div> : <>
    <div className="venue-booking-toolbar">
      <div className="venue-date-picker" ref={calendarRef}>
        <button type="button" className={`venue-date-trigger ${calendarOpen ? "active" : ""}`} aria-label={t("Выбрать дату")} aria-expanded={calendarOpen} aria-haspopup="dialog" disabled={!date} onClick={() => setCalendarOpen((value) => !value)}><CalendarDays size={17} /><span>{date ? formatter.format(day(date)) : t("Дата")}</span><ChevronDown className="venue-date-chevron" size={16} /></button>
        {calendarOpen && month && <div className="venue-calendar-popover" role="dialog" aria-label={t("Выбор даты")}>
          <div className="venue-calendar-header"><strong>{monthFormatter.format(day(month))}</strong><div><button type="button" aria-label={t("Предыдущий месяц")} disabled={month <= monthStart(today)} onClick={() => setMonth(moveMonth(month, -1))}><ChevronLeft size={17} /></button><button type="button" aria-label={t("Следующий месяц")} disabled={moveMonth(month, 1) > monthStart(latest)} onClick={() => setMonth(moveMonth(month, 1))}><ChevronRight size={17} /></button></div></div>
          <div className="venue-calendar-weekdays" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(localeTags[locale], { weekday: "short", timeZone: "UTC" }).format(day(addDays("2026-09-28", index)))).map((label, index) => <span key={index}>{label}</span>)}</div>
          <div className="venue-calendar-grid">{calendarDays(month).map((value) => <button type="button" key={value} className={`${value.slice(0, 7) !== month.slice(0, 7) ? "outside" : ""} ${value === date ? "selected" : ""}`} aria-label={longFormatter.format(day(value))} aria-pressed={value === date} disabled={value < today || value > latest} onClick={() => chooseDate(value)}>{Number(value.slice(8))}</button>)}</div>
        </div>}
      </div>
      <div className="venue-guests"><button type="button" aria-label={t("Уменьшить количество гостей")} disabled={guests === 1} onClick={() => changeGuests(guests - 1)}><Minus size={16} /></button><strong>{t("Гостей: {count}", { count: guests })}</strong><button type="button" aria-label={t("Увеличить количество гостей")} disabled={guests === 20} onClick={() => changeGuests(guests + 1)}><Plus size={16} /></button></div>
    </div>
    <div className="venue-booking-scroll">
    {loading ? <p role="status">{t("Ищем свободные столы...")}</p> : error ? <div role="alert"><p>{t("Не удалось проверить свободные столы")}</p><button type="button" onClick={() => { setLoading(true); setError(false); setRevision((value) => value + 1); }}>{t("Повторить")}</button></div> : current?.slots.length ? <>
      <div className="venue-time-periods" role="group" aria-label={t("Свободное время")}>
        <button type="button" aria-pressed={activePeriod === "day"} disabled={!daySlots.length} className={activePeriod === "day" ? "active" : ""} onClick={() => choosePeriod("day")}>{t("День")}</button>
        <button type="button" aria-pressed={activePeriod === "evening"} disabled={!eveningSlots.length} className={activePeriod === "evening" ? "active" : ""} onClick={() => choosePeriod("evening")}>{t("Вечер")}</button>
      </div>
      <div className="venue-time-grid">{visibleSlots.map((slot) => <button type="button" key={slot.time} className={time === slot.time ? "active" : ""} aria-pressed={time === slot.time} onClick={() => setTime(slot.time)}>{slot.time}</button>)}</div>
      {selectedSlot && <div className="venue-booking-wishes"><h3>{t("Пожелания к брони")}</h3><div className="venue-wish-options">{wishOptions.map((wish) => <button type="button" key={wish.id} className={wishes.includes(wish.id) ? "active" : ""} aria-pressed={wishes.includes(wish.id)} onClick={() => toggleWish(wish.id)}><span aria-hidden="true">{wish.icon}</span>{t(wish.label)}</button>)}</div><textarea aria-label={t("Комментарий к ресторану")} placeholder={t("Комментарий к ресторану")} value={comment} maxLength={500} onChange={(event) => setComment(event.target.value)} /></div>}
      {preorderEnabled && <div className="venue-booking-menu"><h3>{t("Предзаказ блюд")}</h3>{catalog.length ? <div className="venue-booking-menu-items">{catalog.map((item) => <div key={item.id} className="venue-booking-menu-item"><span><strong>{item.name}</strong><small>{formatMoney(item.price_minor, item.currency)}</small></span><div><button type="button" aria-label={`${t("Убрать")} ${item.name}`} disabled={!quantities[item.id]} onClick={() => changeQuantity(item.id, -1)}><Minus size={15} /></button><b>{quantities[item.id] ?? 0}</b><button type="button" aria-label={`${t("Добавить")} ${item.name}`} onClick={() => changeQuantity(item.id, 1)}><Plus size={15} /></button></div></div>)}{selectedItems.filter(({ item }) => !item).map(({ id, quantity }) => <div key={id} className="venue-booking-menu-item unavailable"><span>{t("Блюдо недоступно")} · {quantity}</span><button type="button" onClick={() => changeQuantity(id, -quantity)}>{t("Убрать")}</button></div>)}</div> : <p>{t("Меню пока недоступно")}</p>}{selectedItems.length > 0 && <strong className="venue-booking-preorder-total">{t("Предзаказ")}: {formatMoney(preorderTotal)}</strong>}</div>}
      <div className="venue-booking-contact"><h3>{t("Контакты")}</h3><label>{t("Имя")}<input value={guestName} maxLength={120} autoComplete="name" onChange={(event) => setGuestName(event.target.value)} /></label><label>{t("Телефон")}<input value={guestPhone} maxLength={40} type="tel" autoComplete="tel" onChange={(event) => setGuestPhone(event.target.value)} /></label><label>{t("Эл. почта (необязательно)")}<input value={guestEmail} maxLength={254} type="email" autoComplete="email" onChange={(event) => setGuestEmail(event.target.value)} /></label></div>
      {submitError && <p className="venue-booking-submit-error" role="alert">{submitError}</p>}
      <button type="button" className="venue-booking-submit" disabled={submitting || guestName.trim().length < 2 || guestPhone.trim().length < 5 || missingItems} onClick={() => void submit()}>{submitting ? t("Сохраняем бронь...") : submitError.includes(t("Цена изменилась")) ? t("Подтвердить новую сумму") : t("Забронировать")}</button>
    </> : <><p className="venue-booking-label">{t("Свободное время")}</p><p role="status">{t("На эту дату свободных столов нет")}</p></>}</div>
    </>}
  </aside>;
}
