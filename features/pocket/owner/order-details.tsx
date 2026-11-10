"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Ban, CalendarDays, Check, MessageSquare, X } from "lucide-react";
import { reservationStatusLabels } from "../reservation-status";
import type { OwnerOrder } from "../../../lib/owner-api";
import { useI18n } from "../i18n";
import { SlideToConfirm } from "../customer/slide-to-confirm";
import { useMobileViewport } from "../use-mobile-viewport";
import { OrderCancellationDialog, cancellationReasons } from "./order-cancellation";
import { Button, IconButton, money } from "../ui";
import { useOwnerWorkspace } from "./context";
import { type OrderStatusChange } from "./use-order-status-feedback";
import { isFinalOrder, nextOrderAction, orderStatusLabels } from "./order-workflow";

export function OrderDetails({
  date,
  order,
  statusChange,
  onBack,
}: {
  date: Intl.DateTimeFormat;
  order: OwnerOrder;
  statusChange?: OrderStatusChange;
  onBack: () => void;
}) {
  const { setOrderStatus, refreshOrders, getOrderDetails } = useOwnerWorkspace();
  const { t } = useI18n();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [details, setDetails] = useState<OwnerOrder | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  useEffect(() => {
    if (!getOrderDetails) return;
    let active = true;
    getOrderDetails(order.id)
      .then((value) => {
        if (active) {
          setDetails(value);
          setHistoryFailed(false);
        }
      })
      .catch(() => {
        if (active) setHistoryFailed(true);
      });
    return () => {
      active = false;
    };
  }, [getOrderDetails, order.id, order.status, order.updated_at]);
  const mobile = useMobileViewport();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);
  const action = nextOrderAction(order);
  const canCancel = !isFinalOrder(order) && Boolean(order.allowed_actions?.includes("cancelled"));
  const change = async (
    status: OwnerOrder["status"],
    cancellation?: { reason: string; comment?: string },
  ) => {
    if (status === "cancelled" && !cancellation) {
      setCancelOpen(true);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      setFailed(false);
      if (cancellation) await setOrderStatus(order.id, status, cancellation);
      else await setOrderStatus(order.id, status);
      setCancelOpen(false);
    } catch {
      setFailed(true);
      await refreshOrders().catch(() => undefined);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const reservationDialog = useRef<HTMLDialogElement>(null);
  const count = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  return (
    <article className="orders-detail" aria-label={`${t("Заказ")} № ${order.number}`}>
      <div className="orders-mobile-navigation">
        <button className="orders-mobile-back" onClick={onBack}>
          <ArrowLeft size={20} />
          {t("К заказам")}
        </button>
        {mobile && canCancel && (
          <button
            type="button"
            className="orders-mobile-cancel"
            disabled={busy}
            onClick={() => void change("cancelled")}
          >
            <Ban size={18} aria-hidden="true" />
            {t("Отменить заказ")}
          </button>
        )}
      </div>
      <section className="orders-card orders-summary">
        {statusChange && (
          <span key={statusChange.version} className="orders-change-flash" aria-hidden="true" />
        )}
        <div className="orders-detail-badges">
          <span
            key={statusChange?.version ?? "initial"}
            className={`orders-status status-${order.status} ${statusChange ? "orders-status-updated" : ""}`}
          >
            {t(orderStatusLabels[order.status])}
          </span>
          <span className="orders-channel">
            {t(
              order.reservation_starts_at
                ? "Предзаказ"
                : order.channel === "dine_in"
                  ? "За столом"
                  : "Онлайн",
            )}
          </span>
        </div>
        <h2>
          {t("Заказ")} № {order.number}
        </h2>
        <dl>
          <div>
            <dt>{t("Создан")}</dt>
            <dd>{date.format(new Date(order.created_at))}</dd>
          </div>
          <div>
            <dt>{t("Источник заказа")}</dt>
            <dd>{t(order.source)}</dd>
          </div>
          {order.reservation_starts_at && (
            <div className="orders-visit">
              <dt>{t("Время визита")}</dt>
              <dd>
                <CalendarDays size={17} />
                {date.format(new Date(order.reservation_starts_at))}
              </dd>
            </div>
          )}
          {order.reservation_code && (
            <div>
              <dt>{t("Бронь")}</dt>
              <dd>{order.reservation_code}</dd>
            </div>
          )}
          {order.guest_name && (
            <div>
              <dt>{t("Гость")}</dt>
              <dd>{order.guest_name}</dd>
            </div>
          )}
          {Boolean(order.guest_count) && (
            <div>
              <dt>{t("Гости")}</dt>
              <dd>{order.guest_count}</dd>
            </div>
          )}
          {order.guest_phone && (
            <div>
              <dt>{t("Телефон")}</dt>
              <dd>
                <a href={`tel:${order.guest_phone}`}>{order.guest_phone}</a>
              </dd>
            </div>
          )}
        </dl>
        {order.reservation_id && order.reservation_starts_at && (
          <>
            <Button
              kind="secondary"
              icon={CalendarDays}
              onClick={() => reservationDialog.current?.showModal()}
            >
              {t("Открыть бронь")}
            </Button>
            <dialog
              ref={reservationDialog}
              className="order-booking-dialog"
              aria-labelledby="order-booking-title"
            >
              <header>
                <h3 id="order-booking-title">
                  {order.reservation_code
                    ? t("Бронь №{code}", { code: order.reservation_code })
                    : t("Информация о брони")}
                </h3>
                <IconButton
                  icon={X}
                  label={t("Закрыть")}
                  onClick={() => reservationDialog.current?.close()}
                />
              </header>
              <dl>
                <div>
                  <dt>{t("Время визита")}</dt>
                  <dd>{date.format(new Date(order.reservation_starts_at))}</dd>
                </div>
                {order.reservation_status && (
                  <div>
                    <dt>{t("Статус брони")}</dt>
                    <dd>
                      {t(
                        order.reservation_status === "pending"
                          ? "Ожидает подтверждения"
                          : reservationStatusLabels[order.reservation_status],
                      )}
                    </dd>
                  </div>
                )}
                {order.table_label && (
                  <div>
                    <dt>{t("Стол")}</dt>
                    <dd>{order.table_label}</dd>
                  </div>
                )}
                {Boolean(order.guest_count) && (
                  <div>
                    <dt>{t("Гости")}</dt>
                    <dd>{order.guest_count}</dd>
                  </div>
                )}
                {order.guest_name && (
                  <div>
                    <dt>{t("Гость")}</dt>
                    <dd>{order.guest_name}</dd>
                  </div>
                )}
                {order.guest_phone && (
                  <div>
                    <dt>{t("Телефон")}</dt>
                    <dd>
                      <a href={`tel:${order.guest_phone}`}>{order.guest_phone}</a>
                    </dd>
                  </div>
                )}
              </dl>
            </dialog>
          </>
        )}
      </section>
      {order.notes?.trim() && (
        <section className="orders-card orders-comment">
          <MessageSquare size={22} />
          <div>
            <h3>{t("Комментарий к заказу")}</h3>
            <p>{order.notes}</p>
          </div>
        </section>
      )}
      <section className="orders-card orders-composition" aria-label={t("Состав заказа")}>
        <header>
          <h3>{t("Состав заказа")}</h3>
          <span>{t("Позиций: {count}", { count })}</span>
        </header>
        {order.items?.length ? (
          <ul>
            {order.items.map((item, index) => {
              const priced = typeof item.unit_price_minor === "number" && Boolean(order.currency);
              return (
                <li key={item.id ?? index}>
                  <span className="orders-quantity">{item.quantity}×</span>
                  <div>
                    <strong>{item.name}</strong>
                    {priced && (
                      <small>
                        {money(item.unit_price_minor / 100, order.currency)} {t("за шт.")}
                      </small>
                    )}
                    {item.notes?.trim() && <p className="orders-item-note">{item.notes}</p>}
                  </div>
                  {priced && (
                    <strong>
                      {money(
                        (item.total_minor ?? item.unit_price_minor * item.quantity) / 100,
                        order.currency,
                      )}
                    </strong>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="orders-placeholder">{t("Состав заказа недоступен")}</p>
        )}
      </section>
      {typeof order.total_minor === "number" && order.currency && (
        <section className="orders-card orders-totals" aria-label={t("Итого")}>
          {typeof order.tip_minor === "number" && (
            <div>
              <span>{t("Чаевые")}</span>
              <strong>{money(order.tip_minor / 100, order.currency)}</strong>
            </div>
          )}
          <div className="orders-grand-total">
            <span>{t("Итого")}</span>
            <strong>{money(order.total_minor / 100, order.currency)}</strong>
          </div>
        </section>
      )}
      {order.cancellation_blocked && (
        <section className="orders-card">
          <p>{t("Отмена недоступна: есть платёж или счёт закрыт.")}</p>
        </section>
      )}
      {details?.status_events?.length || historyFailed ? (
        <section className="orders-card orders-audit">
          <h3>{t("Журнал изменений")}</h3>
          {historyFailed ? (
            <p role="alert">{t("Не удалось загрузить журнал изменений")}</p>
          ) : (
            <ol>
              {details?.status_events?.map((event) => (
                <li key={event.id}>
                  <strong>
                    {t(orderStatusLabels[event.previous_status])} →{" "}
                    {t(orderStatusLabels[event.new_status])}
                  </strong>
                  <p>
                    {event.actor_name} · {date.format(new Date(event.created_at))}
                  </p>
                  {event.reason && <p>{t(cancellationReasons[event.reason] ?? event.reason)}</p>}
                  {event.comment && <p className="orders-audit-comment">{event.comment}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
      {cancelOpen && (
        <OrderCancellationDialog
          busy={busy}
          failed={failed}
          onClose={() => setCancelOpen(false)}
          onConfirm={(value) => void change("cancelled", value)}
        />
      )}
      <footer className="orders-card orders-actions">
        {failed && (
          <p role="alert">
            {t("Действие не выполнено. Проверьте актуальный статус заказа и повторите попытку.")}
          </p>
        )}
        {action || canCancel ? (
          <>
            <div>
              {action &&
                (mobile ? (
                  <SlideToConfirm
                    key={action.status}
                    label={action.label}
                    pendingLabel="Сохранение..."
                    pending={busy}
                    onConfirm={() => change(action.status)}
                  />
                ) : (
                  <Button icon={Check} disabled={busy} onClick={() => void change(action.status)}>
                    {t(busy ? "Сохранение..." : action.label)}
                  </Button>
                ))}
              {!mobile && canCancel && (
                <Button
                  kind="quiet"
                  disabled={busy}
                  className="orders-cancel"
                  onClick={() => void change("cancelled")}
                >
                  {t("Отменить заказ")}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="orders-final-note">
              {t(
                order.status === "cancelled"
                  ? "Заказ отменён"
                  : order.status === "completed"
                    ? "Заказ завершён"
                    : "Доступен только просмотр",
              )}
            </p>
          </>
        )}
      </footer>
    </article>
  );
}
