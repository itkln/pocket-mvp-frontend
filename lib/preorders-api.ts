import { apiRequest } from "./api-client";

export type CustomerPreorder = {
  id: string;
  number: number;
  venue_name: string;
  reservation_code: string;
  reservation_starts_at: string;
  guest_name: string;
  total_minor: number;
  currency: string;
  status: string;
  created_at: string;
  items?: { name: string; quantity: number; unit_price_minor: number }[];
};

export async function listCustomerPreorders(signal?: AbortSignal): Promise<CustomerPreorder[]> {
  return (await apiRequest<{ preorders: CustomerPreorder[] }>("/spots/me/preorders", { signal, cache: "no-store" })).preorders;
}
