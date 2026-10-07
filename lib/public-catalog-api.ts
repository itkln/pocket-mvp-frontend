import type { MenuNutrition } from "./menu-nutrition";
import { APIError, apiRequest } from "./api-client";

export type PublicVenue = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category_slug: string;
  cuisine_type?: string;
  address: string;
  city: string;
  country_code: string;
  image_url?: string;
  rating: number;
  review_count: number;
  tags: string[];
  filters: string[];
  preorder_enabled: boolean;
  created_at: string;
};

export type PublicVenuePage = {
  venues: PublicVenue[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
};

export type PublicMenuItem = MenuNutrition & {
  id: string;
  name: string;
  description?: string;
  price_minor: number;
  currency: string;
  image_url?: string;
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  items: PublicMenuItem[];
};

export type PublicReview = {
  id: string;
  rating: number;
  body?: string;
  owner_reply?: string;
  created_at: string;
};

export type AvailableTable = { id: string; identifier: string; seats: number };
export type AvailabilitySlot = { time: string; starts_at: string; ends_at: string; tables: AvailableTable[] };
export type VenueAvailability = {
  venue_id: string;
  date: string;
  timezone: string;
  guests: number;
  duration_minutes: number;
  slots: AvailabilitySlot[];
};

export type ReservationInput = {
  starts_at: string;
  guests: number;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  notes: string;
  items: { menu_item_id: string; quantity: number; expected_price_minor: number }[];
  idempotency_key: string;
};
export type CreatedReservation = {
  id: string;
  code: string;
  starts_at: string;
  guest_count: number;
  preorder_total_minor: number;
  preorder_order_number?: number;
  currency: string;
};

export type PublicVenueSearch = {
  city?: string;
  query?: string;
  category?: string;
  filter?: string;
  ids?: string[];
  page?: number;
  pageSize?: number;
};

const cityAPIValues: Record<string, string> = {
  "Братислава": "Bratislava",
  "Кошице": "Košice",
  "Трнава": "Trnava",
  "Нитра": "Nitra",
  "Жилина": "Žilina",
};

export const catalogCityValue = (city?: string) => city ? cityAPIValues[city] ?? city : "";

export async function listPublicVenues(search: PublicVenueSearch = {}, signal?: AbortSignal) {
  const params = new URLSearchParams();
  const city = catalogCityValue(search.city);
  if (city) params.set("city", city);
  if (search.query?.trim()) params.set("q", search.query.trim());
  if (search.category) params.set("category", search.category);
  if (search.filter && search.filter !== "Все") params.set("filter", search.filter);
  if (search.ids?.length) params.set("ids", search.ids.join(","));
  params.set("page", String(search.page ?? 1));
  params.set("page_size", String(search.pageSize ?? 24));
  return apiRequest<PublicVenuePage>(`/public/venues?${params}`, { signal });
}

export async function getPublicVenue(id: string, signal?: AbortSignal): Promise<PublicVenue> {
  const result = await apiRequest<{ venue: PublicVenue }>(`/public/venues/${encodeURIComponent(id)}`, { signal });
  return result.venue;
}

export async function getPublicVenueMenu(id: string, signal?: AbortSignal): Promise<PublicMenuCategory[]> {
  const result = await apiRequest<{ categories: PublicMenuCategory[] }>(`/public/venues/${encodeURIComponent(id)}/menu`, { signal, cache: "no-store" });
  return result.categories;
}

export async function getPublicVenueReviews(id: string, signal?: AbortSignal): Promise<PublicReview[]> {
  const result = await apiRequest<{ reviews: PublicReview[] }>(`/public/venues/${encodeURIComponent(id)}/reviews`, { signal });
  return result.reviews;
}

export async function getVenueAvailability(id: string, date: string, guests: number, signal?: AbortSignal): Promise<VenueAvailability> {
  const params = new URLSearchParams({ guests: String(guests) });
  if (date) params.set("date", date);
  return apiRequest<VenueAvailability>(`/public/venues/${encodeURIComponent(id)}/availability?${params}`, { signal, cache: "no-store" });
}

export async function createPublicReservation(id: string, input: ReservationInput): Promise<CreatedReservation> {
  const path = `/public/venues/${encodeURIComponent(id)}/reservations`;
  const hold = await apiRequest<{ hold: { id: string; expires_at: string } }>(`${path}/holds`, {
    method: "POST", body: JSON.stringify(input), cache: "no-store",
  });
  const result = await apiRequest<{ reservation: CreatedReservation }>(`${path}/${encodeURIComponent(hold.hold.id)}/confirm`, {
    method: "POST", body: JSON.stringify(input), cache: "no-store",
  });
  if (typeof window !== "undefined") {
    try { window.sessionStorage.setItem(`pocket-reservation:${id}`, JSON.stringify({ id: result.reservation.id, key: input.idempotency_key })); }
    catch { /* Browser storage may be disabled; the confirmed response remains valid. */ }
  }
  return result.reservation;
}

export async function getSavedPublicReservation(id: string): Promise<CreatedReservation | null> {
  if (typeof window === "undefined") return null;
  let stored: string | null;
  try { stored = window.sessionStorage.getItem(`pocket-reservation:${id}`); }
  catch { return null; }
  if (!stored) return null;
  try {
    const reference = JSON.parse(stored) as { id?: string; key?: string };
    if (!reference.id || !reference.key) throw new Error("Invalid reservation reference");
    const result = await apiRequest<{ reservation: CreatedReservation }>(
      `/public/venues/${encodeURIComponent(id)}/reservations/${encodeURIComponent(reference.id)}`,
      { headers: { "X-Reservation-Key": reference.key }, cache: "no-store" },
    );
    return result.reservation;
  } catch (error) {
    if (!(error instanceof APIError) || error.status === 404 || error.status === 422) {
      clearSavedPublicReservation(id);
    }
    return null;
  }
}

export function clearSavedPublicReservation(id: string) {
  if (typeof window !== "undefined") {
    try { window.sessionStorage.removeItem(`pocket-reservation:${id}`); }
    catch { /* Browser storage may be disabled. */ }
  }
}
