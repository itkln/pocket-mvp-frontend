"use client";

import { useState } from "react";
import { CreditCard, Download } from "lucide-react";
import { type OwnerPayment } from "../../../lib/owner-api";
import { localeTags, useI18n } from "../i18n";
import { CountUp, Button, EmptyIllustration, PageHeader, StatCard, StatusPill, money } from "../ui";
import { useOwnerWorkspace } from "./context";

type PaymentGroup = "all" | "paid" | "pending" | "refunded" | "failed";

// Provider statuses grouped the way an owner reads them.
const groupOf = (payment: OwnerPayment): Exclude<PaymentGroup, "all"> => {
  if (payment.status === "paid") return "paid";
  if (payment.status === "refunded") return "refunded";
  if (payment.status === "failed" || payment.status === "cancelled") return "failed";
  return "pending";
};

const groupLabels: Record<Exclude<PaymentGroup, "all">, string> = {
  paid: "Успешно",
  pending: "В обработке",
  refunded: "Возврат",
  failed: "Ошибка",
};

const filters: Array<{ id: PaymentGroup; label: string }> = [
  { id: "all", label: "Все" },
  { id: "paid", label: "Успешные" },
  { id: "pending", label: "В обработке" },
  { id: "refunded", label: "Возвраты" },
];

const sum = (payments: OwnerPayment[], amount: (payment: OwnerPayment) => number) =>
  payments.reduce((total, payment) => total + amount(payment), 0);

export function PaymentsScreen({ venueName }: { venueName: string }) {
  const { locale, t } = useI18n();
  const { payments } = useOwnerWorkspace();
  const [filter, setFilter] = useState<PaymentGroup>("all");
  const byGroup = (group: PaymentGroup) =>
    group === "all" ? payments : payments.filter((payment) => groupOf(payment) === group);
  const paid = byGroup("paid");
  const pending = byGroup("pending");
  const refunded = payments.filter((payment) => payment.refunded_minor > 0);
  const currency = payments[0]?.currency ?? "EUR";
  const inCurrency = (value: number) => money(value, currency);
  const visible = byGroup(filter);

  const exportCSV = () => {
    const rows = [
      ["id", "provider", "status", "amount", "refunded", "currency", "created_at"],
      ...payments.map((payment) => [
        payment.id,
        payment.provider,
        payment.status,
        String(payment.amount_minor),
        String(payment.refunded_minor),
        payment.currency,
        payment.created_at,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "pocket-payments.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="owner-payments">
      <PageHeader
        title={t("Платежи")}
        subtitle={venueName}
        actions={
          <Button kind="secondary" icon={Download} disabled={!payments.length} onClick={exportCSV}>
            {t("Скачать CSV")}
          </Button>
        }
      />
      <section className="vendor-stat-grid overview-stats">
        <StatCard
          title={t("Получено")}
          value={
            <CountUp
              value={sum(paid, (p) => p.amount_minor - p.refunded_minor) / 100}
              format={inCurrency}
            />
          }
          caption={t("Успешных платежей: {count}", { count: paid.length })}
          onClick={() => setFilter("paid")}
          active={filter === "paid"}
        />
        <StatCard
          title={t("В обработке")}
          value={<CountUp value={sum(pending, (p) => p.amount_minor) / 100} format={inCurrency} />}
          caption={t("Платежей: {count}", { count: pending.length })}
          onClick={() => setFilter("pending")}
          active={filter === "pending"}
          tone={pending.length ? "warning" : undefined}
        />
        <StatCard
          title={t("Возвраты")}
          value={
            <CountUp value={sum(refunded, (p) => p.refunded_minor) / 100} format={inCurrency} />
          }
          caption={t("Платежей: {count}", { count: refunded.length })}
          onClick={() => setFilter("refunded")}
          active={filter === "refunded"}
        />
        <StatCard
          title={t("Средний платеж")}
          value={
            <CountUp
              value={paid.length ? sum(paid, (p) => p.amount_minor) / paid.length / 100 : 0}
              format={inCurrency}
            />
          }
          caption={t("По успешным платежам")}
        />
      </section>
      <section className="vendor-block payments-block">
        <header>
          <div>
            <h2>{t("Транзакции")}</h2>
            <p>{t("Данные платежного провайдера")}</p>
          </div>
          <div className="vendor-segmented" role="tablist" aria-label={t("Статус платежа")}>
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={filter === item.id ? "active" : ""}
                onClick={() => setFilter(item.id)}
              >
                {t(item.label)}
                <span>{byGroup(item.id).length}</span>
              </button>
            ))}
          </div>
        </header>
        {visible.length ? (
          <table className="vendor-table stack payments-table">
            <thead>
              <tr>
                <th>{t("Платеж")}</th>
                <th>{t("Дата")}</th>
                <th>{t("Статус")}</th>
                <th className="numeric">{t("Сумма")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((payment) => {
                const created = new Date(payment.paid_at ?? payment.created_at);
                return (
                  <tr key={payment.id}>
                    <td>
                      <div className="payment-cell">
                        <span className="payment-icon">
                          <CreditCard size={18} />
                        </span>
                        <span>
                          <span className="cell-main">
                            {t("Платеж")} ···{payment.id.replaceAll("-", "").slice(-6)}
                          </span>
                          <span className="cell-sub">
                            {providerName(payment.provider)} · {payment.currency}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="cell-main payment-date">
                        {created.toLocaleDateString(localeTags[locale], {
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                      <span className="cell-sub">
                        {created.toLocaleTimeString(localeTags[locale], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td>
                      <StatusPill status={groupLabels[groupOf(payment)]} />
                    </td>
                    <td className="numeric">
                      <span className="cell-main">
                        {money(payment.amount_minor / 100, payment.currency)}
                      </span>
                      {payment.refunded_minor > 0 && (
                        <span className="cell-sub">
                          {t("Возврат")} {money(payment.refunded_minor / 100, payment.currency)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyIllustration
            icon={CreditCard}
            title={payments.length ? t("Нет платежей с таким статусом") : t("Транзакций пока нет")}
            text={
              payments.length
                ? t("Выберите другой фильтр.")
                : t("Платежи появятся после подключения провайдера и первого онлайн-заказа.")
            }
          />
        )}
      </section>
    </div>
  );
}

function providerName(provider: string) {
  return provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "—";
}
