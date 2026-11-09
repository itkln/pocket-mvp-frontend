"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, UsersRound, X } from "lucide-react";
import {
  cancelCustomerReservation,
  listCustomerReservations,
  type CustomerReservation,
} from "../../../lib/reservations-api";
import { reservationStatusLabels as statusLabels } from "../reservation-status";
import { APIError } from "../../../lib/api-client";
import { localeTags, useI18n } from "../i18n";
import { Button } from "../ui";
import { CategoryFilterStrip } from "./filter-strip";

const cancellationMessages: Record<string, string> = {
  cancellation_deadline_passed: "Срок отмены истёк. Свяжитесь с заведением.",
  cancellation_preorder_locked:
    "Заведение уже обрабатывает предзаказ. Для отмены свяжитесь с заведением.",
  cancellation_payment_started:
    "Оплата предзаказа уже начата или проведена. Для отмены свяжитесь с заведением.",
  cancellation_status_blocked: "В текущем статусе отмена недоступна. Свяжитесь с заведением.",
  cancellation_policy_unset: "Для отмены этой брони свяжитесь с заведением.",
  not_found: "Бронь не найдена. Обновите страницу.",
  unauthorized: "Войдите в аккаунт, чтобы отменить бронь.",
};

export function MyReservationsScreen({
  onVenue,
  onDiscover,
  directOnly = false,
}: {
  onVenue: (id: string) => void;
  onDiscover: () => void;
  directOnly?: boolean;
}) {
  const { locale, t } = useI18n();
  const filterDialog = useRef<HTMLDialogElement>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [venueFilter, setVenueFilter] = useState("all");
  const [preorderFilter, setPreorderFilter] = useState("all");
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [reservations, setReservations] = useState<CustomerReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    listCustomerReservations(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setReservations(items);
        setNow(Date.now());
        setLoading(false);
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [retry]);

  const refresh = () => {
    setLoading(true);
    setRetry((value) => value + 1);
  };
  const isUpcoming = (reservation: CustomerReservation) =>
    ["confirmed", "seated"].includes(reservation.status) &&
    new Date(reservation.ends_at).getTime() > now;
  const venues = Array.from(
    new Map(
      reservations.map((reservation) => [reservation.venue_id, reservation.venue_name]),
    ).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1], localeTags[locale]));
  const filtered = reservations.filter(
    (reservation) =>
      (statusFilter === "all" || reservation.status === statusFilter) &&
      (venueFilter === "all" || reservation.venue_id === venueFilter) &&
      (preorderFilter === "all" ||
        (preorderFilter === "with"
          ? reservation.preorder_items.length > 0
          : reservation.preorder_items.length === 0)),
  );
  const filtersActive = statusFilter !== "all" || venueFilter !== "all" || preorderFilter !== "all";
  const resetFilters = () => {
    setStatusFilter("all");
    setVenueFilter("all");
    setPreorderFilter("all");
  };
  const statusOptions = [
    { value: "all", label: "Все статусы" },
    ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
  ];
  const preorderOptions = [
    { value: "all", label: "Все брони" },
    { value: "with", label: "С предзаказом" },
    { value: "without", label: "Без предзаказа" },
  ];
  const stripOptions = [
    { value: "all", label: "Все", active: !filtersActive },
    ...statusOptions.slice(1).map((option) => ({
      ...option,
      value: `status:${option.value}`,
      active: statusFilter === option.value,
    })),
    ...preorderOptions.slice(1).map((option) => ({
      ...option,
      value: `preorder:${option.value}`,
      active: preorderFilter === option.value,
    })),
  ];
  const selectQuickFilter = (value: string) => {
    if (value === "all") return resetFilters();
    const [group, choice] = value.split(":");
    if (group === "status") setStatusFilter(statusFilter === choice ? "all" : choice);
    else setPreorderFilter(preorderFilter === choice ? "all" : choice);
  };
  const upcoming = filtered
    .filter(isUpcoming)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = filtered
    .filter((reservation) => !isUpcoming(reservation))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const selected = reservations.find((reservation) => reservation.id === selectedID);

  const card = (reservation: CustomerReservation) => (
    <article
      className="my-reservation-card"
      key={reservation.id}
      aria-label={`${reservation.venue_name} · ${t("Бронь №{code}", { code: reservation.code })}`}
    >
      <header>
        <div>
          <h3>{reservation.venue_name}</h3>
          <p>{[reservation.venue_address, reservation.venue_city].filter(Boolean).join(" · ")}</p>
        </div>
        <button
          type="button"
          className="my-reservation-details-link"
          aria-label={`${t("Открыть бронь")}: ${reservation.venue_name} · ${reservation.code}`}
          aria-haspopup="dialog"
          onClick={() => setSelectedID(reservation.id)}
        >
          <ArrowUpRight size={20} />
        </button>
      </header>
      <div className="my-reservation-meta">
        <span>{t("Бронь №{code}", { code: reservation.code })}</span>
        <span className={`my-reservation-status ${reservation.status}`}>
          {t(statusLabels[reservation.status])}
        </span>
      </div>
      <div className="my-reservation-schedule">
        <div className="my-reservation-when">
          <CalendarDays size={22} aria-hidden="true" />
          <time dateTime={reservation.starts_at}>
            <span>
              {new Intl.DateTimeFormat(localeTags[locale], {
                dateStyle: "long",
                timeZone: reservation.timezone,
              }).format(new Date(reservation.starts_at))}
            </span>
            <strong>
              {new Intl.DateTimeFormat(localeTags[locale], {
                timeStyle: "short",
                timeZone: reservation.timezone,
              }).format(new Date(reservation.starts_at))}
            </strong>
          </time>
        </div>
        <span className="my-reservation-guests">
          <UsersRound size={20} aria-hidden="true" />
          {t("Гостей: {count}", { count: reservation.guest_count })}
        </span>
      </div>
    </article>
  );

  return (
    <section className="spots-reservations spots-category-catalog" aria-label={t("Мои брони")}>
      {!loading && !error && reservations.length > 0 && (
        <>
          <CategoryFilterStrip
            options={stripOptions}
            filtersActive={filtersActive}
            ariaLabel={t("Фильтры броней")}
            onSelect={selectQuickFilter}
            onOpenFilters={() => filterDialog.current?.showModal()}
          />
          <dialog
            ref={filterDialog}
            className="spots-picker-dialog"
            aria-labelledby="my-reservations-filter-title"
            onClick={(event) => {
              if (event.target === event.currentTarget) filterDialog.current?.close();
            }}
          >
            <div className="spots-picker-content">
              <div className="spots-picker-heading">
                <h2 id="my-reservations-filter-title">{t("Фильтры")}</h2>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t("Закрыть фильтры")}
                  onClick={() => filterDialog.current?.close()}
                >
                  <X size={20} />
                </button>
              </div>
              <section className="spots-filter-group" aria-label={t("Статус брони")}>
                <p className="spots-filter-category">{t("Статус брони")}</p>
                <div className="spots-filter-options">
                  {statusOptions.map(({ value, label }) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={statusFilter === value}
                      onClick={() => setStatusFilter(statusFilter === value ? "all" : value)}
                    >
                      {t(label)}
                    </button>
                  ))}
                </div>
              </section>
              <section className="spots-filter-group" aria-label={t("Заведение")}>
                <p className="spots-filter-category">{t("Заведение")}</p>
                <div className="spots-filter-options">
                  <button
                    type="button"
                    aria-pressed={venueFilter === "all"}
                    onClick={() => setVenueFilter("all")}
                  >
                    {t("Все заведения")}
                  </button>
                  {venues.map(([id, name]) => (
                    <button
                      type="button"
                      key={id}
                      aria-pressed={venueFilter === id}
                      onClick={() => setVenueFilter(venueFilter === id ? "all" : id)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </section>
              <section className="spots-filter-group" aria-label={t("Предзаказ")}>
                <p className="spots-filter-category">{t("Предзаказ")}</p>
                <div className="spots-filter-options">
                  {preorderOptions.map(({ value, label }) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={preorderFilter === value}
                      onClick={() => setPreorderFilter(preorderFilter === value ? "all" : value)}
                    >
                      {t(label)}
                    </button>
                  ))}
                </div>
              </section>
              <div className="spots-picker-footer">
                <button type="button" className="button secondary" onClick={resetFilters}>
                  {t("Сбросить")}
                </button>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => filterDialog.current?.close()}
                >
                  {t("Показать")} ({filtered.length})
                </button>
              </div>
            </div>
          </dialog>
          <p className="my-reservations-count" role="status">
            {t("Найдено броней: {count}", { count: filtered.length })}
          </p>
        </>
      )}
      {loading ? (
        <div className="spots-catalog-status" role="status">
          {t("Загружаем брони...")}
        </div>
      ) : error ? (
        <div className="spots-catalog-status" role="alert">
          <strong>{t("Не удалось загрузить брони")}</strong>
          <Button kind="secondary" onClick={refresh}>
            {t("Повторить")}
          </Button>
        </div>
      ) : reservations.length ? (
        filtered.length ? (
          <div className="my-reservations-groups">
            {upcoming.length > 0 && (
              <section aria-label={t("Предстоящие брони")}>
                <h2>{t("Предстоящие брони")}</h2>
                <div className="my-reservations-list">{upcoming.map(card)}</div>
              </section>
            )}
            {past.length > 0 && (
              <section aria-label={t("История броней")}>
                <h2>{t("История броней")}</h2>
                <div className="my-reservations-list">{past.map(card)}</div>
              </section>
            )}
          </div>
        ) : (
          <div className="spots-search-empty spots-reservations-empty">
            <CalendarDays size={32} aria-hidden="true" />
            <strong>{t("Нет броней по выбранным фильтрам")}</strong>
            <Button kind="secondary" onClick={resetFilters}>
              {t("Сбросить фильтры")}
            </Button>
          </div>
        )
      ) : (
        <div className="spots-search-empty spots-reservations-empty">
          <CalendarDays size={32} aria-hidden="true" />
          <strong>{t("У вас пока нет броней")}</strong>
          <p>
            {t(
              directOnly
                ? "Откройте ссылку ресторана или отсканируйте QR-код, чтобы забронировать стол."
                : "Выберите заведение и забронируйте удобное время",
            )}
          </p>
          {!directOnly && <Button onClick={onDiscover}>{t("Выбрать заведение")}</Button>}
        </div>
      )}
      {selected && (
        <ReservationDetailsPanel
          reservation={selected}
          onClose={() => setSelectedID(null)}
          onVenue={onVenue}
          onCancelled={(updated) => {
            setReservations((items) =>
              items.map((item) => (item.id === updated.id ? updated : item)),
            );
            setNow(Date.now());
          }}
        />
      )}
    </section>
  );
}

function ReservationDetailsPanel({
  reservation,
  onClose,
  onVenue,
  onCancelled,
}: {
  reservation: CustomerReservation;
  onClose: () => void;
  onVenue: (id: string) => void;
  onCancelled: (reservation: CustomerReservation) => void;
}) {
  const { locale, t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelTitle = useRef<HTMLHeadingElement>(null);
  const confirmationTitle = useRef<HTMLHeadingElement>(null);
  const cancellationTrigger = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const close = () => {
    if (!inFlight.current) onClose();
  };
  useEffect(() => {
    if (confirming) confirmationTitle.current?.focus();
  }, [confirming]);
  useEffect(() => {
    if (cancelled) panelTitle.current?.focus();
  }, [cancelled]);
  const cancel = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setCancelError("");
    try {
      const updated = await cancelCustomerReservation(reservation.id);
      onCancelled(updated);
      setConfirming(false);
      setCancelled(true);
    } catch (error) {
      setCancelError(
        error instanceof APIError && cancellationMessages[error.code]
          ? cancellationMessages[error.code]
          : "Не удалось отменить бронь. Попробуйте ещё раз.",
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, []);
  const date = new Date(reservation.starts_at);
  const dateFormat = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(localeTags[locale], {
      ...options,
      timeZone: reservation.timezone,
    }).format(date);
  const formatMoney = (minor: number) =>
    new Intl.NumberFormat(localeTags[locale], {
      style: "currency",
      currency: reservation.currency,
    }).format(minor / 100);
  return (
    <dialog
      ref={dialogRef}
      className="my-reservation-panel"
      aria-labelledby="my-reservation-panel-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={close}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          close();
      }}
    >
      <header className="my-reservation-panel-header">
        <h2 id="my-reservation-panel-title" ref={panelTitle} tabIndex={-1}>
          {t("Информация о брони")}
        </h2>
        <button type="button" aria-label={t("Закрыть")} onClick={close} disabled={pending}>
          <X size={24} />
        </button>
      </header>
      <div className="my-reservation-panel-scroll">
        <section className="my-reservation-panel-summary">
          <time className="my-reservation-date" dateTime={reservation.starts_at}>
            <span>{dateFormat({ month: "long" })}</span>
            <strong>{dateFormat({ day: "numeric" })}</strong>
          </time>
          <span className={`my-reservation-status ${reservation.status}`}>
            {t(statusLabels[reservation.status])}
          </span>
          <h3>{reservation.venue_name}</h3>
          <p>
            {dateFormat({ hour: "2-digit", minute: "2-digit" })} ·{" "}
            {t("Гостей: {count}", { count: reservation.guest_count })}
          </p>
          <small>
            {dateFormat({ dateStyle: "long" })} · {t("Бронь №{code}", { code: reservation.code })}
          </small>
        </section>
        {cancelled && (
          <p className="my-reservation-cancel-success" role="status">
            {t(reservation.preorder_items.length ? "Бронь и предзаказ отменены" : "Бронь отменена")}
          </p>
        )}
        {confirming ? (
          <section
            className="my-reservation-cancellation"
            aria-labelledby="reservation-cancel-title"
            aria-busy={pending}
          >
            <h3 id="reservation-cancel-title" ref={confirmationTitle} tabIndex={-1}>
              {t("Отменить бронь?")}
            </h3>
            <p>
              {reservation.venue_name} · {dateFormat({ dateStyle: "long" })} ·{" "}
              {dateFormat({ timeStyle: "short" })}
            </p>
            <p>
              {t(
                reservation.preorder_items.length
                  ? "Вместе с бронью будет отменён весь предзаказ. Вернуть отменённую бронь нельзя."
                  : "Вернуть отменённую бронь нельзя. Вы сможете забронировать время заново.",
              )}
            </p>
            {cancelError && (
              <p className="my-reservation-cancel-error" role="alert">
                {t(cancelError)}
              </p>
            )}
            <div className="my-reservation-cancel-actions">
              <Button kind="danger" disabled={pending} onClick={cancel}>
                {t(pending ? "Отменяем бронь..." : "Да, отменить бронь")}
              </Button>
              <Button
                kind="secondary"
                disabled={pending}
                onClick={() => {
                  setConfirming(false);
                  setCancelError("");
                  requestAnimationFrame(() => cancellationTrigger.current?.focus());
                }}
              >
                {t("Сохранить бронь")}
              </Button>
            </div>
          </section>
        ) : (
          <>
            {reservation.cancellation?.allowed ? (
              <div className="my-reservation-cancellation">
                <button
                  ref={cancellationTrigger}
                  type="button"
                  className="button danger"
                  onClick={() => setConfirming(true)}
                >
                  <X size={20} aria-hidden="true" />
                  {t("Отменить бронь")}
                </button>
              </div>
            ) : (
              reservation.status === "confirmed" &&
              reservation.cancellation?.reason && (
                <p className="my-reservation-cancellation-unavailable">
                  {t(
                    cancellationMessages[reservation.cancellation.reason] ||
                      cancellationMessages.cancellation_policy_unset,
                  )}
                </p>
              )
            )}
            <section className="my-reservation-panel-section">
              <h3>{t("Комментарий к ресторану")}</h3>
              <p className="my-reservation-comment-value">
                {reservation.notes || t("Комментарий не указан")}
              </p>
            </section>
            <section className="my-reservation-panel-section my-reservation-contacts">
              <h3>{t("Контакты")}</h3>
              <strong>{reservation.guest_name}</strong>
              {reservation.guest_phone && <span>{reservation.guest_phone}</span>}
              {reservation.guest_email && <span>{reservation.guest_email}</span>}
            </section>
            <section className="my-reservation-panel-section">
              <h3>{t("Заведение")}</h3>
              <p>
                {[reservation.venue_address, reservation.venue_city].filter(Boolean).join(" · ")}
              </p>
              <Button
                kind="secondary"
                icon={ArrowUpRight}
                onClick={() => {
                  onClose();
                  onVenue(reservation.venue_id);
                }}
              >
                {t("Открыть заведение")}
              </Button>
            </section>
            <section className="my-reservation-panel-section my-reservation-preorder">
              <h3>
                {t("Предзаказ")}
                {reservation.preorder_order_number ? ` №${reservation.preorder_order_number}` : ""}
              </h3>
              {reservation.preorder_items.length ? (
                <>
                  {reservation.preorder_status === "cancelled" && (
                    <p className="my-reservation-preorder-cancelled">{t("Предзаказ отменён")}</p>
                  )}
                  <ul>
                    {reservation.preorder_items.map((item, index) => (
                      <li key={`${item.name}-${index}`}>
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <strong>{formatMoney(item.unit_price_minor * item.quantity)}</strong>
                      </li>
                    ))}
                  </ul>
                  {Boolean(reservation.preorder_tip_minor) && (
                    <div>
                      <span>{t("Чаевые")}</span>
                      <strong>{formatMoney(reservation.preorder_tip_minor!)}</strong>
                    </div>
                  )}
                  <div>
                    <span>{t("Итого")}</span>
                    <strong>{formatMoney(reservation.preorder_total_minor)}</strong>
                  </div>
                </>
              ) : (
                <p>{t("Без предзаказа")}</p>
              )}
            </section>
          </>
        )}
      </div>
    </dialog>
  );
}
