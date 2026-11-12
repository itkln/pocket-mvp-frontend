"use client";

import { useState } from "react";
import { Banknote, CreditCard, Smartphone, Split, Wallet } from "lucide-react";
import { useI18n } from "../i18n";

// How a guest picks a payment method for the table bill. Only cash is wired: «Оплатить» calls the
// staff to settle (V-TBL-05). Apple Pay, Google Pay, the card and «Разделить оплату» are a design
// mock-up and do nothing yet: online payment is V-TBL-06, splitting the bill V-TBL-08.
export const tablePaymentMethods = [
  { id: "apple_pay", label: "Apple Pay", icon: Smartphone },
  { id: "google_pay", label: "Google Pay", icon: Wallet },
  { id: "card", label: "Банковская карта", icon: CreditCard },
  { id: "cash", label: "Оплата наличными", icon: Banknote },
] as const;
export type TablePaymentMethod = (typeof tablePaymentMethods)[number]["id"];

export function TablePaymentMethods({
  amount,
  onPayCash,
  calling = false,
}: {
  amount: string;
  onPayCash: () => void;
  calling?: boolean;
}) {
  const { t } = useI18n();
  const [method, setMethod] = useState<TablePaymentMethod | "">("");
  const pay = () => {
    if (method === "cash") onPayCash();
  };
  return (
    <div className="dish-table-payment">
      <fieldset className="dish-table-methods">
        <legend>{t("Способ оплаты")}</legend>
        {tablePaymentMethods.map(({ id, label, icon: Icon }) => (
          <label key={id} className={method === id ? "selected" : ""}>
            <input
              type="radio"
              name="table-payment-method"
              value={id}
              checked={method === id}
              onChange={() => setMethod(id)}
            />
            <span className="dish-table-method-icon">
              <Icon size={20} aria-hidden="true" />
            </span>
            <strong>{t(label)}</strong>
            <span className="dish-table-method-radio" aria-hidden="true" />
          </label>
        ))}
      </fieldset>
      <div className="dish-table-payment-actions">
        <button type="button" className="dish-table-action secondary">
          <Split size={20} aria-hidden="true" />
          <strong>{t("Разделить оплату")}</strong>
        </button>
        <button
          type="button"
          className="dish-table-action primary"
          disabled={!method || calling}
          aria-busy={calling}
          onClick={pay}
        >
          <strong>{t(calling ? "Вызываем сотрудника..." : "Оплатить {amount}", { amount })}</strong>
        </button>
      </div>
      {method === "cash" && (
        <p className="dish-table-bill-note">
          {t("Сотрудник подойдёт к столу и примет оплату наличными.")}
        </p>
      )}
    </div>
  );
}
