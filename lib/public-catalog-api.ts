import { apiRequest } from "./api-client";

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
