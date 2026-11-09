import type { PublicMenuCategory } from "./public-catalog-api";
import type { TableOrder } from "./table-orders-api";

// Old QR carts contain random receipt capabilities. The server resolves their
// venue and owner; QR URLs are never sent to the history endpoint.
export function legacyTableOrderKeys(): string[] {
  const keys = new Set<string>();
  try {
    for (let index = 0; index < sessionStorage.length; index++) {
      const storageKey = sessionStorage.key(index);
      if (!storageKey?.startsWith("pocket:table-cart:")) continue;
      try {
        const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
        const candidates = [...(Array.isArray(value?.orderKeys) ? value.orderKeys : []), value?.lastKey, value?.submission?.idempotency_key];
        candidates.forEach((key) => { if (typeof key === "string" && key.length >= 16 && key.length <= 128 && key.trim() === key) keys.add(key); });
      } catch { /* A damaged legacy cart must not block another cart's migration. */ }
    }
  } catch { /* History still works via its HttpOnly device cookie. */ }
  return [...keys];
}

export type RepeatLine = { id: string; name: string; quantity: number; price: number; previousPrice: number; changed: boolean };
export type RepeatPlan = { order: TableOrder; lines: RepeatLine[]; unavailable: { name: string; reason: "unavailable" | "options" }[]; currency: string; quantityLimited: boolean };

export function planRepeatedOrder(order: TableOrder, categories: PublicMenuCategory[], currency: string): RepeatPlan {
  const items = categories.flatMap((category) => category.items);
  const plan: RepeatPlan = { order, lines: [], unavailable: [], currency, quantityLimited: false };
  for (const old of order.items) {
    const item = items.find((candidate) => candidate.id === old.menu_item_id);
    if (old.modifiers && (!Array.isArray(old.modifiers) || old.modifiers.length)) {
      plan.unavailable.push({ name: old.name, reason: "options" });
    } else if (!item || item.currency !== currency) {
      plan.unavailable.push({ name: old.name, reason: "unavailable" });
    } else {
      const existing = plan.lines.find((line) => line.id === item.id);
      const requested = old.quantity + (existing?.quantity ?? 0);
      const quantity = Math.min(30, requested);
      if (requested > 30) plan.quantityLimited = true;
      if (existing) existing.quantity = quantity;
      else plan.lines.push({ id: item.id, name: item.name, quantity, price: item.price_minor, previousPrice: old.unit_price_minor, changed: item.price_minor !== old.unit_price_minor || item.currency !== order.currency });
    }
  }
  return plan;
}

export function repeatedQuantities(plan: RepeatPlan, current: Record<string, number>, merge: boolean) {
  const quantities: Record<string, number> = merge ? { ...current } : {};
  plan.lines.forEach((line) => { quantities[line.id] = Math.min(30, line.quantity + (quantities[line.id] ?? 0)); });
  return quantities;
}
