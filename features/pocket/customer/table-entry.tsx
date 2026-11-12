"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Clock3,
  Globe,
  HandCoins,
  Menu,
  ReceiptText,
  RefreshCw,
  Utensils,
  WifiOff,
} from "lucide-react";
import { APIError } from "../../../lib/api-client";
import { getPublicVenue, type PublicVenue } from "../../../lib/public-catalog-api";
import {
  callTableStaff,
  getTableBill,
  resolveTableQR,
  type TableBill,
  type TableContext,
} from "../../../lib/table-orders-api";
import { localeOptions, useI18n } from "../i18n";
import { VenueLogo } from "../venue-logo";
import { TablePaymentMethods } from "./table-payment-methods";

const qrError = (error: unknown) =>
  error instanceof APIError && error.code === "qr_invalid"
    ? "QR-код недействителен. Попросите сотрудника заведения показать новый код."
    : "Не удалось открыть стол. Попробуйте ещё раз.";

export function TableEntry({
  token,
  basePath,
  billPage = false,
  onSettings,
}: {
  token: string;
  basePath: string;
  billPage?: boolean;
  onSettings: (page: "menu" | "language") => void;
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
      } catch (error) {
        if (!controller.signal.aborted) setError(qrError(error));
      }
    };
    void load();
    return () => controller.abort();
  }, [token, retry]);
  const toolbar = (
    <nav className="dish-table-toolbar" aria-label={t("Навигация")}>
      {billPage ? (
        <Link className="dish-table-tool" href={basePath} aria-label={t("Назад к столу")}>
          <ArrowLeft size={22} />
        </Link>
      ) : (
        <button
          className="dish-table-tool"
          type="button"
          aria-label={t("Настройки меню")}
          aria-haspopup="dialog"
          onClick={() => onSettings("menu")}
        >
          <Menu size={22} />
        </button>
      )}
      <button
        className="dish-table-tool dish-table-language"
        type="button"
        aria-label={t("Язык интерфейса")}
        aria-haspopup="dialog"
        onClick={() => onSettings("language")}
      >
        <Globe size={19} />
        {localeOptions.find((option) => option.value === locale)?.short}
      </button>
    </nav>
  );
  if (error || !context)
    return (
      <section className="dish-table-state">
        {toolbar}
        <div className="dish-catalog-status" role={error ? "alert" : "status"}>
          {error ? (
            <>
              <ReceiptText size={36} />
              <h1>{t("Не удалось открыть стол")}</h1>
              <p>{t(error)}</p>
              <button
                className="button primary"
                type="button"
                onClick={() => {
                  setError("");
                  setRetry((value) => value + 1);
                }}
              >
                {t("Повторить")}
              </button>
            </>
          ) : (
            t("Открываем ваш стол...")
          )}
        </div>
      </section>
    );
  const { table, venue } = context;
  if (billPage)
    return (
      <article className="dish-table-bill">
        {toolbar}
        <CurrentTableBill
          token={token}
          basePath={basePath}
          tableIdentifier={table.table_identifier}
        />
      </article>
    );
  return (
    <article className="dish-table-home" aria-labelledby="dish-table-name">
      <div className={`dish-table-hero ${venue.image_url ? "has-photo" : ""}`}>
        {venue.image_url && (
          <Image
            className="dish-table-cover"
            src={venue.image_url}
            alt=""
            fill
            unoptimized
            priority
            sizes="(max-width: 760px) 100vw, 960px"
          />
        )}
        <div className="dish-table-shade" />
        {toolbar}
        <div className="dish-table-identity">
          <VenueLogo venueID={venue.id} name={venue.name} imageURL={venue.logo_url} />
          <p className="dish-table-eyebrow">{t("Добро пожаловать")}</p>
          <h1 id="dish-table-name">{venue.name}</h1>
          <span className="dish-table-number">
            <Utensils size={17} aria-hidden="true" />
            {t("Стол {number}", { number: table.table_identifier })}
          </span>
        </div>
      </div>
      <div className="dish-table-actions">
        <Link className="dish-table-action primary" href={`${basePath}/bill`}>
          <ReceiptText size={24} aria-hidden="true" />
          <strong>{t("Оплатить счёт")}</strong>
          <ArrowRight size={21} aria-hidden="true" />
        </Link>
        <Link className="dish-table-action secondary" href={`${basePath}/menu`}>
          <Utensils size={24} aria-hidden="true" />
          <strong>{t("Заказать за стол")}</strong>
          <ArrowRight size={21} aria-hidden="true" />
        </Link>
        <div className="dish-table-brand">
          <Image src="/logo.svg" width={22} height={22} alt="" />
          <span>Pocket Dish</span>
        </div>
      </div>
    </article>
  );
}

const refreshError = "Не удалось обновить счёт. Проверьте подключение к интернету.";
const callFailed = "Не удалось вызвать сотрудника. Проверьте подключение и попробуйте ещё раз.";

// The table's shared bill for the current visit: every guest's orders, totals from the server.
// It refreshes on its own and when the guest comes back to the page; a failed refresh keeps the
// last bill on screen with a retry. Payment goes through the staff until online payment exists.
function CurrentTableBill({
  token,
  basePath,
  tableIdentifier,
}: {
  token: string;
  basePath: string;
  tableIdentifier: string;
}) {
  const { locale, t } = useI18n();
  const [bill, setBill] = useState<TableBill | null>();
  // The visit closed while the guest watched; `called` if they had called the staff to settle.
  const [closed, setClosed] = useState<{ currency: string; called: boolean } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date>();
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState("");
  const [reload, setReload] = useState(0);
  const refreshRef = useRef<() => void>(() => {});
  const billRef = useRef<TableBill | null>(undefined);
  useEffect(() => {
    const controller = new AbortController();
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      setLoading(true);
      try {
        const result = await getTableBill(token, controller.signal);
        if (controller.signal.aborted) return;
        // The visit was settled while the guest watched: say so instead of a blank bill.
        const previous = billRef.current;
        if (previous?.items.length && (!result || result.id !== previous.id))
          setClosed({
            currency: previous.currency,
            called: Boolean(previous.payment_requested_at),
          });
        if (result?.items.length) setClosed(null);
        billRef.current = result;
        setBill(result);
        setUpdatedAt(new Date());
        setError("");
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof APIError && error.code === "qr_invalid") {
          // A revoked QR must not keep showing the table's bill.
          billRef.current = undefined;
          setBill(undefined);
          setError(qrError(error));
        } else {
          setError(refreshError);
        }
      } finally {
        refreshing = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    refreshRef.current = () => void refresh();
    void refresh();
    const onVisible = () => {
      if (document.visibilityState !== "hidden") void refresh();
    };
    const timer = window.setInterval(onVisible, 15000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [token, reload]);
  const time = (value: Date) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(value);
  const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount / 100);
  // Calling the staff is not a payment: the bill stays open until a staff member confirms it.
  const callStaff = async () => {
    if (calling) return;
    setCalling(true);
    setCallError("");
    try {
      const result = await callTableStaff(token);
      billRef.current = result;
      setBill(result);
      setUpdatedAt(new Date());
    } catch (error) {
      // not_found: the visit was settled meanwhile; the refresh shows it.
      if (error instanceof APIError && error.code === "not_found") refreshRef.current();
      else if (error instanceof APIError && error.code === "qr_invalid")
        setCallError(qrError(error));
      else setCallError(callFailed);
    } finally {
      setCalling(false);
    }
  };
  const header = (
    <header className="dish-table-bill-header">
      <div>
        <h1>{t("Общий счёт")}</h1>
        <p>
          {t("Стол {number}", { number: tableIdentifier })}
          {updatedAt && ` · ${t("обновлено в {time}", { time: time(updatedAt) })}`}
        </p>
      </div>
      <button
        type="button"
        className="dish-table-refresh"
        aria-label={t("Обновить счёт")}
        aria-busy={loading}
        disabled={loading}
        onClick={() => refreshRef.current()}
      >
        <RefreshCw size={20} aria-hidden="true" className={loading ? "spinning" : ""} />
      </button>
    </header>
  );
  const retry = (
    <button
      className="button secondary"
      type="button"
      onClick={() => {
        setError("");
        setReload((value) => value + 1);
      }}
    >
      {t("Повторить")}
    </button>
  );
  if (bill === undefined)
    return (
      <>
        {header}
        <div className="dish-table-bill-card" role={error ? "alert" : "status"}>
          {error ? (
            <div className="dish-table-bill-problem">
              <p>
                {t(
                  error === refreshError ? "Не удалось загрузить счёт. Попробуйте ещё раз." : error,
                )}
              </p>
              {retry}
            </div>
          ) : (
            t("Загружаем счёт...")
          )}
        </div>
      </>
    );
  const offline = error && (
    <div className="dish-table-bill-offline" role="alert">
      <WifiOff size={18} aria-hidden="true" />
      <p>
        {t(error)} {updatedAt && t("Показан счёт на {time}.", { time: time(updatedAt) })}
      </p>
      {retry}
    </div>
  );
  if (!bill || !bill.items.length)
    return (
      <>
        {header}
        {offline}
        <section className="dish-table-bill-card dish-table-empty">
          <span className="dish-table-empty-icon">
            {closed ? (
              <CircleCheck size={34} aria-hidden="true" />
            ) : (
              <ReceiptText size={34} aria-hidden="true" />
            )}
          </span>
          <h2>
            {t(
              closed?.called ? "Оплата подтверждена" : closed ? "Счёт закрыт" : "Пока нет заказов",
            )}
          </h2>
          {closed && (
            <p className="dish-table-zero">
              {t("Текущий счёт: {amount}", { amount: formatMoney(0, closed.currency) })}
            </p>
          )}
          <p>
            {t(
              closed?.called
                ? "Спасибо! Сотрудник подтвердил оплату. Новый заказ откроет новый счёт."
                : closed
                  ? "Спасибо! Новый заказ откроет новый счёт."
                  : "Выберите блюда в меню — они появятся в общем счёте.",
            )}
          </p>
          <Link className="dish-table-action primary" href={`${basePath}/menu`}>
            <Utensils size={22} />
            <strong>{t("Заказать за стол")}</strong>
            <ArrowRight size={20} />
          </Link>
          {!closed && (
            <button className="dish-table-action secondary" type="button" disabled>
              <ReceiptText size={22} />
              <strong>{t("Оплатить счёт")}</strong>
            </button>
          )}
        </section>
      </>
    );
  const money = (amount: number) => formatMoney(amount, bill.currency);
  const pending = bill.status === "payment_pending";
  const calledAt = bill.payment_requested_at ? new Date(bill.payment_requested_at) : undefined;
  return (
    <>
      {header}
      {offline}
      <section className="dish-table-bill-card" aria-label={t("Общий счёт")} aria-busy={loading}>
        <ul className="dish-table-bill-items">
          {bill.items.map((item, index) => (
            <li key={`${item.order_id}-${index}`}>
              <div>
                <strong>{item.name}</strong>
                <small>
                  {t("Заказ №{number}", { number: item.order_number })} · {item.quantity} ×{" "}
                  {money(item.unit_price_minor)}
                </small>
              </div>
              <strong>{money(item.total_minor)}</strong>
            </li>
          ))}
        </ul>
        <dl className="dish-table-totals">
          <div>
            <dt>{t("Блюда")}</dt>
            <dd>{money(bill.subtotal_minor)}</dd>
          </div>
          {(
            [
              ["Чаевые", bill.tip_minor],
              ["Налог", bill.tax_minor],
              ["Сервисный сбор", bill.service_fee_minor],
            ] as const
          )
            .filter(([, amount]) => amount !== 0)
            .map(([label, amount]) => (
              <div key={label}>
                <dt>{t(label)}</dt>
                <dd>{money(amount)}</dd>
              </div>
            ))}
          <div className="dish-table-total">
            <dt>{t("Итого")}</dt>
            <dd>{money(bill.total_minor)}</dd>
          </div>
        </dl>
        <p className="dish-table-bill-note">
          {t("В счёте заказы всех гостей за этим столом. Отменённые блюда не учитываются.")}
        </p>
        {/* Payment method: cash calls the staff; the online methods are a mock-up (V-TBL-06/08). */}
        {!pending && !calledAt && (
          <TablePaymentMethods
            amount={money(bill.total_minor)}
            calling={calling}
            onPayCash={() => void callStaff()}
          />
        )}
        {pending ? (
          <div className="dish-table-pay-panel" role="status">
            <Clock3 size={22} aria-hidden="true" />
            <div>
              <strong>{t("Счёт передан на оплату")}</strong>
              <p>{t("Новые заказы временно недоступны, пока сотрудник проводит расчёт.")}</p>
            </div>
          </div>
        ) : calledAt ? (
          <div className="dish-table-pay-panel" role="status">
            <HandCoins size={22} aria-hidden="true" />
            <div>
              <strong>
                {t("Сотрудник вызван · к оплате {amount}", { amount: money(bill.total_minor) })}
              </strong>
              <p>
                {t(
                  "Вызов отправлен в {time}. Сотрудник подойдёт к столу {number} для расчёта картой или наличными.",
                  { time: time(calledAt), number: tableIdentifier },
                )}
              </p>
              <p>{t("Счёт закроется, когда сотрудник подтвердит оплату.")}</p>
            </div>
          </div>
        ) : (
          callError && (
            <p className="dish-table-call-error" role="alert">
              {t(callError)}
            </p>
          )
        )}
      </section>
    </>
  );
}
