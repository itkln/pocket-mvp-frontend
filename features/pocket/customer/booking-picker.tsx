"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { getVenueAvailability, type VenueAvailability } from "../../../lib/public-catalog-api";
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

export function BookingPicker({ venueID, venueName }: { venueID: string; venueName: string }) {
  const { locale, t } = useI18n();
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState("");
  const [tableID, setTableID] = useState("");
  const [availability, setAvailability] = useState<VenueAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [revision, setRevision] = useState(0);
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
    setTableID("");
    setAvailability(null);
    setLoading(true);
    setMonth(monthStart(value));
    setCalendarOpen(false);
  };
  const changeGuests = (count: number) => {
    setGuests(count);
    setTime("");
    setTableID("");
    setAvailability(null);
    setLoading(true);
  };
  const current = availability?.date === date ? availability : null;
  const selectedSlot = current?.slots.find((slot) => slot.time === time);
  const selectedTable = selectedSlot?.tables.find((table) => table.id === tableID);
  const today = current ? (() => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: current.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  })() : date;
  const latest = today ? addDays(today, 30) : date;

  return <aside className="venue-booking-card venue-public-booking" aria-labelledby="venue-booking-title">
    <div className="venue-booking-heading"><h2 id="venue-booking-title">{t("Выбрать стол")}</h2></div>
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
    <p className="venue-booking-label">{t("Свободное время")}</p>
    {loading ? <p role="status">{t("Ищем свободные столы...")}</p> : error ? <div role="alert"><p>{t("Не удалось проверить свободные столы")}</p><button type="button" onClick={() => { setLoading(true); setError(false); setRevision((value) => value + 1); }}>{t("Повторить")}</button></div> : current?.slots.length ? <>
      <div className="venue-time-grid">{current.slots.map((slot) => <button type="button" key={slot.time} className={time === slot.time ? "active" : ""} aria-pressed={time === slot.time} onClick={() => { setTime(slot.time); setTableID(""); }}>{slot.time}</button>)}</div>
      {selectedSlot && <><p className="venue-booking-label venue-booking-tables-label">{t("Свободные столы")}</p><div className="venue-available-tables">{selectedSlot.tables.map((table) => <button type="button" key={table.id} className={tableID === table.id ? "active" : ""} aria-pressed={tableID === table.id} onClick={() => setTableID(table.id)}><strong>{t("Стол {name}", { name: table.identifier })}</strong><small>{t("Мест: {count}", { count: table.seats })}</small></button>)}</div></>}
      {selectedTable && <p className="venue-booking-selection" role="status">{venueName} · {formatter.format(day(date))} · {time} · {t("Гостей: {count}", { count: guests })} · {t("Стол {name}", { name: selectedTable.identifier })}</p>}
      <small className="venue-booking-note">{t("Подтверждение брони пока недоступно")}</small>
    </> : <p role="status">{t("На эту дату свободных столов нет")}</p>}
  </aside>;
}
