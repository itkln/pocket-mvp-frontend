"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, RefreshCw, UsersRound } from "lucide-react";
import { listCustomerReservations, type CustomerReservation } from "../../../lib/reservations-api";
import { localeTags, useI18n } from "../i18n";
import { Button, PageHeader } from "../ui";

const statusLabels: Record<CustomerReservation["status"], string> = {
  confirmed: "Подтверждена", seated: "Гости в заведении", completed: "Завершена",
  cancelled: "Отменена", no_show: "Визит не состоялся",
};

export function MyReservationsScreen({ onVenue, onDiscover }: { onVenue: (id: string) => void; onDiscover: () => void }) {
  const { locale, t } = useI18n();
  const [reservations, setReservations] = useState<CustomerReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    listCustomerReservations(controller.signal).then((items) => {
      if (controller.signal.aborted) return;
      setReservations(items);
      setNow(Date.now());
      setLoading(false);
      setError(false);
    }).catch(() => {
      if (!controller.signal.aborted) { setError(true); setLoading(false); }
    });
    return () => controller.abort();
  }, [retry]);

  const refresh = () => { setLoading(true); setRetry((value) => value + 1); };
  const isUpcoming = (reservation: CustomerReservation) => ["confirmed", "seated"].includes(reservation.status) && new Date(reservation.ends_at).getTime() > now;
  const upcoming = reservations.filter(isUpcoming).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = reservations.filter((reservation) => !isUpcoming(reservation)).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const formatMoney = (minor: number, currency: string) => new Intl.NumberFormat(localeTags[locale], { style: "currency", currency }).format(minor / 100);

  const card = (reservation: CustomerReservation) => <article className="my-reservation-card" key={reservation.id} aria-label={`${reservation.venue_name} · ${t("Бронь №{code}", { code: reservation.code })}`}>
    <header><div><h3>{reservation.venue_name}</h3><p>{[reservation.venue_address, reservation.venue_city].filter(Boolean).join(" · ")}</p></div><button type="button" className="my-reservation-venue-link" aria-label={`${t("Открыть заведение")}: ${reservation.venue_name}`} onClick={() => onVenue(reservation.venue_id)}><ArrowUpRight size={20} /></button></header>
    <div className="my-reservation-meta"><span>{t("Бронь №{code}", { code: reservation.code })}</span><span className={`my-reservation-status ${reservation.status}`}>{t(statusLabels[reservation.status])}</span></div>
    <div className="my-reservation-schedule"><CalendarDays size={22} aria-hidden="true" /><time dateTime={reservation.starts_at}>{new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "long", timeStyle: "short", timeZone: reservation.timezone }).format(new Date(reservation.starts_at))}</time><span><UsersRound size={18} aria-hidden="true" />{t("Гостей: {count}", { count: reservation.guest_count })}</span></div>
    <div className="my-reservation-contacts"><h4>{t("Контакты")}</h4><strong>{reservation.guest_name}</strong>{reservation.guest_phone && <span>{reservation.guest_phone}</span>}{reservation.guest_email && <span>{reservation.guest_email}</span>}</div>
    {reservation.notes && <div className="my-reservation-comment"><h4>{t("Комментарий к ресторану")}</h4><p>{reservation.notes}</p></div>}
    {reservation.preorder_items.length ? <div className="my-reservation-preorder"><h4>{t("Предзаказ")}{reservation.preorder_order_number ? ` №${reservation.preorder_order_number}` : ""}</h4><ul>{reservation.preorder_items.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name} × {item.quantity}</span><strong>{formatMoney(item.unit_price_minor * item.quantity, reservation.currency)}</strong></li>)}</ul><div><span>{t("Итого")}</span><strong>{formatMoney(reservation.preorder_total_minor, reservation.currency)}</strong></div></div> : <p className="my-reservation-without-preorder">{t("Без предзаказа")}</p>}
  </article>;

  return <section className="spots-reservations"><PageHeader title={t("Мои брони")} actions={<Button kind="secondary" icon={RefreshCw} disabled={loading} onClick={refresh}>{t("Обновить")}</Button>} />
    {loading ? <div className="spots-catalog-status" role="status">{t("Загружаем брони...")}</div>
      : error ? <div className="spots-catalog-status" role="alert"><strong>{t("Не удалось загрузить брони")}</strong><Button kind="secondary" onClick={refresh}>{t("Повторить")}</Button></div>
        : reservations.length ? <div className="my-reservations-groups">{upcoming.length > 0 && <section aria-label={t("Предстоящие брони")}><h2>{t("Предстоящие брони")}</h2><div className="my-reservations-list">{upcoming.map(card)}</div></section>}{past.length > 0 && <section aria-label={t("История броней")}><h2>{t("История броней")}</h2><div className="my-reservations-list">{past.map(card)}</div></section>}</div>
          : <div className="spots-search-empty spots-reservations-empty"><CalendarDays size={32} aria-hidden="true" /><strong>{t("У вас пока нет броней")}</strong><p>{t("Выберите заведение и забронируйте удобное время")}</p><Button onClick={onDiscover}>{t("Выбрать заведение")}</Button></div>}
  </section>;
}
