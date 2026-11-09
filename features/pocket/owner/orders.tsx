"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Settings2, ArrowLeft, Ban, CalendarDays, Check, ChevronDown, MessageSquare, RefreshCw, Search, ShoppingBag, X } from "lucide-react";
import {OrderAlertSettingsDialog} from "./order-alert-settings";
import {defaultOrderAlerts, orderWaiting, ticketTextColor} from "./order-waiting";
import { reservationStatusLabels } from "../reservation-status";
import type { OrderQuery, OwnerOrder } from "../../../lib/owner-api";
import { useI18n, localeTags } from "../i18n";
import { SlideToConfirm } from "../customer/slide-to-confirm";
import { useMobileViewport } from "../use-mobile-viewport";
import { OrderCancellationDialog, cancellationReasons } from "./order-cancellation";
import { Button, EmptyIllustration, IconButton, money } from "../ui";
import { useOwnerWorkspace } from "./context";
import { useOrderStatusFeedback, type OrderStatusChange } from "./use-order-status-feedback";
import { useOrderArrivals } from "./use-order-arrivals";
import { isFinalOrder, nextOrderAction, orderGroup, orderStatusLabels } from "./order-workflow";

function waitingDisplay(minutes: number, locale: string) {
  const unit = minutes < 60 ? "minute" : minutes < 1440 ? "hour" : "day";
  const value = minutes < 60 ? minutes : Math.floor(minutes / (minutes < 1440 ? 60 : 1440));
  const parts = new Intl.NumberFormat(locale, {style:"unit",unit,unitDisplay:"short"}).formatToParts(value);
  return {value, unit: parts.find(part => part.type === "unit")?.value};
}

const groups = [["new", "Новые"], ["working", "В работе"], ["ready", "Готовы к подаче"], ["served", "Поданы"], ["scheduled", "Ко времени"], ["history", "История"]] as const;

export type OrderOpenRequest = { id: string };

export function OrdersScreen({ title = "Заказы", request }: { title?: string; request?: OrderOpenRequest } = {}) {
  const { orderAlerts = defaultOrderAlerts, saveOrderAlerts, getHistoryPage, venueTimezone, readScope, onArrivals, orders, loading, refreshOrders, hasMoreOrderHistory, loadMoreOrderHistory } = useOwnerWorkspace();
  const { t, locale } = useI18n();
  const date = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" };
    try {
      return new Intl.DateTimeFormat(localeTags[locale], { ...options, timeZone: venueTimezone || "UTC" });
    } catch {
      return new Intl.DateTimeFormat(localeTags[locale], { ...options, timeZone: "UTC" });
    }
  }, [locale, venueTimezone]);
  const statusChanges = useOrderStatusFeedback(orders);
  const [alertsOpen,setAlertsOpen] = useState(false);
  const [mode, setMode] = useState<"active" | "history">("active");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [historyReload, setHistoryReload] = useState(0);
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyTable, setHistoryTable] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [historyOrders, setHistoryOrders] = useState<OwnerOrder[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string>();
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const historyRevision = useRef(0);
  const historyFilter = useMemo<OrderQuery>(() => ({scope: "history", limit: 50, number: query.trim() || undefined, table: historyTable.trim() || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, status: historyStatus ? [historyStatus as "completed" | "cancelled"] : undefined, channel: source === "all" ? undefined : source as "dine_in" | "preorder"}), [query, historyTable, dateFrom, dateTo, historyStatus, source]);
  useEffect(() => {
    if (mode !== "history" || !getHistoryPage) return;
    const revision = ++historyRevision.current;
    setHistoryLoading(true); setHistoryError(false); setHistoryOrders([]); setHistoryCursor(undefined);
    const timer = window.setTimeout(() => {
      getHistoryPage(historyFilter).then(page => { if (revision === historyRevision.current) { setHistoryOrders(page.orders); setSelectedID(page.orders[0]?.id ?? ""); setHistoryCursor(page.has_more ? page.next_cursor : undefined); } }).catch(() => { if (revision === historyRevision.current) setHistoryError(true); }).finally(() => { if (revision === historyRevision.current) setHistoryLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); ++historyRevision.current; };
  }, [mode, getHistoryPage, historyFilter, historyReload]);
  const moreHistory = async () => {
    if (!getHistoryPage || historyLoading) return;
    const revision = historyRevision.current;
    setHistoryLoading(true); setHistoryError(false);
    try { const page = await getHistoryPage({...historyFilter, cursor: historyCursor}); if (revision === historyRevision.current) { setHistoryOrders(current => [...new Map([...current,...page.orders].map(order => [order.id,order])).values()]); setHistoryCursor(page.has_more ? page.next_cursor : undefined); } }
    catch { if (revision === historyRevision.current) setHistoryError(true); }
    finally { if (revision === historyRevision.current) setHistoryLoading(false); }
  };
  const [selectedID, setSelectedID] = useState("");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const refreshingRef = useRef(false);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const queueRef = useRef<HTMLElement>(null);
  const queueScroll = useRef(0);
  const mobileListScroll = useRef(0);
  useLayoutEffect(() => {
    if (queueRef.current) queueRef.current.scrollTop = queueScroll.current;
  }, [orders, historyOrders, mobileDetail]);
  const openOrder = (id: string) => {
    setSelectedID(id);
    if (window.matchMedia("(max-width: 760px)").matches) {
      mobileListScroll.current = window.scrollY;
      setMobileDetail(true);
      window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
    }
  };
  const backToQueue = () => {
    setMobileDetail(false);
    window.requestAnimationFrame(() => window.scrollTo({ top: mobileListScroll.current }));
  };
  const { opened, reconcile, markOpened } = useOrderArrivals(readScope, onArrivals);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const retry = useRef<() => void>(() => {});
  useEffect(() => {
    let mounted = true;
    const offline = () => { setRefreshError(true); setQueueLoaded(true); };
    const update = async () => {
      if (!navigator.onLine) { offline(); return; }
      if (document.visibilityState === "hidden" || refreshingRef.current) return;
      refreshingRef.current = true;
      setRefreshing(true);
      try {
        const snapshot = await refreshOrders();
        if (!mounted || !navigator.onLine || !snapshot) return;
        reconcile(snapshot);
        setLastSync(Date.now());
        setRefreshError(false);
      } catch {
        if (mounted) setRefreshError(true);
      } finally {
        refreshingRef.current = false;
        if (mounted) { setRefreshing(false); setNow(Date.now()); setQueueLoaded(true); }
      }
    };
    retry.current = update;
    void update();
    const timer = window.setInterval(update, 5000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    window.addEventListener("offline", offline);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", offline);
    };
  }, [refreshOrders, reconcile]);
  const refresh = () => { retry.current(); if (mode === "history") setHistoryReload(value => value + 1); };
  const visible = mode === "history" && getHistoryPage ? historyOrders : orders.filter(order => (mode === "history") === isFinalOrder(order) &&
    (source === "all" || (source === "preorder" ? Boolean(order.reservation_starts_at) : order.channel === "dine_in" && !order.reservation_starts_at)) &&
    `${order.number} ${order.source} ${order.guest_name ?? ""} ${order.reservation_code ?? ""} ${order.items?.map(item => item.name).join(" ") ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => mode === "history" ? Date.parse(b.created_at) - Date.parse(a.created_at) : Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id));
  // Keep the acted-on order visible in details even when it moves into history.
  const selected = selectedID ? [...historyOrders, ...orders].find(order => order.id === selectedID) : visible[0];
  const firstVisibleID = visible[0]?.id;
  useEffect(() => {
    if (!selectedID && firstVisibleID) setSelectedID(firstVisibleID);
  }, [selectedID, firstVisibleID]);
  const handled = useRef<OrderOpenRequest | undefined>(undefined);
  useEffect(() => {
    if (!request || handled.current === request) return;
    handled.current = request;
    const order = orders.find(item => item.id === request.id);
    setMode(order && isFinalOrder(order) ? "history" : "active");
    setSource("all");
    setQuery("");
    setCollapsed([]);
    openOrder(request.id);
    markOpened(request.id);
  }, [request, orders, markOpened]);

  const missingSelection = Boolean(selectedID && !selected && queueLoaded && !loading);
  const switchMode = (value: typeof mode) => { setMode(value); setSelectedID(""); setMobileDetail(false); };
  return <section className={`vendor-orders ${mobileDetail ? "show-detail" : ""}`}>
    <header className="orders-heading"><div><h1>{t(title)}</h1><span className="orders-live"><i className={refreshError ? "offline" : ""} />{t(refreshError ? "Переподключение" : lastSync ? "На связи" : "Подключение…")}{lastSync && " · " + t("Синхронизация") + " " + new Date(lastSync).toLocaleTimeString(localeTags[locale])}</span></div><div className="orders-heading-actions">{orderAlerts.can_edit && <IconButton icon={Settings2} label={t("Ожидание кухни")} onClick={()=>setAlertsOpen(true)}/>}<label className="orders-search"><Search size={19} /><input aria-label={t("Поиск заказов")} placeholder={t(mode === "history" ? "Номер заказа" : "Номер, стол или блюдо")} value={query} onChange={event => { setQuery(event.target.value); setSelectedID(""); }} />{query && <button aria-label={t("Очистить поиск")} onClick={() => setQuery("")}><X size={17} /></button>}</label><IconButton icon={RefreshCw} label={t("Обновить")} onClick={() => void refresh()} className={refreshing ? "orders-refresh spinning" : "orders-refresh"} /></div></header>
    <div className="orders-toolbar"><div className="orders-tabs">{([ ["active", "Активные"], ["history", "История"] ] as const).map(([value, label]) => <button key={value} aria-pressed={mode === value} className={mode === value ? "active" : ""} onClick={() => switchMode(value)}>{t(label)}<span>{value === "history" && getHistoryPage ? "" : orders.filter(order => (value === "history") === isFinalOrder(order)).length}</span></button>)}</div><div className="orders-source-filter"><select aria-label={t("Источник заказа")} value={source} onChange={event => { setSource(event.target.value); setSelectedID(""); }}><option value="all">{t("Все источники")}</option><option value="dine_in">{t("За столом")}</option><option value="preorder">{t("Предзаказы")}</option></select><ChevronDown size={18} aria-hidden="true" /></div></div>
    {mode === "history" && getHistoryPage && <div className="orders-history-filters">
      <label>{t("Дата с")}<input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setSelectedID(""); }} /></label>
      <label>{t("Дата по")}<input type="date" value={dateTo} min={dateFrom} onChange={e => { setDateTo(e.target.value); setSelectedID(""); }} /></label>
      <label>{t("Статус")}<select value={historyStatus} onChange={e => { setHistoryStatus(e.target.value); setSelectedID(""); }}><option value="">{t("Все статусы")}</option><option value="completed">{t(orderStatusLabels.completed)}</option><option value="cancelled">{t(orderStatusLabels.cancelled)}</option></select></label>
      <label>{t("Стол")}<input value={historyTable} onChange={e => { setHistoryTable(e.target.value); setSelectedID(""); }} placeholder="01" /></label>
      <span>{t("Даты создания заказа")} · {venueTimezone || "UTC"}</span>
    </div>}
    {mode === "history" && historyError && <div role="alert" className="orders-load-error">{t("Не удалось загрузить заказы")}<Button kind="quiet" onClick={() => void moreHistory()}>{t("Повторить")}</Button></div>}
    {mode === "history" && historyLoading && <p role="status">{t("Загрузка...")}</p>}
    {refreshError && <div className="orders-load-error" role="alert">{t(orders.length ? "Показаны последние загруженные данные. Попробуйте обновить." : "Не удалось загрузить заказы")}<Button kind="quiet" disabled={refreshing} onClick={() => void refresh()}>{t("Повторить")}</Button></div>}
    <div className="orders-workspace">
      <aside ref={queueRef} onScroll={event => { queueScroll.current = event.currentTarget.scrollTop; }} className="orders-queue" aria-label={t("Очередь заказов")} aria-busy={!queueLoaded || loading}>

        {(loading || !queueLoaded) && !orders.length ? <p className="orders-placeholder" role="status">{t("Загрузка...")}</p> : refreshError && !orders.length ? <p className="orders-placeholder">{t("Данные заказов недоступны")}</p> : !visible.length ? <EmptyIllustration icon={ShoppingBag} title={t(query || source !== "all" ? "Ничего не найдено" : "Заказов пока нет")} text={t(query || source !== "all" ? "Измените поиск или источник заказа." : "Новые заказы появятся здесь автоматически.")} /> : groups.map(([key, label]) => {
          const entries = visible.filter(order => orderGroup(order, now, orderAlerts.preorder_lead_minutes) === key);
          if (key === "new") {
            entries.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.number - a.number);
          }
          if (key === "scheduled") {
            entries.sort((a, b) => Date.parse(a.reservation_starts_at!) - Date.parse(b.reservation_starts_at!) || a.number - b.number);
          }
          if (!entries.length) return null;
          return <section className="orders-group" key={key}><button className="orders-group-title" aria-expanded={!collapsed.includes(key)} onClick={() => setCollapsed(current => current.includes(key) ? current.filter(value => value !== key) : [...current, key])}><span>{t(label)} <b>{entries.length}</b></span><ChevronDown size={17} className={collapsed.includes(key) ? "collapsed" : ""} /></button>{!collapsed.includes(key) && entries.map(order => { const waiting=orderWaiting(order,now,orderAlerts); const timer = waiting ? waitingDisplay(waiting.minutes,localeTags[locale]) : null; const cardColor = waiting?.color || (order.status === "new" && !opened.has(order.id) ? "#219ED9" : undefined); return <button style={cardColor ? {background:cardColor,color:ticketTextColor(cardColor)} : undefined} key={order.id} className={`orders-ticket ${waiting?.color ? "waiting-alert" : ""} ${order.status === "new" && !opened.has(order.id) ? "just-arrived" : ""} ${selected?.id === order.id ? "selected" : ""} ${order.status === "new" ? "is-new" : ""}`} aria-pressed={selected?.id === order.id} onClick={() => { openOrder(order.id); markOpened(order.id); }}>
            {statusChanges[order.id] && <span key={statusChanges[order.id].version} className="orders-change-flash" aria-hidden="true" />}
            <span className="orders-ticket-summary">
              <strong className="orders-ticket-price">{typeof order.total_minor === "number" && order.currency ? money(order.total_minor / 100, order.currency) : `№ ${order.number}`}</strong>
              <span className="orders-ticket-number">№ {order.number}</span>
              <span className="orders-ticket-source">{order.reservation_code ? `${t("Бронь")} ${order.reservation_code}` : t(order.source)}</span>
            </span>
            {waiting && timer ? <span className="orders-ticket-timer" aria-label={t("Ожидание: {minutes} мин",{minutes:waiting.minutes})} title={t("Ожидание: {minutes} мин",{minutes:waiting.minutes})}>
              <svg viewBox="0 0 52 52" aria-hidden="true"><circle className="timer-track" cx="26" cy="26" r="23"/><circle className="timer-progress" cx="26" cy="26" r="23" pathLength="100" strokeDasharray={`${Math.min(100,waiting.minutes / orderAlerts.critical_minutes * 100)} 100`}/></svg>
              <span aria-hidden="true"><b>{timer.value}</b><small>{timer.unit}</small></span>
            </span> : <span className={`orders-status orders-ticket-state status-${order.status}`}>{t(orderStatusLabels[order.status])}</span>}
            {order.reservation_starts_at && <span className="orders-ticket-visit"><CalendarDays size={14} />{t("Время визита")} · {date.format(new Date(order.reservation_starts_at))}</span>}

          </button>;})}</section>;
        })}
        {mode === "history" && getHistoryPage && historyCursor && <Button disabled={historyLoading} onClick={() => void moreHistory()}>{t("Показать ещё")}</Button>}
        {mode === "history" && !getHistoryPage && hasMoreOrderHistory && <Button disabled={refreshing} onClick={async () => { if (refreshingRef.current) return; refreshingRef.current = true; setRefreshing(true); try { await loadMoreOrderHistory(); setRefreshError(false); } catch { setRefreshError(true); } finally { refreshingRef.current = false; setRefreshing(false); } }}>{t("Показать ещё")}</Button>}
      </aside>
      <div className="orders-detail-column">{selected ? <OrderDetails date={date} key={selected.id} order={selected} statusChange={statusChanges[selected.id]} onBack={backToQueue} /> : missingSelection ? <div className="orders-detail-empty" role="status"><button className="orders-mobile-back" onClick={backToQueue}><ArrowLeft size={20} />{t("К заказам")}</button><EmptyIllustration icon={ShoppingBag} title={t("Заказ больше не доступен")} text={t("Обновите очередь или выберите другой заказ.")} /><Button kind="quiet" onClick={() => { setSelectedID(""); backToQueue(); }}>{t("Выбрать другой заказ")}</Button></div> : <div className="orders-detail-empty"><EmptyIllustration icon={ReceiptIcon} title={t("Выберите заказ")} text={t("Состав и действия появятся справа.")} /></div>}</div>
    </div>
    {alertsOpen && <OrderAlertSettingsDialog value={orderAlerts} onSave={saveOrderAlerts} onClose={()=>setAlertsOpen(false)}/>}
  </section>;
}
const ReceiptIcon = ShoppingBag;

function OrderDetails({ date, order, statusChange, onBack }: { date: Intl.DateTimeFormat; order: OwnerOrder; statusChange?: OrderStatusChange; onBack: () => void }) {
  const { setOrderStatus, refreshOrders, getOrderDetails } = useOwnerWorkspace();
  const { t } = useI18n();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [details, setDetails] = useState<OwnerOrder | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  useEffect(() => {
    if (!getOrderDetails) return;
    let active = true;
    getOrderDetails(order.id).then(value => { if (active) { setDetails(value); setHistoryFailed(false); } }).catch(() => { if (active) setHistoryFailed(true); });
    return () => { active = false; };
  }, [getOrderDetails, order.id, order.status, order.updated_at]);
  const mobile = useMobileViewport();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);
  const action = nextOrderAction(order);
  const canCancel = !isFinalOrder(order) && Boolean(order.allowed_actions?.includes("cancelled"));
  const change = async (status: OwnerOrder["status"], cancellation?: {reason:string;comment?:string}) => {
    if (status === "cancelled" && !cancellation) { setCancelOpen(true); return; }
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {

      setFailed(false); if(cancellation) await setOrderStatus(order.id, status, cancellation); else await setOrderStatus(order.id,status); setCancelOpen(false);
    } catch { setFailed(true); await refreshOrders().catch(() => undefined); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const reservationDialog = useRef<HTMLDialogElement>(null);
  const count = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  return <article className="orders-detail" aria-label={`${t("Заказ")} № ${order.number}`}>
    <div className="orders-mobile-navigation"><button className="orders-mobile-back" onClick={onBack}><ArrowLeft size={20} />{t("К заказам")}</button>{mobile && canCancel && <button type="button" className="orders-mobile-cancel" disabled={busy} onClick={() => void change("cancelled")}><Ban size={18} aria-hidden="true" />{t("Отменить заказ")}</button>}</div>
    <section className="orders-card orders-summary">{statusChange && <span key={statusChange.version} className="orders-change-flash" aria-hidden="true" />}<div className="orders-detail-badges"><span key={statusChange?.version ?? "initial"} className={`orders-status status-${order.status} ${statusChange ? "orders-status-updated" : ""}`}>{t(orderStatusLabels[order.status])}</span><span className="orders-channel">{t(order.reservation_starts_at ? "Предзаказ" : order.channel === "dine_in" ? "За столом" : order.channel === "pickup" ? "Самовывоз" : "Онлайн")}</span></div><h2>{t("Заказ")} № {order.number}</h2><dl><div><dt>{t("Создан")}</dt><dd>{date.format(new Date(order.created_at))}</dd></div><div><dt>{t("Источник заказа")}</dt><dd>{t(order.source)}</dd></div>{order.reservation_starts_at && <div className="orders-visit"><dt>{t("Время визита")}</dt><dd><CalendarDays size={17} />{date.format(new Date(order.reservation_starts_at))}</dd></div>}{order.reservation_code && <div><dt>{t("Бронь")}</dt><dd>{order.reservation_code}</dd></div>}{order.guest_name && <div><dt>{t("Гость")}</dt><dd>{order.guest_name}</dd></div>}{Boolean(order.guest_count) && <div><dt>{t("Гости")}</dt><dd>{order.guest_count}</dd></div>}{order.guest_phone && <div><dt>{t("Телефон")}</dt><dd><a href={`tel:${order.guest_phone}`}>{order.guest_phone}</a></dd></div>}</dl>
      {order.reservation_id && order.reservation_starts_at && <>
        <Button kind="secondary" icon={CalendarDays} onClick={() => reservationDialog.current?.showModal()}>{t("Открыть бронь")}</Button>
        <dialog ref={reservationDialog} className="order-booking-dialog" aria-labelledby="order-booking-title">
          <header><h3 id="order-booking-title">{order.reservation_code ? t("Бронь №{code}", { code: order.reservation_code }) : t("Информация о брони")}</h3>
            <IconButton icon={X} label={t("Закрыть")} onClick={() => reservationDialog.current?.close()} /></header>
          <dl>
            <div><dt>{t("Время визита")}</dt><dd>{date.format(new Date(order.reservation_starts_at))}</dd></div>
            {order.reservation_status && <div><dt>{t("Статус брони")}</dt><dd>{t(order.reservation_status === "pending" ? "Ожидает подтверждения" : reservationStatusLabels[order.reservation_status])}</dd></div>}
            {order.table_label && <div><dt>{t("Стол")}</dt><dd>{order.table_label}</dd></div>}
            {Boolean(order.guest_count) && <div><dt>{t("Гости")}</dt><dd>{order.guest_count}</dd></div>}
            {order.guest_name && <div><dt>{t("Гость")}</dt><dd>{order.guest_name}</dd></div>}
            {order.guest_phone && <div><dt>{t("Телефон")}</dt><dd><a href={`tel:${order.guest_phone}`}>{order.guest_phone}</a></dd></div>}
          </dl>
        </dialog>
      </>}
    </section>
    {order.notes?.trim() && <section className="orders-card orders-comment"><MessageSquare size={22} /><div><h3>{t("Комментарий к заказу")}</h3><p>{order.notes}</p></div></section>}
    <section className="orders-card orders-composition" aria-label={t("Состав заказа")}>
      <header><h3>{t("Состав заказа")}</h3><span>{t("Позиций: {count}", { count })}</span></header>
      {order.items?.length ? <ul>{order.items.map((item, index) => {
        const priced = typeof item.unit_price_minor === "number" && Boolean(order.currency);
        return <li key={item.id ?? index}>
          <span className="orders-quantity">{item.quantity}×</span>
          <div><strong>{item.name}</strong>
            {priced && <small>{money(item.unit_price_minor / 100, order.currency)} {t("за шт.")}</small>}
            {item.notes?.trim() && <p className="orders-item-note">{item.notes}</p>}
          </div>
          {priced && <strong>{money((item.total_minor ?? item.unit_price_minor * item.quantity) / 100, order.currency)}</strong>}
        </li>;
      })}</ul> : <p className="orders-placeholder">{t("Состав заказа недоступен")}</p>}
    </section>
    {typeof order.total_minor === "number" && order.currency && <section className="orders-card orders-totals" aria-label={t("Итого")}>
      {typeof order.tip_minor === "number" && <div><span>{t("Чаевые")}</span><strong>{money(order.tip_minor / 100, order.currency)}</strong></div>}
      <div className="orders-grand-total"><span>{t("Итого")}</span><strong>{money(order.total_minor / 100, order.currency)}</strong></div>
    </section>}
    {order.cancellation_blocked && <section className="orders-card"><p>{t("Отмена недоступна: есть платёж или счёт закрыт.")}</p></section>}
    {(details?.status_events?.length || historyFailed) ? <section className="orders-card orders-audit"><h3>{t("Журнал изменений")}</h3>{historyFailed ? <p role="alert">{t("Не удалось загрузить журнал изменений")}</p> : <ol>{details?.status_events?.map(event => <li key={event.id}><strong>{t(orderStatusLabels[event.previous_status])} → {t(orderStatusLabels[event.new_status])}</strong><p>{event.actor_name} · {date.format(new Date(event.created_at))}</p>{event.reason && <p>{t(cancellationReasons[event.reason] ?? event.reason)}</p>}{event.comment && <p className="orders-audit-comment">{event.comment}</p>}</li>)}</ol>}</section> : null}
    {cancelOpen && <OrderCancellationDialog busy={busy} failed={failed} onClose={() => setCancelOpen(false)} onConfirm={value => void change("cancelled",value)} />}
    <footer className="orders-card orders-actions">{failed && <p role="alert">{t("Действие не выполнено. Проверьте актуальный статус заказа и повторите попытку.")}</p>}{action || canCancel ? <><div>{action && (mobile ? <SlideToConfirm key={action.status} label={action.label} pendingLabel="Сохранение..." pending={busy} onConfirm={() => change(action.status)} /> : <Button icon={Check} disabled={busy} onClick={() => void change(action.status)}>{t(busy ? "Сохранение..." : action.label)}</Button>)}{!mobile && canCancel && <Button kind="quiet" disabled={busy} className="orders-cancel" onClick={() => void change("cancelled")}>{t("Отменить заказ")}</Button>}</div></> : <><p className="orders-final-note">{t(order.status === "cancelled" ? "Заказ отменён" : order.status === "completed" ? "Заказ завершён" : "Доступен только просмотр")}</p></>}</footer>
  </article>;
}
