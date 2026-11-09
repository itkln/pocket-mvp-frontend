"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  History,
  Minus,
  Plus,
  ShoppingBag,
  Utensils,
  X,
} from "lucide-react";
import { APIError } from "../../../lib/api-client";
import { createReservationKey } from "../../../lib/reservation-key";
import {
  getPublicVenueMenu,
  type PublicMenuCategory,
  type PublicVenue,
} from "../../../lib/public-catalog-api";
import {
  legacyTableOrderKeys,
  planRepeatedOrder,
  repeatedQuantities,
  type RepeatPlan,
} from "../../../lib/table-order-history";
import {
  createTableOrder,
  getVenueOrderHistory,
  lookupTableOrder,
  resolveTableQR,
  type TableContext,
  type TableOrder,
  type TableOrderInput,
} from "../../../lib/table-orders-api";
import { localeTags, useI18n } from "../i18n";
import type { AuthUser } from "../../../lib/auth-api";
import { VenueDetailsScreen } from "./venue-details";

import { restoredTip, tipAmount, tipSelection, type TipDraft } from "../../../lib/gratuity";
import { TipBreakdown, TipPicker } from "./tip-picker";
import { SlideToConfirm } from "./slide-to-confirm";

type Draft = {
  tip: TipDraft;
  quantities: Record<string, number>;
  notes: string;
  lastKey?: string;
  orderKeys?: string[];
  submission?: TableOrderInput;
};
const mobileQuery = "(max-width: 760px)";
const subscribeMobile = (onChange: () => void) => {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const mobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const serverSnapshot = () => false;
const emptyDraft = (): Draft => ({ quantities: {}, notes: "", tip: { mode: "none" } });
function loadDraft(token: string): Draft {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(`pocket:table-cart:${token}`) ?? "null",
    ) as Draft | null;
    if (!value || typeof value.notes !== "string" || !value.quantities) return emptyDraft();
    return {
      ...value,
      tip: restoredTip(value.tip),
      orderKeys: Array.isArray(value.orderKeys)
        ? value.orderKeys.filter((key) => typeof key === "string" && key.length > 0)
        : [],
      quantities: Object.fromEntries(
        Object.entries(value.quantities).filter(
          ([id, qty]) =>
            /^[\da-f-]{36}$/i.test(id) && Number.isInteger(qty) && qty > 0 && qty <= 30,
        ),
      ),
    };
  } catch {
    return emptyDraft();
  }
}
const statusLabels: Record<string, string> = {
  new: "Заказ отправлен",
  accepted: "Заказ принят",
  preparing: "Готовится",
  ready: "Готов",
  served: "Подано",
  completed: "Завершен",
  cancelled: "Отменен",
};
const savedOrderKeys = (draft: Draft, key: string) => [
  ...new Set([...(draft.orderKeys ?? []), ...(draft.lastKey ? [draft.lastKey] : []), key]),
];

function TableOrderReceipt({
  order,
  titleRef,
}: {
  order: TableOrder;
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  const { locale, t } = useI18n();
  const money = (amount: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: order.currency }).format(
      amount / 100,
    );
  return (
    <section className="venue-table-order-result" aria-label={t("Чек заказа")}>
      <div
        className={`venue-table-receipt-status ${order.status === "cancelled" ? "cancelled" : ""}`}
        role="status"
      >
        {order.status === "cancelled" ? (
          <X size={24} aria-hidden="true" />
        ) : (
          <CheckCircle2 size={28} aria-hidden="true" />
        )}
        <h3 ref={titleRef} tabIndex={-1}>
          {t(statusLabels[order.status] ?? "Заказ отправлен")} №{order.number}
        </h3>
        {order.status === "new" && <p>{t("Ваш заказ отправлен в обработку")}</p>}
      </div>
      <div className="venue-table-receipt-meta">
        <span>{t("Стол {number}", { number: order.table_identifier })}</span>
        <time dateTime={order.created_at}>
          {new Intl.DateTimeFormat(localeTags[locale], {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(order.created_at))}
        </time>
      </div>
      <ul>
        {order.items.map((item, index) => (
          <li key={index}>
            <div>
              <span>{item.name}</span>
              <small>
                {item.quantity} × {money(item.unit_price_minor)}
              </small>
            </div>
            <strong>{money(item.unit_price_minor * item.quantity)}</strong>
          </li>
        ))}
      </ul>
      <TipBreakdown
        subtotal={
          order.subtotal_minor ??
          order.items.reduce((sum, item) => sum + item.unit_price_minor * item.quantity, 0)
        }
        tip={order.tip_minor ?? 0}
        currency={order.currency}
      />
      <div className="venue-table-receipt-total">
        <span>{t("Итого")}</span>
        <strong>{money(order.total_minor)}</strong>
      </div>
      <p className="venue-table-receipt-payment">{t("Оплата в заведении")}</p>
      {order.notes && (
        <div className="venue-table-order-result-notes">
          <strong>{t("Комментарий к заказу")}</strong>
          <p>{order.notes}</p>
        </div>
      )}
    </section>
  );
}

export function TableVenueScreen({
  token,
  onBack,
  notify,
  onVenueLoaded,
  desktopMenuQuery,
  user = null,
}: {
  user?: AuthUser | null;
  token: string;
  onBack: () => void;
  notify?: (message: string) => void;
  onVenueLoaded?: (venue: PublicVenue) => void;
  desktopMenuQuery?: string;
}) {
  const { locale, t } = useI18n();
  const mobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, serverSnapshot);
  const [table, setTable] = useState<TableContext | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [menu, setMenu] = useState<PublicMenuCategory[]>([]);
  const [menuRevision, setMenuRevision] = useState(0);
  const [draft, setDraft] = useState(() => loadDraft(token));
  const [order, setOrder] = useState<TableOrder | null>(null);
  const [historyOrders, setHistoryOrders] = useState<TableOrder[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyOrderID, setHistoryOrderID] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [historyCursor, setHistoryCursor] = useState("");
  const [repeatPlan, setRepeatPlan] = useState<RepeatPlan | null>(null);
  const repeatOpen = Boolean(repeatPlan);
  const [repeatLoading, setRepeatLoading] = useState(false);
  const [repeatError, setRepeatError] = useState("");
  const historyScopeKey = useRef("");
  const historyHasMorePages = useRef(false);
  const historyVenueID = table?.venue_id;
  const repeatController = useRef<AbortController | null>(null);
  const moreController = useRef<AbortController | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const draftLocked = pending || Boolean(draft.submission);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const submission = useRef(draft.submission);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const historyDialogRef = useRef<HTMLDialogElement>(null);
  const historyHeadingRef = useRef<HTMLHeadingElement>(null);
  const receiptTitleRef = useRef<HTMLHeadingElement>(null);
  const money = (amount: number, currency = table?.currency ?? "EUR") =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount / 100);
  const lookupKeys = useMemo(
    () => [
      ...new Set(
        [draft.lastKey, draft.submission?.idempotency_key].filter((key): key is string =>
          Boolean(key),
        ),
      ),
    ],
    [draft.lastKey, draft.submission?.idempotency_key],
  );
  const rememberOrder = useCallback(
    (result: TableOrder) =>
      setHistoryOrders((current) =>
        [...current.filter((entry) => entry.id !== result.id), result].sort(
          (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
        ),
      ),
    [],
  );
  const mergeHistory = useCallback(
    (orders: TableOrder[]) =>
      setHistoryOrders((current) => {
        const byID = new Map(current.map((entry) => [entry.id, entry]));
        orders.forEach((entry) => byID.set(entry.id, entry));
        return [...byID.values()].sort(
          (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id),
        );
      }),
    [],
  );
  useEffect(
    () => () => {
      repeatController.current?.abort();
      moreController.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!historyVenueID) return;
    const controller = new AbortController();
    let refreshing = false;
    const refresh = async () => {
      if (refreshing || moreController.current) return;
      refreshing = true;
      setHistoryLoading(true);
      try {
        const keys = legacyTableOrderKeys();
        const batches = keys.length
          ? Array.from({ length: Math.ceil(keys.length / 100) }, (_, index) =>
              keys.slice(index * 100, (index + 1) * 100),
            )
          : [[]];
        for (const legacyKeys of batches) {
          const page = await getVenueOrderHistory(historyVenueID, {
            legacyKeys,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          if (historyScopeKey.current && historyScopeKey.current !== page.scope_key) {
            setHistoryOrders(page.orders);
            setOrder(null);
            setHistoryOrderID(null);
            setRepeatPlan(null);
            repeatController.current?.abort();
            setRepeatLoading(false);
            historyHasMorePages.current = false;
          } else mergeHistory(page.orders);
          historyScopeKey.current = page.scope_key;
          if (!historyHasMorePages.current) setHistoryCursor(page.next_cursor ?? "");
        }
        setHistoryError(false);
      } catch (err) {
        if (!controller.signal.aborted) {
          if (err instanceof APIError && err.status === 401) {
            setHistoryOrders([]);
            setOrder(null);
            setHistoryOrderID(null);
            setRepeatPlan(null);
            repeatController.current?.abort();
            setRepeatLoading(false);
            setHistoryCursor("");
            historyHasMorePages.current = false;
          }
          setHistoryError(true);
        }
      } finally {
        refreshing = false;
        if (!controller.signal.aborted) setHistoryLoading(false);
      }
    };
    void refresh();
    const interval = historyOpen
      ? window.setInterval(() => {
          if (document.visibilityState !== "hidden") void refresh();
        }, 10000)
      : undefined;
    return () => {
      controller.abort();
      if (interval) clearInterval(interval);
    };
  }, [historyVenueID, historyRevision, historyOpen, mergeHistory]);
  const loadMoreHistory = async () => {
    if (!table || !historyCursor || historyLoading) return;
    moreController.current?.abort();
    const controller = new AbortController();
    moreController.current = controller;
    setHistoryLoading(true);
    try {
      const page = await getVenueOrderHistory(table.venue_id, {
        cursor: historyCursor,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (page.scope_key !== historyScopeKey.current) {
        setHistoryRevision((value) => value + 1);
        return;
      }
      historyHasMorePages.current = true;
      mergeHistory(page.orders);
      setHistoryCursor(page.next_cursor ?? "");
      setHistoryError(false);
    } catch {
      if (!controller.signal.aborted) setHistoryError(true);
    } finally {
      if (moreController.current === controller) moreController.current = null;
      if (!controller.signal.aborted) setHistoryLoading(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    resolveTableQR(token, controller.signal)
      .then((result) => {
        setTable(result);
        setLoadError("");
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setLoadError(
            err instanceof APIError && err.code === "qr_invalid"
              ? "QR-код недействителен. Попросите сотрудника заведения показать новый код."
              : "Не удалось открыть стол. Попробуйте ещё раз.",
          );
      });
    return () => controller.abort();
  }, [token, reload]);
  useEffect(() => {
    try {
      sessionStorage.setItem(`pocket:table-cart:${token}`, JSON.stringify(draft));
    } catch {
      /* The cart still works when browser storage is unavailable. */
    }
  }, [token, draft]);
  useEffect(() => {
    if (!table || !lookupKeys.length) return;
    const controller = new AbortController();
    const latestKey = draft.submission?.idempotency_key ?? draft.lastKey;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      const results = await Promise.allSettled(
        lookupKeys.map(async (key) => {
          const result = await lookupTableOrder(token, key, controller.signal);
          if (controller.signal.aborted) return;
          rememberOrder(result);
          if (key === latestKey) setOrder(result);
          if (key === draft.submission?.idempotency_key) {
            if (submission.current?.idempotency_key === key) submission.current = undefined;
            setError("");
            setDraft((current) =>
              current.submission?.idempotency_key === key
                ? { ...emptyDraft(), lastKey: key, orderKeys: savedOrderKeys(current, key) }
                : current,
            );
          }
        }),
      );
      if (controller.signal.aborted) return;
      if (
        results.some(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof APIError &&
            result.reason.code === "qr_invalid",
        )
      )
        setLoadError("QR-код недействителен. Попросите сотрудника заведения показать новый код.");
    };
    refresh();
    const interval = window.setInterval(refresh, 10000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [
    table,
    token,
    lookupKeys,
    draft.lastKey,
    draft.submission?.idempotency_key,
    historyRevision,
    rememberOrder,
  ]);
  useEffect(() => {
    if (!cartOpen) return;
    const trigger = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
      trigger?.focus();
    };
  }, [cartOpen]);
  useEffect(() => {
    if (!historyOpen) return;
    const trigger = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = historyDialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
      trigger?.focus();
    };
  }, [historyOpen]);
  useEffect(() => {
    if (historyOpen) historyHeadingRef.current?.focus();
  }, [historyOpen, historyOrderID, repeatOpen]);
  const historyImages = useMemo(
    () =>
      new Map(menu.flatMap((category) => category.items.map((item) => [item.id, item.image_url]))),
    [menu],
  );
  const items = menu.flatMap((category) => category.items);
  const selected = items.filter((item) => draft.quantities[item.id] > 0);
  const unavailable = Object.keys(draft.quantities).filter(
    (id) => !items.some((item) => item.id === id),
  );
  const count = Object.values(draft.quantities).reduce((sum, qty) => sum + qty, 0);
  const subtotal = draft.submission
    ? draft.submission.items.reduce(
        (sum, item) => sum + item.expected_price_minor * item.quantity,
        0,
      )
    : selected.reduce((sum, item) => sum + item.price_minor * draft.quantities[item.id], 0);
  const selectedTip = tipSelection(draft.tip);
  const tip = tipAmount(subtotal, selectedTip);
  const total = subtotal + (tip ?? 0);
  const changeTip = (value: TipDraft) => {
    if (sending.current || submission.current) return;
    submission.current = undefined;
    setDraft((current) => ({ ...current, tip: value, submission: undefined }));
    setError("");
  };
  useEffect(() => {
    if (cartOpen && order?.id && count === 0) receiptTitleRef.current?.focus();
  }, [cartOpen, order?.id, count]);
  const changeQuantity = (id: string, delta: number) => {
    if (sending.current || submission.current) return;
    submission.current = undefined;
    setDraft((current) => {
      const quantities = { ...current.quantities };
      const qty = Math.max(0, Math.min(30, (quantities[id] ?? 0) + delta));
      if (qty) quantities[id] = qty;
      else delete quantities[id];
      return {
        ...current,
        quantities,
        tip: Object.keys(quantities).length ? current.tip : { mode: "none" },
        submission: undefined,
      };
    });
    setError("");
  };
  const send = async () => {
    if (!table || sending.current) return;
    let input = submission.current;
    if (!input) {
      if (!count || unavailable.length || tip === null || !selectedTip) return;
      input = {
        token,
        tip: selectedTip,
        expected_total_minor: total,
        idempotency_key: createReservationKey(),
        notes: draft.notes,
        items: selected.map((item) => ({
          menu_item_id: item.id,
          quantity: draft.quantities[item.id],
          expected_price_minor: item.price_minor,
        })),
      };
    }
    sending.current = true;
    setPending(true);
    setError("");
    submission.current = input;
    const submittedDraft = { ...draft, submission: input };
    // Persist the exact retry payload before starting a request that can outlive the page.
    try {
      sessionStorage.setItem(`pocket:table-cart:${token}`, JSON.stringify(submittedDraft));
    } catch {
      /* In-memory retries still work without storage. */
    }
    setDraft(submittedDraft);
    try {
      const result = await createTableOrder(input);
      setOrder(result);
      rememberOrder(result);
      setHistoryRevision((value) => value + 1);
      submission.current = undefined;
      setDraft((current) => ({
        ...emptyDraft(),
        lastKey: input.idempotency_key,
        orderKeys: savedOrderKeys(current, input.idempotency_key),
      }));
      notify?.("Ваш заказ отправлен в обработку");
    } catch (err) {
      // Only a definitive rejection unlocks edits. A lost response may hide a committed order.
      if (
        err instanceof APIError &&
        ["price_changed", "item_unavailable", "bill_locked", "invalid_input"].includes(err.code)
      ) {
        submission.current = undefined;
        setDraft((current) => ({ ...current, submission: undefined }));
      }
      if (
        err instanceof APIError &&
        (err.code === "price_changed" || err.code === "item_unavailable")
      ) {
        submission.current = undefined;
        setDraft((current) => ({ ...current, submission: undefined }));
        setError(
          err.code === "price_changed"
            ? "Цена изменилась. Проверьте обновлённую сумму и отправьте заказ снова."
            : "Блюдо больше недоступно. Уберите его из заказа.",
        );
        setMenuRevision((value) => value + 1);
      } else if (err instanceof APIError && err.code === "qr_invalid")
        setLoadError("QR-код недействителен. Попросите сотрудника заведения показать новый код.");
      else
        setError(
          err instanceof APIError && err.code === "bill_locked"
            ? "Заказ сейчас недоступен. Обратитесь к сотруднику заведения."
            : "Не удалось отправить заказ. Попробуйте ещё раз.",
        );
    } finally {
      sending.current = false;
      setPending(false);
    }
  };
  const prepareRepeat = async (entry: TableOrder) => {
    if (!table || repeatLoading || sending.current || submission.current) return;
    repeatController.current?.abort();
    const controller = new AbortController();
    repeatController.current = controller;
    setRepeatLoading(true);
    setRepeatError("");
    try {
      const [freshMenu, currentTable] = await Promise.all([
        getPublicVenueMenu(table.venue_id, controller.signal),
        resolveTableQR(token, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      if (!currentTable.ordering_enabled || currentTable.venue_id !== table.venue_id) {
        setRepeatError("Заказ сейчас недоступен. Обратитесь к сотруднику заведения.");
        return;
      }
      setTable(currentTable);
      setMenu(freshMenu);
      setMenuRevision((value) => value + 1);
      setRepeatPlan(planRepeatedOrder(entry, freshMenu, currentTable.currency));
    } catch (err) {
      if (!controller.signal.aborted)
        setRepeatError(
          err instanceof APIError && err.code === "qr_invalid"
            ? "QR-код недействителен. Попросите сотрудника заведения показать новый код."
            : "Не удалось подготовить повтор заказа. Попробуйте ещё раз.",
        );
    } finally {
      if (!controller.signal.aborted) setRepeatLoading(false);
    }
  };
  const cancelRepeat = () => {
    repeatController.current?.abort();
    setRepeatLoading(false);
    setRepeatPlan(null);
    setRepeatError("");
  };
  const closeHistory = () => {
    cancelRepeat();
    setHistoryOpen(false);
  };
  const changeRepeatQuantity = (id: string, delta: number) => {
    if (sending.current || submission.current) return;
    setRepeatPlan(
      (current) =>
        current && {
          ...current,
          lines: current.lines
            .map((line) =>
              line.id === id
                ? { ...line, quantity: Math.max(0, Math.min(30, line.quantity + delta)) }
                : line,
            )
            .filter((line) => line.quantity > 0),
        },
    );
  };
  const applyRepeat = (merge: boolean) => {
    if (!repeatPlan || !repeatPlan.lines.length || sending.current || submission.current) return;
    submission.current = undefined;
    setDraft((current) => ({
      ...current,
      quantities: repeatedQuantities(repeatPlan, current.quantities, merge),
      tip: { mode: "none" },
      notes: merge
        ? [...new Set([current.notes.trim(), repeatPlan.order.notes.trim()].filter(Boolean))]
            .join("\n")
            .slice(0, 2000)
        : repeatPlan.order.notes,
      submission: undefined,
    }));
    setError("");
    setOrder(null);
    setRepeatPlan(null);
    setHistoryOpen(false);
    setCartOpen(false);
  };

  if (loadError)
    return (
      <div className="dish-catalog-status" role="alert">
        <h2>{t("Не удалось открыть стол")}</h2>
        <p>{t(loadError)}</p>
        <button
          type="button"
          className="button primary"
          onClick={() => setReload((value) => value + 1)}
        >
          {t("Повторить")}
        </button>
      </div>
    );
  if (!table)
    return (
      <div className="dish-catalog-status" role="status">
        {t("Открываем меню вашего стола...")}
      </div>
    );
  const cartOptions = table.ordering_enabled && count > 0 && (
    <div className="venue-table-order-options">
      <label className="venue-table-order-notes">
        {t("Комментарий к заказу")}
        <textarea
          aria-label={t("Комментарий к заказу")}
          maxLength={500}
          value={draft.notes}
          disabled={draftLocked}
          onChange={(event) => {
            if (submission.current || sending.current) return;
            submission.current = undefined;
            setDraft((current) => ({
              ...current,
              notes: event.target.value.slice(0, 500),
              submission: undefined,
            }));
          }}
        />
        <small className="comment-character-count">{draft.notes.length}/500</small>
      </label>
      <TipPicker
        value={draft.tip}
        onChange={changeTip}
        subtotal={subtotal}
        currency={table.currency}
        disabled={draftLocked}
      />
      {!pending && draft.submission && (
        <p role="status">
          {t("Подтверждение заказа ещё не получено. Повторите отправку — заказ не продублируется.")}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
  const cartFooter = table.ordering_enabled && count > 0 && (
    <footer className="venue-table-cart-footer">
      <div className="venue-table-checkout-total">
        <span>{t("Итого")}</span>
        <strong>{tip === null ? "—" : money(total)}</strong>
      </div>
      <SlideToConfirm
        key={JSON.stringify([draft.quantities, draft.tip, draft.notes, total])}
        amount={tip === null ? "—" : money(total)}
        disabled={!draft.submission && (unavailable.length > 0 || tip === null)}
        pending={pending}
        onConfirm={send}
      />
      <small>{t("Оплата в заведении")}</small>
    </footer>
  );
  const cart = (
    <>
      <header>
        <div>
          <h2>{t("Ваш заказ")}</h2>
          <p className="venue-table-cart-table">
            <Utensils size={16} aria-hidden="true" />
            {t("Стол {number}", { number: table.table_identifier })}
          </p>
        </div>
        {cartOpen && (
          <button
            type="button"
            aria-label={t("Закрыть")}
            disabled={pending}
            onClick={() => setCartOpen(false)}
          >
            <X size={24} />
          </button>
        )}
      </header>
      <div className="venue-table-cart-body">
        {order && !count && <TableOrderReceipt order={order} titleRef={receiptTitleRef} />}
        {!table.ordering_enabled ? (
          <p role="status">{t("Заказ сейчас недоступен. Обратитесь к сотруднику заведения.")}</p>
        ) : (
          <>
            {selected.length ? (
              <div className="venue-table-cart-items">
                {selected.map((item) => (
                  <article key={item.id}>
                    <div
                      className="venue-table-cart-image"
                      style={
                        item.image_url
                          ? { backgroundImage: `url(${JSON.stringify(item.image_url)})` }
                          : undefined
                      }
                    >
                      {!item.image_url && <Utensils size={20} />}
                    </div>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {money(
                          (draft.submission?.items.find((line) => line.menu_item_id === item.id)
                            ?.expected_price_minor ?? item.price_minor) * draft.quantities[item.id],
                        )}
                      </small>
                    </div>
                    <div className="venue-preorder-cart-quantity">
                      <button
                        type="button"
                        aria-label={`${t("Убрать")} ${item.name}`}
                        disabled={draftLocked}
                        onClick={() => changeQuantity(item.id, -1)}
                      >
                        <Minus size={16} />
                      </button>
                      <b>{draft.quantities[item.id]}</b>
                      <button
                        type="button"
                        aria-label={`${t("Добавить")} ${item.name}`}
                        disabled={draftLocked || draft.quantities[item.id] >= 30}
                        onClick={() => changeQuantity(item.id, 1)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              !order && (
                <div className="venue-table-cart-empty">
                  <ShoppingBag size={36} />
                  <p>{t("Добавьте блюда из меню")}</p>
                </div>
              )
            )}
            {unavailable.map((id) => (
              <p key={id}>
                {t("Блюдо недоступно")}
                <button
                  type="button"
                  disabled={draftLocked}
                  onClick={() => changeQuantity(id, -30)}
                >
                  {t("Убрать")}
                </button>
              </p>
            ))}
            {!count && error && (
              <p className="form-error" role="alert">
                {t(error)}
              </p>
            )}
          </>
        )}
        {mobile && (
          <>
            {cartOptions}
            {cartFooter}
          </>
        )}
      </div>
      {!mobile && (
        <>
          {cartOptions}
          {cartFooter}
        </>
      )}
    </>
  );
  const historyButton = (
    <button
      type="button"
      className="venue-table-history-trigger"
      aria-label={t("История заказов в заведении")}
      aria-haspopup="dialog"
      onClick={() => {
        setHistoryOrderID(null);
        setRepeatPlan(null);
        setRepeatError("");
        setHistoryOpen(true);
      }}
    >
      <History size={25} aria-hidden="true" />
    </button>
  );
  return (
    <>
      <VenueDetailsScreen
        key={table.venue_id}
        venueID={table.venue_id}
        user={user}
        saved={false}
        onBack={onBack}
        onMenuLoaded={setMenu}
        onVenueLoaded={onVenueLoaded}
        desktopMenuQuery={desktopMenuQuery}
        menuRevision={menuRevision}
        tableOrder={{
          table,
          quantities: draft.quantities,
          onQuantityChange: draftLocked || !table.ordering_enabled ? undefined : changeQuantity,
          onOpenCart: () => setCartOpen(true),
          totalLabel: tip === null ? "—" : money(total),
          count,
          historyButton: mobile ? null : historyButton,
          panel: (
            <aside
              className={`venue-table-order-panel ${order && !count ? "receipt-view" : ""}`}
              aria-label={t("Ваш заказ")}
            >
              {cart}
            </aside>
          ),
        }}
      />
      {mobile && historyButton}
      {historyOpen && (
        <dialog
          ref={historyDialogRef}
          className="venue-table-order-dialog venue-table-history-dialog"
          aria-label={t("История заказов в заведении")}
          onCancel={(event) => {
            event.preventDefault();
            closeHistory();
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            )
              closeHistory();
          }}
        >
          <div
            className={`venue-table-order-panel ${historyOrderID && !repeatPlan ? "receipt-view" : ""}`}
          >
            <header>
              {(historyOrderID || repeatPlan) && (
                <button
                  type="button"
                  aria-label={t("Назад к истории заказов")}
                  onClick={() => {
                    cancelRepeat();
                    setHistoryOrderID(null);
                  }}
                >
                  <ArrowLeft size={23} />
                </button>
              )}
              <div>
                <h2 ref={historyHeadingRef} tabIndex={-1}>
                  {t(repeatPlan ? "Повторить заказ" : "История заказов")}
                </h2>
              </div>
              <button type="button" aria-label={t("Закрыть")} onClick={closeHistory}>
                <X size={24} />
              </button>
            </header>
            <div className="venue-table-cart-body">
              {repeatPlan ? (
                <div className="venue-table-repeat-review">
                  {repeatPlan.lines.map((line) => {
                    const image = historyImages.get(line.id);
                    return (
                      <article key={line.id}>
                        <div
                          className="venue-table-cart-image"
                          role="img"
                          aria-label={line.name}
                          style={
                            image ? { backgroundImage: `url(${JSON.stringify(image)})` } : undefined
                          }
                        >
                          {!image && <Utensils size={20} aria-hidden="true" />}
                        </div>
                        <div className="venue-table-repeat-copy">
                          <strong>{line.name}</strong>
                          <b className="venue-table-repeat-price">
                            {money(line.price * line.quantity, repeatPlan.currency)}
                          </b>
                          {line.changed && (
                            <small>
                              {t("Цена изменилась")}:{" "}
                              {money(line.previousPrice, repeatPlan.order.currency)} →{" "}
                              {money(line.price, repeatPlan.currency)}
                            </small>
                          )}
                        </div>
                        <div className="venue-preorder-cart-quantity">
                          <button
                            type="button"
                            aria-label={`${t("Убрать")} ${line.name}`}
                            onClick={() => changeRepeatQuantity(line.id, -1)}
                          >
                            <Minus size={16} />
                          </button>
                          <b aria-label={`${line.name}: ${line.quantity}`} aria-live="polite">
                            {line.quantity}
                          </b>
                          <button
                            type="button"
                            aria-label={`${t("Добавить")} ${line.name}`}
                            disabled={line.quantity >= 30}
                            onClick={() => changeRepeatQuantity(line.id, 1)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {repeatPlan.unavailable.length > 0 && (
                    <div className="venue-table-repeat-notice" role="status">
                      <strong>{t("Не будут добавлены в корзину")}</strong>
                      {repeatPlan.unavailable.map((line, index) => (
                        <p key={index}>
                          {line.name} —{" "}
                          {t(
                            line.reason === "options"
                              ? "Варианты блюда нужно выбрать заново"
                              : "Блюдо недоступно",
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                  {(repeatPlan.quantityLimited ||
                    repeatPlan.lines.some(
                      (line) => (draft.quantities[line.id] ?? 0) + line.quantity > 30,
                    )) && (
                    <p className="venue-table-repeat-notice">
                      {t("Не больше 30 порций одного блюда. Количество будет уменьшено до 30.")}
                    </p>
                  )}
                  {repeatPlan.order.currency !== repeatPlan.currency && (
                    <p className="venue-table-repeat-notice">
                      {t("Валюта изменилась")}: {repeatPlan.order.currency} → {repeatPlan.currency}
                    </p>
                  )}
                  {!repeatPlan.lines.length && (
                    <div className="venue-table-cart-empty">
                      <Utensils size={32} aria-hidden="true" />
                      <p role="status">{t("Нет блюд для повтора")}</p>
                    </div>
                  )}
                  {Object.keys(repeatedQuantities(repeatPlan, draft.quantities, true)).length >
                    100 && (
                    <p className="venue-table-repeat-notice">
                      {t(
                        "В корзине не может быть больше 100 разных блюд. Замените корзину или уберите лишние позиции.",
                      )}
                    </p>
                  )}
                </div>
              ) : historyOrderID ? (
                historyOrders
                  .filter((entry) => entry.id === historyOrderID)
                  .map((entry) => <TableOrderReceipt key={entry.id} order={entry} />)
              ) : (
                <>
                  {historyError && (
                    <p className="form-error" role="alert">
                      {t("Не удалось обновить историю заказов")}{" "}
                      <button
                        type="button"
                        disabled={historyLoading}
                        onClick={() => setHistoryRevision((value) => value + 1)}
                      >
                        {t("Повторить")}
                      </button>
                    </p>
                  )}
                  {historyOrders.length ? (
                    <ul className="venue-table-history-list">
                      {historyOrders.map((entry) => (
                        <li key={entry.id}>
                          <button type="button" onClick={() => setHistoryOrderID(entry.id)}>
                            <span className="venue-table-history-copy">
                              <strong>
                                {t("Заказ")} №{entry.number}
                              </strong>
                              <time dateTime={entry.created_at}>
                                {new Intl.DateTimeFormat(localeTags[locale], {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }).format(new Date(entry.created_at))}
                              </time>
                            </span>
                            <span className="venue-table-history-amount">
                              <b>{money(entry.total_minor, entry.currency)}</b>
                              <span className={`venue-table-history-status ${entry.status}`}>
                                {t(statusLabels[entry.status] ?? "Заказ отправлен")}
                              </span>
                            </span>
                            {entry.items.length > 0 && (
                              <span className="venue-table-history-images" aria-hidden="true">
                                {entry.items.slice(0, 4).map((item, index) => {
                                  const image = item.menu_item_id
                                    ? historyImages.get(item.menu_item_id)
                                    : undefined;
                                  return (
                                    <span
                                      key={index}
                                      className="venue-table-history-image"
                                      title={item.name}
                                      style={
                                        image
                                          ? { backgroundImage: `url(${JSON.stringify(image)})` }
                                          : undefined
                                      }
                                    >
                                      {!image && <Utensils size={17} />}
                                    </span>
                                  );
                                })}
                                {entry.items.length > 4 && (
                                  <span className="venue-table-history-image venue-table-history-extra">
                                    +{entry.items.length - 4}
                                  </span>
                                )}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="venue-table-cart-empty">
                      <History size={36} aria-hidden="true" />
                      <p role="status">
                        {t(historyLoading ? "Загружаем заказы..." : "Вы ещё не отправили заказ")}
                      </p>
                    </div>
                  )}
                  {historyCursor && (
                    <button
                      type="button"
                      className="button secondary venue-table-history-more"
                      disabled={historyLoading}
                      onClick={() => void loadMoreHistory()}
                    >
                      {t(historyLoading ? "Загружаем заказы..." : "Показать ещё")}
                    </button>
                  )}
                </>
              )}
              {repeatError && (
                <p className="form-error" role="alert">
                  {t(repeatError)}
                </p>
              )}
            </div>
            {(repeatPlan || historyOrderID) && (
              <footer className="venue-table-repeat-footer">
                {repeatPlan ? (
                  <>
                    <div className="venue-table-checkout-total">
                      <span>{t("Итого")}</span>
                      <strong>
                        {money(
                          repeatPlan.lines.reduce(
                            (sum, line) => sum + line.price * line.quantity,
                            0,
                          ),
                          repeatPlan.currency,
                        )}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="button primary"
                      aria-label={t(count > 0 ? "Объединить с корзиной" : "В корзину")}
                      disabled={
                        !repeatPlan.lines.length ||
                        (count > 0 &&
                          Object.keys(repeatedQuantities(repeatPlan, draft.quantities, true))
                            .length > 100)
                      }
                      onClick={() => applyRepeat(count > 0)}
                    >
                      {t(count > 0 ? "Объединить с корзиной" : "В корзину")}
                      {count === 0 && (
                        <>
                          {" "}
                          ·{" "}
                          {money(
                            repeatPlan.lines.reduce(
                              (sum, line) => sum + line.price * line.quantity,
                              0,
                            ),
                            repeatPlan.currency,
                          )}
                        </>
                      )}
                    </button>
                    {count > 0 && (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={!repeatPlan.lines.length}
                        onClick={() => applyRepeat(false)}
                      >
                        {t("Заменить корзину")} ·{" "}
                        {money(
                          repeatPlan.lines.reduce(
                            (sum, line) => sum + line.price * line.quantity,
                            0,
                          ),
                          repeatPlan.currency,
                        )}
                      </button>
                    )}
                    <small>{t("Отправка заказа — на следующем шаге")}</small>
                  </>
                ) : (
                  <button
                    type="button"
                    className="button primary"
                    disabled={draftLocked || repeatLoading || !table.ordering_enabled}
                    aria-busy={repeatLoading}
                    onClick={async () => {
                      const entry = historyOrders.find((item) => item.id === historyOrderID);
                      if (entry) await prepareRepeat(entry);
                    }}
                  >
                    {t(repeatLoading ? "Проверяем меню..." : "Повторить заказ")}
                  </button>
                )}
              </footer>
            )}
          </div>
        </dialog>
      )}

      {cartOpen && (
        <dialog
          ref={dialogRef}
          className={`venue-table-order-dialog venue-table-cart-dialog ${count > 0 ? "has-items" : ""}`}
          aria-label={t("Ваш заказ")}
          onCancel={(event) => {
            event.preventDefault();
            if (!sending.current) setCartOpen(false);
          }}
        >
          <div className={`venue-table-order-panel ${order && !count ? "receipt-view" : ""}`}>
            {cart}
          </div>
        </dialog>
      )}
    </>
  );
}
