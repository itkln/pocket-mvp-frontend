import { apiRequest } from "./api-client";

export type CustomerReservation = {
  id: string;
  code: string;
  venue_id: string;
  venue_name: string;
  venue_address: string;
  venue_city: string;
  timezone: string;
  starts_at: string;
  ends_at: string;
  guest_count: number;
  status: "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
  notes?: string;
  preorder_total_minor: number;
  preorder_order_number?: number;
  currency: string;
  preorder_items: { name: string; quantity: number; unit_price_minor: number }[];
};

export async function listCustomerReservations(signal?: AbortSignal): Promise<CustomerReservation[]> {
  return (await apiRequest<{ reservations: CustomerReservation[] }>("/spots/me/reservations", { signal, cache: "no-store" })).reservations;
}
