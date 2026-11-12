"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, Banknote, CreditCard, HandCoins, RefreshCw, X } from "lucide-react";
import { APIError } from "../../../lib/api-client";
import {
  listOpenBills,
  settleBill,
  type BillSettlement,
  type OpenTableBill,
  type PaymentMethod,
} from "../../../lib/owner-api";
import { useI18n, localeTags } from "../i18n";
import { Button, IconButton, money } from "../ui";

const refreshEvery = 10_000;

// Two short descending tones: a table asks for the bill (orders use rising tones).
function useBillCallSound() {
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (typeof AudioContext === "undefined") return;
    const context = new AudioContext();
    audio.current = context;
    const unlock = () => {
      if (context.state === "suspended") void context.resume().catch(() => {});
    };
    document.addEventListener("click", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return () => {
      document.removeEventListener("click", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      audio.current = null;
      void context.close().catch(() => {});
    };
  }, []);
  return useCallback(() => {
    const context = audio.current;
    if (context?.state !== "running") return;
    for (const [i, frequency] of [988, 659].entries()) {
      const start = context.currentTime + i * 0.24;
      const tone = context.createOscillator();
      const gain = context.createGain();
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.24, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      tone.connect(gain).connect(context.destination);
      tone.start(start);
      tone.stop(start + 0.22);
    }
  }, []);
}

// The tables waiting for the bill, refreshed while the screen is visible. A new call rings and
// shows a notice until the staff opens it. Any open bill can be settled from here.
export function TableBillRequests({ venueID }: { venueID: string }) {
  const { t, locale } = useI18n();
  const [bills, setBills] = useState<OpenTableBill[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [openID, setOpenID] = useState("");
  const [settled, setSettled] = useState<BillSettlement | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const known = useRef<Set<string> | null>(null);
  const ring = useBillCallSound();
  const reload = useRef<() => Promise<OpenTableBill[] | undefined>>(async () => undefined);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const next = await listOpenBills(venueID);
        if (!active) return;
        const called = next.filter((bill) => bill.payment_requested_at).map((bill) => bill.id);
        const previous = known.current;
        const added = previous ? called.filter((id) => !previous.has(id)) : [];
        known.current = new Set(called);
        if (added.length) {
          setFresh((current) => [...new Set([...current, ...added])]);
          ring();
        }
        setFresh((current) => current.filter((id) => called.includes(id)));
        setBills(next);
        setFailed(false);
        return next;
      } catch {
        if (active) setFailed(true);
      }
    };
    reload.current = load;
    void load();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = window.setInterval(refresh, refreshEvery);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [venueID, ring]);

  const time = (value: string) =>
    new Date(value).toLocaleTimeString(localeTags[locale], { hour: "2-digit", minute: "2-digit" });
  const called = bills?.filter((bill) => bill.payment_requested_at) ?? [];
  const others = bills?.filter((bill) => !bill.payment_requested_at) ?? [];
  const listed = showAll ? [...called, ...others] : called;
  const open = bills?.find((bill) => bill.id === openID);
  // Nothing is shown until the first list arrives, and while no table has an open bill.
  if (!bills?.length && !settled) return null;

  return (
    <section
      className={`table-bill-requests ${called.length ? "has-calls" : ""}`}
      aria-label={t("Ожидают расчёта")}
    >
      {fresh.length > 0 && (
        <p className="table-bill-alert" role="alert">
          <BellRing size={20} aria-hidden="true" />
          {t("Стол {number} просит рассчитать", {
            number:
              bills?.find((bill) => bill.id === fresh[fresh.length - 1])?.table_identifier ?? "",
          })}
        </p>
      )}
      {settled && (
        <p className="table-bill-done" role="status">
          {t(
            settled.status === "void"
              ? "Стол {number}: счёт закрыт без оплаты"
              : "Стол {number}: оплата {amount} подтверждена",
            {
              number: settled.table_identifier,
              amount: money(settled.amount_minor / 100, settled.currency),
            },
          )}
          <IconButton icon={X} label={t("Закрыть")} onClick={() => setSettled(null)} />
        </p>
      )}
      <header>
        <h2>
          <HandCoins size={20} aria-hidden="true" />
          {t("Ожидают расчёта")}
          <b className="table-bill-count">{called.length}</b>
        </h2>
        {others.length > 0 && (
          <button type="button" className="table-bill-toggle" onClick={() => setShowAll((v) => !v)}>
            {t(showAll ? "Только вызовы" : "Все открытые счета ({count})", {
              count: bills?.length ?? 0,
            })}
          </button>
        )}
      </header>
      {failed && bills && (
        <p className="table-bill-error" role="alert">
          {t("Не удалось обновить счета столов. Повторим автоматически.")}
        </p>
      )}
      {listed.length === 0 ? (
        <p className="table-bill-empty">{t("Сейчас никто не просит счёт.")}</p>
      ) : (
        <ul>
          {listed.map((bill) => (
            <li key={bill.id} className={bill.payment_requested_at ? "called" : ""}>
              <button
                type="button"
                onClick={() => {
                  setOpenID(bill.id);
                  setFresh((current) => current.filter((id) => id !== bill.id));
                }}
              >
                <strong>{t("Стол {number}", { number: bill.table_identifier })}</strong>
                <small>
                  {bill.payment_requested_at
                    ? t("Вызов в {time}", { time: time(bill.payment_requested_at) })
                    : t("Счёт открыт в {time}", { time: time(bill.opened_at) })}
                </small>
                <span>{money(bill.total_minor / 100, bill.currency)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <SettleBillDialog
          key={open.id}
          venueID={venueID}
          bill={open}
          reload={() => reload.current()}
          onClose={() => setOpenID("")}
          onSettled={(result) => {
            setOpenID("");
            setSettled(result);
            void reload.current();
          }}
        />
      )}
    </section>
  );
}

// Confirms that the guests paid the whole bill. The staff checks the dishes and amount with the
// guests; if the bill changes meanwhile, the server refuses and the new amount must be checked.
function SettleBillDialog({
  venueID,
  bill,
  reload,
  onClose,
  onSettled,
}: {
  venueID: string;
  bill: OpenTableBill;
  reload: () => Promise<OpenTableBill[] | undefined>;
  onClose: () => void;
  onSettled: (settlement: BillSettlement) => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  // The amount the staff member is looking at; a refreshed bill with another total must be
  // checked again before it can be confirmed.
  const [checkedTotal, setCheckedTotal] = useState(bill.total_minor);
  const changed = bill.total_minor !== checkedTotal;
  useEffect(() => {
    const el = dialog.current;
    el?.showModal?.();
    return () => el?.close?.();
  }, []);
  const amount = (minor: number) => money(minor / 100, bill.currency);
  const confirm = async () => {
    if (!method || busy || changed) return;
    setBusy(true);
    setProblem("");
    try {
      onSettled(await settleBill(venueID, bill.id, { expected_total_minor: checkedTotal, method }));
    } catch (error) {
      const code = error instanceof APIError ? error.code : "";
      if (code === "bill_changed") {
        await reload();
        setProblem("Счёт изменился, пока вы его проверяли. Сверьте новую сумму с гостями.");
      } else if (code === "bill_closed" || code === "not_found") {
        await reload();
        setProblem("Этот счёт уже закрыт.");
      } else if (code === "bill_payment_in_progress") {
        setProblem("По этому счёту идёт онлайн-оплата. Дождитесь её результата.");
      } else {
        setProblem("Оплата не подтверждена. Проверьте подключение и повторите.");
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="order-cancellation-dialog settle-bill-dialog"
      aria-labelledby="settle-bill-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void confirm();
        }}
      >
        <header>
          <h2 id="settle-bill-title">
            {t("Расчёт · стол {number}", { number: bill.table_identifier })}
          </h2>
          <IconButton icon={X} label={t("Закрыть")} onClick={() => !busy && onClose()} />
        </header>
        <ul className="settle-bill-items">
          {bill.items.map((item, index) => (
            <li key={`${item.order_id}-${index}`}>
              <span>
                {item.quantity} × {item.name}
                <small>{t("Заказ №{number}", { number: item.order_number })}</small>
              </span>
              <strong>{amount(item.total_minor)}</strong>
            </li>
          ))}
        </ul>
        <dl className="settle-bill-totals">
          {bill.tip_minor > 0 && (
            <div>
              <dt>{t("Чаевые")}</dt>
              <dd>{amount(bill.tip_minor)}</dd>
            </div>
          )}
          <div className="total">
            <dt>{t("К оплате")}</dt>
            <dd>{amount(bill.total_minor)}</dd>
          </div>
        </dl>
        {changed && (
          <div className="settle-bill-changed" role="alert">
            <p>
              {t("Сумма изменилась: было {old}, стало {new}. Сверьте счёт с гостями ещё раз.", {
                old: amount(checkedTotal),
                new: amount(bill.total_minor),
              })}
            </p>
            <Button
              kind="secondary"
              icon={RefreshCw}
              onClick={() => setCheckedTotal(bill.total_minor)}
            >
              {t("Сумма сверена")}
            </Button>
          </div>
        )}
        <fieldset className="settle-bill-methods" disabled={busy}>
          <legend>{t("Способ оплаты")}</legend>
          {(
            [
              ["cash", "Наличные", Banknote],
              ["card", "Карта", CreditCard],
            ] as const
          ).map(([value, label, Icon]) => (
            <label key={value} className={method === value ? "selected" : ""}>
              <input
                type="radio"
                name="method"
                value={value}
                checked={method === value}
                onChange={() => setMethod(value)}
              />
              <Icon size={20} aria-hidden="true" />
              {t(label)}
            </label>
          ))}
        </fieldset>
        <p className="settle-bill-note">
          {t(
            "Подтверждайте только после того, как гости фактически оплатили. Визит закроется, а следующий заказ откроет новый счёт.",
          )}
        </p>
        {problem && !changed && <p role="alert">{t(problem)}</p>}
        <footer>
          <Button kind="quiet" disabled={busy} onClick={onClose}>
            {t("Отмена")}
          </Button>
          <Button type="submit" disabled={busy || !method || changed}>
            {busy
              ? t("Сохранение...")
              : t("Оплата {amount} получена", { amount: amount(bill.total_minor) })}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}
