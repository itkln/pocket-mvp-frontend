import { apiRequest } from "./api-client";

export type OrderItem = { menu_item_id?: string; name: string; quantity: number; unit_price_minor: number; total_minor: number };
export type OrderQuote = { currency: string; total_minor: number; items: OrderItem[] };
export type CustomerOrder = {
  id: string; number: number; channel: string; status: string; guest_name: string;
  total_minor: number; currency: string; notes?: string; created_at: string;
  venue_name?: string; reservation_code?: string; reservation_starts_at?: string; items: OrderItem[];
};
export type OrderInput = {
  guest_name: string; guest_email: string; notes: string;
  items: { menu_item_id: string; quantity: number; expected_price_minor: number }[];
  idempotency_key: string;
};

const orderPath = (venueID: string) => `/public/venues/${encodeURIComponent(venueID)}/orders`;

export async function quotePublicOrder(venueID: string, input: OrderInput): Promise<OrderQuote> {
  return (await apiRequest<{ quote: OrderQuote }>(`${orderPath(venueID)}/draft`, {
    method: "POST", body: JSON.stringify(input), cache: "no-store",
  })).quote;
}

export async function submitPublicOrder(venueID: string, input: OrderInput, rememberGuest = false): Promise<CustomerOrder> {
  const order = (await apiRequest<{ order: CustomerOrder }>(orderPath(venueID), {
    method: "POST", body: JSON.stringify(input), cache: "no-store",
  })).order;
  if (rememberGuest && typeof window !== "undefined") {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem("pocket-guest-orders") ?? "[]") as { venueID: string; id: string; key: string }[];
      window.sessionStorage.setItem("pocket-guest-orders", JSON.stringify([{ venueID, id: order.id, key: input.idempotency_key }, ...saved.filter((item) => item.id !== order.id)].slice(0, 30)));
    } catch { /* The order response remains available without browser storage. */ }
  }
  return order;
}

export async function listCustomerOrders(): Promise<CustomerOrder[]> {
  return (await apiRequest<{ orders: CustomerOrder[] }>("/spots/me/orders", { cache: "no-store" })).orders;
}

export async function listGuestOrders(): Promise<CustomerOrder[]> {
  if (typeof window === "undefined") return [];
  let saved: { venueID: string; id: string; key: string }[];
  try { saved = JSON.parse(window.sessionStorage.getItem("pocket-guest-orders") ?? "[]"); }
  catch { return []; }
  const results = await Promise.all(saved.map(async ({ venueID, id, key }) => {
    try {
      return (await apiRequest<{ order: CustomerOrder }>(`${orderPath(venueID)}/${encodeURIComponent(id)}`, {
        headers: { "X-Order-Key": key }, cache: "no-store",
      })).order;
    } catch { return null; }
  }));
  return results.filter((order): order is CustomerOrder => order !== null);
}
