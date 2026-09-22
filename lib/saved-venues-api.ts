import { apiRequest } from "./api-client";

const base = "/spots/me/saved-venues";

export async function listSavedVenueIDs(signal?: AbortSignal): Promise<string[]> {
  const result = await apiRequest<{ venue_ids: string[] }>(base, { signal, cache: "no-store" });
  return result.venue_ids;
}

export async function addSavedVenue(id: string): Promise<void> {
  await apiRequest<void>(`${base}/${encodeURIComponent(id)}`, { method: "PUT" });
}

export async function removeSavedVenue(id: string): Promise<void> {
  await apiRequest<void>(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
