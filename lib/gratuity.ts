export type TipSelection = { mode: "none" } | { mode: "percent"; percent: number } | { mode: "custom"; amount_minor: number };
export type TipDraft = Exclude<TipSelection, { mode: "custom" }> | { mode: "custom"; value: string };
export const maxOrderTotal = 2_000_000_000;

export function tipSelection(draft: TipDraft): TipSelection | null {
  if (draft.mode !== "custom") return draft;
  const value = draft.value.trim();
  if (!/^\d+(?:[.,]\d{0,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(/[.,]/);
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount <= maxOrderTotal ? { mode: "custom", amount_minor: amount } : null;
}

export function tipAmount(subtotal: number, selection: TipSelection | null): number | null {
  if (!selection || !Number.isSafeInteger(subtotal) || subtotal < 0 || subtotal > maxOrderTotal) return null;
  if (selection.mode === "percent" && (!Number.isInteger(selection.percent) || selection.percent < 0 || selection.percent > 100)) return null;
  const amount = selection.mode === "none" ? 0 : selection.mode === "custom" ? selection.amount_minor : Math.floor((subtotal * selection.percent + 50) / 100);
  return Number.isSafeInteger(amount) && amount >= 0 && subtotal + amount <= maxOrderTotal && (subtotal > 0 || amount === 0) ? amount : null;
}

export function restoredTip(value: unknown): TipDraft {
  if (typeof value !== "object" || !value) return { mode: "none" };
  const saved = value as Record<string, unknown>;
  if (saved.mode === "percent" && typeof saved.percent === "number" && [5, 10, 15].includes(saved.percent)) return { mode: "percent", percent: saved.percent };
  if (saved.mode === "custom" && typeof saved.value === "string") return { mode: "custom", value: saved.value.slice(0, 32) };
  return { mode: "none" };
}
