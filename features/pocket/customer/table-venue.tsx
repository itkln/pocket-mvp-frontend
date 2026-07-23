"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, History, X } from "lucide-react";
import { APIError } from "../../../lib/api-client";
import { createReservationKey } from "../../../lib/reservation-key";
import {
  getPublicVenueMenu,
  type PublicMenuCategory,
  type PublicVenue,
} from "../../../lib/public-catalog-api";
import {
  planRepeatedOrder,
  repeatedQuantities,
  type RepeatPlan,
} from "../../../lib/table-order-history";
import {
  createTableOrder,
  lookupTableOrder,
  resolveTableQR,
  type TableContext,
  type TableOrder,
} from "../../../lib/table-orders-api";
import { useI18n } from "../i18n";
import type { AuthUser } from "../../../lib/auth-api";
import { VenueDetailsScreen } from "./venue-details";
import { emptyDraft, loadDraft, savedOrderKeys } from "./table/table-draft";
import { TableOrderReceipt } from "./table/table-order-receipt";
import { useTableOrderHistory } from "./table/use-table-order-history";
import { TableCart } from "./table/table-cart";
import { TableHistoryList } from "./table/table-history-list";
import { RepeatReview } from "./table/repeat-review";

import { tipAmount, tipSelection, type TipDraft } from "../../../lib/gratuity";

const mobileQuery = "(max-width: 760px)";
const subscribeMobile = (onChange: () => void) => {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const mobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const serverSnapshot = () => false;
export function TableVenueScreen({
  token,
  onBack,
  notify,
  onVenueLoaded,
  desktopMenuQuery,
  onOpenSettings,
  user = null,
}: {
  user?: AuthUser | null;
  token: string;
  onBack: () => void;
  notify?: (message: string) => void;
  onVenueLoaded?: (venue: PublicVenue) => void;
  desktopMenuQuery?: string;
  onOpenSettings?: (page: "menu" | "language") => void;
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyOrderID, setHistoryOrderID] = useState<string | null>(null);
  const [repeatPlan, setRepeatPlan] = useState<RepeatPlan | null>(null);
  const repeatOpen = Boolean(repeatPlan);
  const [repeatLoading, setRepeatLoading] = useState(false);
  const [repeatError, setRepeatError] = useState("");
  const repeatController = useRef<AbortController | null>(null);
  // Orders of another history scope (other session, signed out) must not stay on screen.
  const history = useTableOrderHistory(table?.venue_id, historyOpen, () => {
    setOrder(null);
    setHistoryOrderID(null);
    setRepeatPlan(null);
    repeatController.current?.abort();
    setRepeatLoading(false);
  });
  const { orders: historyOrders, rememberOrder } = history;
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
  useEffect(() => () => repeatController.current?.abort(), []);
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
    history.revision,
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
      history.refresh();
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
  const historyButton = (
    <button
      type="button"
      className={mobile ? "venue-table-history-trigger" : "venue-table-history-inline"}
      aria-label={t("История заказов в заведении")}
      aria-haspopup="dialog"
      onClick={() => {
        setHistoryOrderID(null);
        setRepeatPlan(null);
        setRepeatError("");
        setHistoryOpen(true);
      }}
    >
      <History size={mobile ? 25 : 18} aria-hidden="true" />
      {!mobile && <span>{t("История")}</span>}
    </button>
  );
  const cart = (
    <TableCart
      table={table}
      headerAction={!mobile ? historyButton : undefined}
      order={order}
      draft={draft}
      selected={selected}
      unavailable={unavailable}
      count={count}
      subtotal={subtotal}
      tip={tip}
      total={total}
      error={error}
      pending={pending}
      draftLocked={draftLocked}
      mobile={mobile}
      cartOpen={cartOpen}
      receiptTitleRef={receiptTitleRef}
      money={money}
      onClose={() => setCartOpen(false)}
      onQuantityChange={changeQuantity}
      onNotesChange={(notes) => {
        if (submission.current || sending.current) return;
        submission.current = undefined;
        setDraft((current) => ({ ...current, notes, submission: undefined }));
      }}
      onTipChange={changeTip}
      onSend={send}
    />
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
        onOpenSettings={onOpenSettings}
        desktopMenuQuery={desktopMenuQuery}
        menuRevision={menuRevision}
        tableOrder={{
          table,
          quantities: draft.quantities,
          onQuantityChange: draftLocked || !table.ordering_enabled ? undefined : changeQuantity,
          onOpenCart: () => setCartOpen(true),
          totalLabel: tip === null ? "—" : money(total),
          count,
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
                <RepeatReview
                  repeatPlan={repeatPlan}
                  images={historyImages}
                  cartQuantities={draft.quantities}
                  money={money}
                  onQuantityChange={changeRepeatQuantity}
                />
              ) : historyOrderID ? (
                historyOrders
                  .filter((entry) => entry.id === historyOrderID)
                  .map((entry) => <TableOrderReceipt key={entry.id} order={entry} />)
              ) : (
                <TableHistoryList
                  orders={historyOrders}
                  images={historyImages}
                  loading={history.loading}
                  error={history.error}
                  cursor={history.cursor}
                  money={money}
                  onRetry={history.refresh}
                  onOpen={setHistoryOrderID}
                  onLoadMore={() => void history.loadMore()}
                />
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
