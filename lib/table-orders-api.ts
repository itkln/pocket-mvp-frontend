import type { TipSelection } from "./gratuity";
import { apiRequest } from "./api-client";
export type TableContext = { venue_name?: string; venue_id: string; table_id: string; table_identifier: string; version: number; currency: string; ordering_enabled: boolean };
export type TableQRCode = TableContext & { url: string };
export type TableOrder = { venue_id?: string; table_qr_version?: number; id: string; number: number; status: string; table_identifier: string; total_minor: number; subtotal_minor?: number; tip_minor?: number; currency: string; notes: string; created_at: string; items: { menu_item_id?: string; modifiers?: unknown[]; name: string; quantity: number; unit_price_minor: number }[] };
export type TableOrderInput = { tip?: TipSelection; expected_total_minor?: number; token: string; idempotency_key: string; notes: string; items: { menu_item_id: string; quantity: number; expected_price_minor: number }[] };
const post = <T>(path: string, body: unknown, signal?: AbortSignal) => apiRequest<T>(path, { method: "POST", body: JSON.stringify(body), signal, cache: "no-store" });
export const resolveTableQR = async (token: string, signal?: AbortSignal) => (await post<{ table: TableContext }>("/public/table-qr/resolve", { token }, signal)).table;
export type TableBill = {
  id: string; venue_id: string; table_id: string; status: "open" | "payment_pending"; currency: string; opened_at: string;
  subtotal_minor: number; tip_minor: number; tax_minor: number; service_fee_minor: number; total_minor: number;
  items: { order_id: string; order_number: number; name: string; quantity: number; unit_price_minor: number; total_minor: number }[];
};
export const getTableBill = async (token: string, signal?: AbortSignal) => (await post<{ bill: TableBill | null }>("/public/table-bill", { token }, signal)).bill;
export const issueTableQR = async (venueID: string, identifier: string, rotate = false) => (await post<{ qr: TableQRCode }>(`/owner/venues/${encodeURIComponent(venueID)}/table-qr`, { table_identifier: identifier, rotate })).qr;
export const createTableOrder = async (input: TableOrderInput) => (await post<{ order: TableOrder }>("/public/table-orders", input)).order;
export const lookupTableOrder = async (token: string, key: string, signal?: AbortSignal) => (await post<{ order: TableOrder }>("/public/table-orders/lookup", { token, idempotency_key: key }, signal)).order;

export type VenueOrderHistory = { orders: TableOrder[]; next_cursor?: string; scope_key: string; scope: "account" | "device" };
export const getVenueOrderHistory = (venueID: string, options: { legacyKeys?: string[]; cursor?: string; signal?: AbortSignal } = {}) => post<VenueOrderHistory>("/public/table-orders/history", { venue_id: venueID, legacy_keys: options.legacyKeys ?? [], cursor: options.cursor ?? "" }, options.signal);
