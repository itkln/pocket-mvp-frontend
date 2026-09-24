import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalogCityValue, getPublicVenue, getPublicVenueMenu, listPublicVenues } from "./public-catalog-api";

describe("public catalog API", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ venues: [], page: 2, page_size: 12, total: 0, total_pages: 0, has_next: false }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  it("maps localized cities and sends search, filter and pagination to the server", async () => {
    await listPublicVenues({ city: "Братислава", query: " coffee ", category: "restaurants", filter: "Лучшие", page: 2, pageSize: 12 });

    const [requestURL, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(requestURL, "http://pocket.local");
    expect(url.pathname).toBe("/api/v1/public/venues");
    expect(Object.fromEntries(url.searchParams)).toEqual({ city: "Bratislava", q: "coffee", category: "restaurants", filter: "Лучшие", page: "2", page_size: "12" });
    expect(init.credentials).toBe("include");
  });

  it("keeps canonical city names and omits the all filter", async () => {
    await listPublicVenues({ city: "Bratislava", filter: "Все" });
    const url = new URL(fetchMock.mock.calls[0][0] as string, "http://pocket.local");
    expect(url.searchParams.get("city")).toBe("Bratislava");
    expect(url.searchParams.has("filter")).toBe(false);
    expect(catalogCityValue("Кошице")).toBe("Košice");
  });

  it("hydrates a bounded list of stable venue IDs", async () => {
    await listPublicVenues({ ids: ["first-uuid", "second-uuid"], pageSize: 50 });
    const url = new URL(fetchMock.mock.calls[0][0] as string, "http://pocket.local");
    expect(url.searchParams.get("ids")).toBe("first-uuid,second-uuid");
    expect(url.searchParams.get("page_size")).toBe("50");
  });

  it("loads a selected venue by ID", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ venue: { id: "venue-id", name: "Renamed venue" } }), { status: 200 }));
    await expect(getPublicVenue("venue-id")).resolves.toMatchObject({ id: "venue-id", name: "Renamed venue" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/public/venues/venue-id");
  });

  it("loads the published menu without owner credentials", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ categories: [{ id: "lunch", name: "Lunch", items: [] }] }), { status: 200 }));
    await expect(getPublicVenueMenu("venue-id")).resolves.toMatchObject([{ id: "lunch" }]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/public/venues/venue-id/menu");
  });
});
