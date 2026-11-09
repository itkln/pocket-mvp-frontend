import { restoredTip, type TipDraft } from "../../../../lib/gratuity";
import type { TableOrderInput } from "../../../../lib/table-orders-api";

// The table cart survives reloads in sessionStorage, including an unconfirmed submission,
// so a retry reuses the same idempotency key and never duplicates the order.
export type Draft = {
  tip: TipDraft;
  quantities: Record<string, number>;
  notes: string;
  lastKey?: string;
  orderKeys?: string[];
  submission?: TableOrderInput;
};

export const emptyDraft = (): Draft => ({ quantities: {}, notes: "", tip: { mode: "none" } });
export function loadDraft(token: string): Draft {
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

// Keys of every order sent from this cart, used to look the orders up again.
export const savedOrderKeys = (draft: Draft, key: string) => [
  ...new Set([...(draft.orderKeys ?? []), ...(draft.lastKey ? [draft.lastKey] : []), key]),
];
