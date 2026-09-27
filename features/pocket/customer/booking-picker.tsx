"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Building2, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, DoorOpen, Minus, PanelsTopLeft, Plus, Wine, X } from "lucide-react";
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

function BookingOverlay({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = rootRef.current?.querySelector<HTMLElement>('[role="dialog"]');
    dialog?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      if (!buttons.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trapFocus);
    return () => { document.removeEventListener("keydown", trapFocus); previousFocus?.focus(); };
  }, []);
  return createPortal(<div className="pocket-spots" ref={rootRef}><div className="venue-detail-page venue-public-booking">{children}</div></div>, document.body);
}

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
  const [tablesOpen, setTablesOpen] = useState(false);
  const [floorID, setFloorID] = useState("");
  const [month, setMonth] = useState("");
  const [revision, setRevision] = useState(0);
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
    if (!calendarOpen && !tablesOpen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setCalendarOpen(false); setTablesOpen(false); } };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", escape); };
  }, [calendarOpen, tablesOpen]);

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
  const floors = current?.floors ?? [];
  const activeFloor = floors.find((floor) => floor.id === floorID) ?? floors[0];
  const availableIDs = new Set(selectedSlot?.tables.map((table) => table.id) ?? []);
  const today = current ? (() => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: current.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  })() : date;
  const latest = today ? addDays(today, 30) : date;

  return <aside className="venue-booking-card venue-public-booking" aria-labelledby="venue-booking-title">
    <div className="venue-booking-heading"><h2 id="venue-booking-title">{t("Выбрать стол")}</h2></div>
    <div className="venue-booking-toolbar">
      <div className="venue-date-picker">
        <button type="button" className={`venue-date-trigger ${calendarOpen ? "active" : ""}`} aria-label={t("Выбрать дату")} aria-expanded={calendarOpen} aria-haspopup="dialog" disabled={!date} onClick={() => setCalendarOpen((value) => !value)}><CalendarDays size={17} /><span>{date ? formatter.format(day(date)) : t("Дата")}</span><ChevronDown className="venue-date-chevron" size={16} /></button>
        {calendarOpen && month && <BookingOverlay><div className="venue-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCalendarOpen(false); }}><div className="venue-calendar-popover" role="dialog" aria-modal="true" aria-label={t("Выбор даты")}>
          <button type="button" className="venue-dialog-close" aria-label={t("Закрыть")} onClick={() => setCalendarOpen(false)}><X size={18} /></button>
          <div className="venue-calendar-header"><strong>{monthFormatter.format(day(month))}</strong><div><button type="button" aria-label={t("Предыдущий месяц")} disabled={month <= monthStart(today)} onClick={() => setMonth(moveMonth(month, -1))}><ChevronLeft size={17} /></button><button type="button" aria-label={t("Следующий месяц")} disabled={moveMonth(month, 1) > monthStart(latest)} onClick={() => setMonth(moveMonth(month, 1))}><ChevronRight size={17} /></button></div></div>
          <div className="venue-calendar-weekdays" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(localeTags[locale], { weekday: "short", timeZone: "UTC" }).format(day(addDays("2026-09-28", index)))).map((label, index) => <span key={index}>{label}</span>)}</div>
          <div className="venue-calendar-grid">{calendarDays(month).map((value) => <button type="button" key={value} className={`${value.slice(0, 7) !== month.slice(0, 7) ? "outside" : ""} ${value === date ? "selected" : ""}`} aria-label={longFormatter.format(day(value))} aria-pressed={value === date} disabled={value < today || value > latest} onClick={() => chooseDate(value)}>{Number(value.slice(8))}</button>)}</div>
        </div></div></BookingOverlay>}
      </div>
      <div className="venue-guests"><button type="button" aria-label={t("Уменьшить количество гостей")} disabled={guests === 1} onClick={() => changeGuests(guests - 1)}><Minus size={16} /></button><strong>{t("Гостей: {count}", { count: guests })}</strong><button type="button" aria-label={t("Увеличить количество гостей")} disabled={guests === 20} onClick={() => changeGuests(guests + 1)}><Plus size={16} /></button></div>
    </div>
    <p className="venue-booking-label">{t("Свободное время")}</p>
    {loading ? <p role="status">{t("Ищем свободные столы...")}</p> : error ? <div role="alert"><p>{t("Не удалось проверить свободные столы")}</p><button type="button" onClick={() => { setLoading(true); setError(false); setRevision((value) => value + 1); }}>{t("Повторить")}</button></div> : current?.slots.length ? <>
      <div className="venue-time-grid">{current.slots.map((slot) => <button type="button" key={slot.time} className={time === slot.time ? "active" : ""} aria-pressed={time === slot.time} onClick={() => { setTime(slot.time); setTableID(""); }}>{slot.time}</button>)}</div>
      {selectedSlot && <><p className="venue-booking-label venue-booking-tables-label">{t("Стол")}</p><button type="button" className="venue-table-trigger" aria-haspopup="dialog" aria-expanded={tablesOpen} onClick={() => { setFloorID(floors.find((floor) => floor.tables.some((table) => table.id === selectedTable?.id))?.id ?? floors[0]?.id ?? ""); setTablesOpen(true); }}><span>{selectedTable ? t("Стол {name}", { name: selectedTable.identifier }) : t("Не важен")}</span><ChevronRight size={18} /></button></>}
      {selectedSlot && <p className="venue-booking-selection" role="status">{venueName} · {formatter.format(day(date))} · {time} · {t("Гостей: {count}", { count: guests })} · {selectedTable ? t("Стол {name}", { name: selectedTable.identifier }) : t("Не важен")}</p>}
      <small className="venue-booking-note">{t("Подтверждение брони пока недоступно")}</small>
    </> : <p role="status">{t("На эту дату свободных столов нет")}</p>}
    {tablesOpen && selectedSlot && <BookingOverlay><div className="venue-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setTablesOpen(false); }}><div className="venue-table-dialog" role="dialog" aria-modal="true" aria-label={t("Выбрать стол")}>
      <header><div><h3>{t("Выбрать стол")}</h3><p>{formatter.format(day(date))} · {time} · {t("Гостей: {count}", { count: guests })}</p></div><button type="button" className="venue-dialog-close" aria-label={t("Закрыть")} onClick={() => setTablesOpen(false)}><X size={20} /></button></header>
      <button type="button" className={`venue-any-table ${!selectedTable ? "active" : ""}`} aria-pressed={!selectedTable} onClick={() => { setTableID(""); setTablesOpen(false); }}><span><strong>{t("Не важен")}</strong><small>{t("Подберём любой свободный стол")}</small></span><span className="venue-radio-mark" /></button>
      {floors.length > 0 ? <><div className="venue-floor-tabs" role="tablist" aria-label={t("Этажи заведения")}>{floors.map((floor, index) => <button type="button" role="tab" key={floor.id} aria-selected={activeFloor?.id === floor.id} className={activeFloor?.id === floor.id ? "active" : ""} onClick={() => setFloorID(floor.id)}><span>{index + 1}</span>{floor.name}</button>)}</div>
        <div className="venue-floor-key"><span><i className="available" />{t("Свободен")}</span><span><i className="unavailable" />{t("Недоступен")}</span></div>
        <div className="venue-floor-scroll"><div className="venue-floor-map">{activeFloor?.fixtures.map((fixture) => <div key={fixture.id} className={`venue-floor-fixture ${fixture.type}`} style={{ left: `${fixture.x}%`, top: `${fixture.y}%`, transform: `${fixture.type === "window" ? "translateX(-100%) " : ""}rotate(${fixture.rotation}deg)`, ...(fixture.type === "bar" ? { width: `${36 * fixture.size / 100}%` } : fixture.type === "window" ? { height: `${58 * fixture.size / 100}%` } : { width: `${84 * fixture.size / 100}px` }) }}>{fixture.type === "bar" ? <><Wine size={15} />{t("Бар")}</> : fixture.type === "window" ? <><PanelsTopLeft size={15} />{t("Окно")}</> : <><DoorOpen size={15} />{t("Вход")}</>}</div>)}{activeFloor?.tables.map((table) => { const free = availableIDs.has(table.id); return <button type="button" key={table.id} className={`venue-floor-table ${free ? "available" : "unavailable"} ${selectedTable?.id === table.id ? "selected" : ""} ${table.seats >= 6 ? "wide" : ""}`} style={{ left: `${table.x}%`, top: `${table.y}%` }} disabled={!free} aria-label={`${t("Стол {name}", { name: table.identifier })}, ${t("Мест: {count}", { count: table.seats })}, ${free ? t("Свободен") : t("Недоступен")}`} aria-pressed={selectedTable?.id === table.id} onClick={() => { setTableID(table.id); setTablesOpen(false); }}><strong>{table.identifier}</strong><span>{t("Мест: {count}", { count: table.seats })}</span></button>; })}{!activeFloor?.tables.length && <div className="venue-floor-empty"><Building2 size={24} />{t("На этом этаже нет столов")}</div>}</div></div>
      </> : <div className="venue-floor-empty"><Building2 size={24} />{t("План зала пока недоступен")}</div>}
    </div></div></BookingOverlay>}
  </aside>;
}
